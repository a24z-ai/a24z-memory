/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ReplaceTagTool } from '../../../src/core-mcp/tools/ReplaceTagTool';
import {
  saveNote,
  saveTagDescription,
  getTagDescriptions,
  getNotesForPath,
} from '../../../src/core-mcp/store/anchoredNotesStore';
import { createTestView } from '../../test-helpers';

describe('ReplaceTagTool', () => {
  let tempDir: string;
  let testRepoPath: string;
  let tool: ReplaceTagTool;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });

    // Create a test view
    createTestView(testRepoPath, 'test-view');

    tool = new ReplaceTagTool();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should require confirmation to replace a tag', async () => {
    // Create a tag description
    saveTagDescription(testRepoPath, 'old-tag', 'Old tag description');

    // Attempt to replace without confirmation
    const result = await tool.execute({
      directoryPath: testRepoPath,
      oldTag: 'old-tag',
      newTag: 'new-tag',
      confirmReplacement: false,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify replacement was blocked
    expect(response.error).toBe('Replacement not confirmed');
    expect(response.message).toContain('Set confirmReplacement to true');
    expect(response.oldTag).toBe('old-tag');
    expect(response.newTag).toBe('new-tag');

    // Verify tag still exists
    const tags = getTagDescriptions(testRepoPath);
    expect(tags['old-tag']).toBe('Old tag description');
  });

  it('should reject replacement when old and new tags are the same', async () => {
    const result = await tool.execute({
      directoryPath: testRepoPath,
      oldTag: 'same-tag',
      newTag: 'same-tag',
      confirmReplacement: true,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify replacement was rejected
    expect(response.error).toBe('Invalid replacement');
    expect(response.message).toContain('must be different');
  });

  it('should replace tag in notes and transfer description', async () => {
    // Create a tag description
    saveTagDescription(testRepoPath, 'old-feature', 'Feature tag description');

    // Save notes with the tag
    const note1WithPath = saveNote({
      note: 'Note 1 with old tag',
      anchors: ['file1.ts'],
      tags: ['old-feature', 'keep-me'],
      metadata: {},
      directoryPath: testRepoPath,
    } as any);
    const note1 = note1WithPath.note;

    const note2WithPath = saveNote({
      note: 'Note 2 with old tag',
      anchors: ['file2.ts'],
      tags: ['old-feature'],
      metadata: {},
      directoryPath: testRepoPath,
    } as any);
    const note2 = note2WithPath.note;

    const note3WithPath = saveNote({
      note: 'Note 3 without old tag',
      anchors: ['file3.ts'],
      tags: ['keep-me'],
      metadata: {},
      directoryPath: testRepoPath,
    } as any);
    const note3 = note3WithPath.note;

    // Replace the tag with confirmation
    const result = await tool.execute({
      directoryPath: testRepoPath,
      oldTag: 'old-feature',
      newTag: 'new-feature',
      confirmReplacement: true,
      transferDescription: true,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify replacement results
    expect(response.oldTag).toBe('old-feature');
    expect(response.newTag).toBe('new-feature');
    expect(response.results.notesModified).toBe(2);
    expect(response.results.descriptionTransferred).toBe(true);
    expect(response.results.oldDescriptionDeleted).toBe(true);
    expect(response.results.descriptionAction).toBe('transferred');
    expect(response.summary).toContain('replaced');
    expect(response.summary).toContain('2 note(s)');
    expect(response.summary).toContain('transferred description');

    // Verify tag is replaced in notes
    const allNotes = getNotesForPath(testRepoPath, true);
    const updatedNote1 = allNotes.find((n) => n.id === note1.id);
    const updatedNote2 = allNotes.find((n) => n.id === note2.id);
    const updatedNote3 = allNotes.find((n) => n.id === note3.id);

    expect(updatedNote1?.tags).toContain('new-feature');
    expect(updatedNote1?.tags).not.toContain('old-feature');
    expect(updatedNote1?.tags).toContain('keep-me');

    expect(updatedNote2?.tags).toEqual(['new-feature']);
    expect(updatedNote3?.tags).toEqual(['keep-me']);

    // Verify tag description is transferred
    const tags = getTagDescriptions(testRepoPath);
    expect(tags['old-feature']).toBeUndefined();
    expect(tags['new-feature']).toBe('Feature tag description');
  });

  it('should handle replacement when new tag already has a description', async () => {
    // Create tag descriptions for both tags
    saveTagDescription(testRepoPath, 'old-tag', 'Old description');
    saveTagDescription(testRepoPath, 'new-tag', 'Existing new description');

    // Save a note with the old tag
    saveNote({
      note: 'Note with old tag',
      anchors: ['file.ts'],
      tags: ['old-tag'],
      metadata: {},
      directoryPath: testRepoPath,
    } as any);

    // Replace the tag
    const result = await tool.execute({
      directoryPath: testRepoPath,
      oldTag: 'old-tag',
      newTag: 'new-tag',
      confirmReplacement: true,
      transferDescription: true,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify results
    expect(response.results.notesModified).toBe(1);
    expect(response.results.descriptionTransferred).toBe(false);
    expect(response.results.oldDescriptionDeleted).toBe(true);
    expect(response.results.descriptionAction).toBe('kept_existing');
    expect(response.descriptions.oldTagDescription).toBe('Old description');
    expect(response.descriptions.existingNewTagDescription).toBe('Existing new description');

    // Verify new tag's description is preserved
    const tags = getTagDescriptions(testRepoPath);
    expect(tags['old-tag']).toBeUndefined();
    expect(tags['new-tag']).toBe('Existing new description');
  });

  it('should handle replacement without transferring description', async () => {
    // Create a tag description
    saveTagDescription(testRepoPath, 'old-tag', 'Description to delete');

    // Save a note with the tag
    saveNote({
      note: 'Note with tag',
      anchors: ['file.ts'],
      tags: ['old-tag'],
      metadata: {},
      directoryPath: testRepoPath,
    } as any);

    // Replace without transferring description
    const result = await tool.execute({
      directoryPath: testRepoPath,
      oldTag: 'old-tag',
      newTag: 'new-tag',
      confirmReplacement: true,
      transferDescription: false,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify results
    expect(response.results.notesModified).toBe(1);
    expect(response.results.descriptionTransferred).toBe(false);
    expect(response.results.oldDescriptionDeleted).toBe(true);
    expect(response.results.descriptionAction).toBe('deleted');

    // Verify descriptions
    const tags = getTagDescriptions(testRepoPath);
    expect(tags['old-tag']).toBeUndefined();
    expect(tags['new-tag']).toBeUndefined();
  });

  it('should handle replacement of non-existent tag', async () => {
    // Try to replace a tag that doesn't exist
    const result = await tool.execute({
      directoryPath: testRepoPath,
      oldTag: 'nonexistent',
      newTag: 'new-tag',
      confirmReplacement: true,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify results
    expect(response.results.notesModified).toBe(0);
    expect(response.summary).toContain('No notes found');
    expect(response.summary).toContain('Nothing was replaced');
  });

  it('should handle duplicate tags correctly', async () => {
    // Save a note that already has both tags
    const note = saveNote({
      note: 'Note with both tags',
      anchors: ['file.ts'],
      tags: ['old-tag', 'new-tag', 'other-tag'],
      metadata: {},
      directoryPath: testRepoPath,
    } as any);

    // Replace old-tag with new-tag
    const result = await tool.execute({
      directoryPath: testRepoPath,
      oldTag: 'old-tag',
      newTag: 'new-tag',
      confirmReplacement: true,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);
    expect(response.results.notesModified).toBe(1);

    // Verify no duplicate tags after replacement
    const allNotes = getNotesForPath(testRepoPath, true);
    const updatedNote = allNotes.find((n) => n.id === note.note.id);
    expect(updatedNote?.tags).toEqual(['new-tag', 'other-tag']);
    expect(updatedNote?.tags.filter((t) => t === 'new-tag').length).toBe(1);
  });

  it('should throw error for non-existent path', async () => {
    await expect(
      tool.execute({
        directoryPath: '/nonexistent/path',
        oldTag: 'old',
        newTag: 'new',
        confirmReplacement: true,
      } as any)
    ).rejects.toThrow('Path does not exist');
  });

  it('should throw error for non-git repository', async () => {
    // Create a directory without .git
    const nonGitPath = path.join(tempDir, 'non-git');
    fs.mkdirSync(nonGitPath, { recursive: true });

    await expect(
      tool.execute({
        directoryPath: nonGitPath,
        oldTag: 'old',
        newTag: 'new',
        confirmReplacement: true,
      } as any)
    ).rejects.toThrow('Not a git repository');
  });

  it('should handle multiple notes with the same tag', async () => {
    // Create multiple notes with the same tag
    const notes: Array<{ note: { id: string } }> = [];
    for (let i = 0; i < 5; i++) {
      notes.push(
        saveNote({
          note: `Note ${i}`,
          anchors: [`file${i}.ts`],
          tags: ['old-common', `unique-${i}`],
          metadata: {},
          directoryPath: testRepoPath,
          codebaseViewId: 'test-view',
        })
      );
    }

    // Replace the common tag
    const result = await tool.execute({
      directoryPath: testRepoPath,
      oldTag: 'old-common',
      newTag: 'new-common',
      confirmReplacement: true,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);
    expect(response.results.notesModified).toBe(5);

    // Verify tag is replaced in all notes
    const allNotes = getNotesForPath(testRepoPath, true);
    for (let i = 0; i < 5; i++) {
      const updatedNote = allNotes.find((n) => n.id === notes[i].note.id);
      expect(updatedNote?.tags).toContain('new-common');
      expect(updatedNote?.tags).not.toContain('old-common');
      expect(updatedNote?.tags).toContain(`unique-${i}`);
    }
  });
});
