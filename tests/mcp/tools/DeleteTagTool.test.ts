import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createTestView } from '../../test-helpers';
import { DeleteTagTool } from '../../../src/mcp/tools/DeleteTagTool';
import {
  saveNote,
  saveTagDescription,
  getTagDescriptions,
  getNotesForPath,
} from '../../../src/core/store/anchoredNotesStore';

describe('DeleteTagTool', () => {
  let tempDir: string;
  let testRepoPath: string;
  let tool: DeleteTagTool;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    createTestView(testRepoPath, 'test-view');
    tool = new DeleteTagTool();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should require confirmation to delete a tag', async () => {
    // Create a tag description
    saveTagDescription(testRepoPath, 'test-tag', 'Test description');

    // Attempt to delete without confirmation
    const result = await tool.execute({
      directoryPath: testRepoPath,
      tag: 'test-tag',
      confirmDeletion: false,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify deletion was blocked
    expect(response.error).toBe('Deletion not confirmed');
    expect(response.message).toContain('Set confirmDeletion to true');
    expect(response.tagToDelete).toBe('test-tag');

    // Verify tag still exists
    const tags = getTagDescriptions(testRepoPath);
    expect(tags['test-tag']).toBe('Test description');
  });

  it('should delete tag from notes and remove description', async () => {
    // Create a tag description
    saveTagDescription(testRepoPath, 'delete-me', 'This tag will be deleted');

    // Save notes with the tag
    const note1WithPath = saveNote({
      note: 'Note 1 with tag',
      anchors: ['file1.ts'],
      tags: ['delete-me', 'keep-me'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const note1 = note1WithPath.note;

    const note2WithPath = saveNote({
      note: 'Note 2 with tag',
      anchors: ['file2.ts'],
      tags: ['delete-me'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const note2 = note2WithPath.note;

    const note3WithPath = saveNote({
      note: 'Note 3 without tag',
      anchors: ['file3.ts'],
      tags: ['keep-me'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const note3 = note3WithPath.note;

    // Delete the tag with confirmation
    const result = await tool.execute({
      directoryPath: testRepoPath,
      tag: 'delete-me',
      confirmDeletion: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify deletion results
    expect(response.tag).toBe('delete-me');
    expect(response.results.notesModified).toBe(2);
    expect(response.results.descriptionDeleted).toBe(true);
    expect(response.results.hadDescription).toBe(true);
    expect(response.summary).toContain('removed from 2 note(s)');
    expect(response.summary).toContain('description file deleted');
    expect(response.deletedDescription).toBe('This tag will be deleted');

    // Verify tag is removed from notes
    const allNotes = getNotesForPath(testRepoPath, true);
    const updatedNote1 = allNotes.find((n) => n.id === note1.id);
    const updatedNote2 = allNotes.find((n) => n.id === note2.id);
    const updatedNote3 = allNotes.find((n) => n.id === note3.id);

    expect(updatedNote1?.tags).toEqual(['keep-me']);
    expect(updatedNote2?.tags).toEqual([]);
    expect(updatedNote3?.tags).toEqual(['keep-me']);

    // Verify tag description is deleted
    const tags = getTagDescriptions(testRepoPath);
    expect(tags['delete-me']).toBeUndefined();
  });

  it('should handle deletion of tag with no description', async () => {
    // Save notes with a tag that has no description
    const note1WithPath = saveNote({
      note: 'Note with undescribed tag',
      anchors: ['file.ts'],
      tags: ['no-description'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const note1 = note1WithPath.note;

    // Delete the tag
    const result = await tool.execute({
      directoryPath: testRepoPath,
      tag: 'no-description',
      confirmDeletion: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify results
    expect(response.results.notesModified).toBe(1);
    expect(response.results.descriptionDeleted).toBe(false);
    expect(response.results.hadDescription).toBe(false);
    expect(response.summary).toContain('removed from 1 note(s)');
    expect(response.deletedDescription).toBeUndefined();

    // Verify tag is removed from note
    const allNotes = getNotesForPath(testRepoPath, true);
    const updatedNote = allNotes.find((n) => n.id === note1.id);
    expect(updatedNote?.tags).toEqual([]);
  });

  it('should handle deletion of unused tag with description', async () => {
    // Create a tag description but don't use it in any notes
    saveTagDescription(testRepoPath, 'unused-tag', 'This tag is not used');

    // Delete the tag
    const result = await tool.execute({
      directoryPath: testRepoPath,
      tag: 'unused-tag',
      confirmDeletion: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify results
    expect(response.results.notesModified).toBe(0);
    expect(response.results.descriptionDeleted).toBe(true);
    expect(response.results.hadDescription).toBe(true);
    expect(response.summary).toContain('description file deleted');
    expect(response.deletedDescription).toBe('This tag is not used');

    // Verify tag description is deleted
    const tags = getTagDescriptions(testRepoPath);
    expect(tags['unused-tag']).toBeUndefined();
  });

  it('should handle deletion of non-existent tag', async () => {
    // Try to delete a tag that doesn't exist
    const result = await tool.execute({
      directoryPath: testRepoPath,
      tag: 'nonexistent',
      confirmDeletion: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify results
    expect(response.results.notesModified).toBe(0);
    expect(response.results.descriptionDeleted).toBe(false);
    expect(response.results.hadDescription).toBe(false);
    expect(response.summary).toContain('was not found in any notes and had no description');
    expect(response.summary).toContain('Nothing was deleted');
  });

  it('should preserve other tags when deleting one tag', async () => {
    // Save a note with multiple tags
    const note = saveNote({
      note: 'Note with multiple tags',
      anchors: ['file.ts'],
      tags: ['tag1', 'tag2', 'tag3'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });

    // Delete one tag
    const result = await tool.execute({
      directoryPath: testRepoPath,
      tag: 'tag2',
      confirmDeletion: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);
    expect(response.results.notesModified).toBe(1);

    // Verify other tags are preserved
    const allNotes = getNotesForPath(testRepoPath, true);
    const updatedNote = allNotes.find((n) => n.id === note.note.id);
    expect(updatedNote?.tags).toEqual(['tag1', 'tag3']);
  });

  it('should throw error for non-existent path', async () => {
    await expect(
      tool.execute({
        directoryPath: '/nonexistent/path',
        tag: 'test',
        confirmDeletion: true,
      })
    ).rejects.toThrow('Path does not exist');
  });

  it('should throw error for non-git repository', async () => {
    // Create a directory without .git
    const nonGitPath = path.join(tempDir, 'non-git');
    fs.mkdirSync(nonGitPath, { recursive: true });

    await expect(
      tool.execute({
        directoryPath: nonGitPath,
        tag: 'test',
        confirmDeletion: true,
      })
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
          tags: ['common-tag', `unique-${i}`],
          metadata: {},
          directoryPath: testRepoPath,
          codebaseViewId: 'test-view',
        })
      );
    }

    // Delete the common tag
    const result = await tool.execute({
      directoryPath: testRepoPath,
      tag: 'common-tag',
      confirmDeletion: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);
    expect(response.results.notesModified).toBe(5);

    // Verify tag is removed from all notes but unique tags remain
    const allNotes = getNotesForPath(testRepoPath, true);
    for (let i = 0; i < 5; i++) {
      const updatedNote = allNotes.find((n) => n.id === notes[i].note.id);
      expect(updatedNote?.tags).toEqual([`unique-${i}`]);
      expect(updatedNote?.tags).not.toContain('common-tag');
    }
  });
});
