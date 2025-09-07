/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'bun:test';
import { ReplaceTagTool } from '../../../src/mcp/tools/ReplaceTagTool';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { CodebaseViewsStore } from '../../../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  ValidatedRelativePath,
  CodebaseView,
} from '../../../src/pure-core/types';

describe('ReplaceTagTool', () => {
  let fs: InMemoryFileSystemAdapter;
  let notesStore: AnchoredNotesStore;
  let tool: ReplaceTagTool;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    notesStore = new AnchoredNotesStore(fs);
    tool = new ReplaceTagTool(fs);
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fsRepoPath);

    // Create a test view using CodebaseViewsStore
    const codebaseViewsStore = new CodebaseViewsStore(fs);
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'Test view for testing',
      overviewPath: 'README.md',
      cells: {},
      timestamp: new Date().toISOString(),
    };
    codebaseViewsStore.saveView(validatedRepoPathView);
  });

  it('should require confirmation to replace a tag', async () => {
    // Create a tag description
    notesStore.saveTagDescription(validatedRepoPath, 'old-tag', 'Old tag description');

    // Attempt to replace without confirmation
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const tags = notesStore.getTagDescriptions(validatedRepoPath);
    expect(tags['old-tag']).toBe('Old tag description');
  });

  it('should reject replacement when old and new tags are the same', async () => {
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    notesStore.saveTagDescription(validatedRepoPath, 'old-feature', 'Feature tag description');

    // Save notes with the tag
    const note1WithPath = notesStore.saveNote({
      note: 'Note 1 with old tag',
      anchors: ['file1.ts'],
      tags: ['old-feature', 'keep-me'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note1 = note1WithPath.note;

    const note2WithPath = notesStore.saveNote({
      note: 'Note 2 with old tag',
      anchors: ['file2.ts'],
      tags: ['old-feature'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note2 = note2WithPath.note;

    const note3WithPath = notesStore.saveNote({
      note: 'Note 3 without old tag',
      anchors: ['file3.ts'],
      tags: ['keep-me'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note3 = note3WithPath.note;

    // Replace the tag with confirmation
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const rootPath = '' as ValidatedRelativePath;
    const allNotes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
    const updatedNote1 = allNotes.find((n: any) => n.note.id === note1.id);
    const updatedNote2 = allNotes.find((n: any) => n.note.id === note2.id);
    const updatedNote3 = allNotes.find((n: any) => n.note.id === note3.id);

    expect(updatedNote1?.note.tags).toContain('new-feature');
    expect(updatedNote1?.note.tags).not.toContain('old-feature');
    expect(updatedNote1?.note.tags).toContain('keep-me');

    expect(updatedNote2?.note.tags).toEqual(['new-feature']);
    expect(updatedNote3?.note.tags).toEqual(['keep-me']);

    // Verify tag description is transferred
    const tags = notesStore.getTagDescriptions(validatedRepoPath);
    expect(tags['old-feature']).toBeUndefined();
    expect(tags['new-feature']).toBe('Feature tag description');
  });

  it('should handle replacement when new tag already has a description', async () => {
    // Create tag descriptions for both tags
    notesStore.saveTagDescription(validatedRepoPath, 'old-tag', 'Old description');
    notesStore.saveTagDescription(validatedRepoPath, 'new-tag', 'Existing new description');

    // Save a note with the old tag
    notesStore.saveNote({
      note: 'Note with old tag',
      anchors: ['file.ts'],
      tags: ['old-tag'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    // Replace the tag
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const tags = notesStore.getTagDescriptions(validatedRepoPath);
    expect(tags['old-tag']).toBeUndefined();
    expect(tags['new-tag']).toBe('Existing new description');
  });

  it('should handle replacement without transferring description', async () => {
    // Create a tag description
    notesStore.saveTagDescription(validatedRepoPath, 'old-tag', 'Description to delete');

    // Save a note with the tag
    notesStore.saveNote({
      note: 'Note with tag',
      anchors: ['file.ts'],
      tags: ['old-tag'],
      metadata: {},
      directoryPath: validatedRepoPath,
    } as any);

    // Replace without transferring description
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const tags = notesStore.getTagDescriptions(validatedRepoPath);
    expect(tags['old-tag']).toBeUndefined();
    expect(tags['new-tag']).toBeUndefined();
  });

  it('should handle replacement of non-existent tag', async () => {
    // Try to replace a tag that doesn't exist
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const noteWithPath = notesStore.saveNote({
      note: 'Note with both tags',
      anchors: ['file.ts'],
      tags: ['old-tag', 'new-tag', 'other-tag'],
      metadata: {},
      directoryPath: validatedRepoPath,
    } as any);

    // Replace old-tag with new-tag
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      oldTag: 'old-tag',
      newTag: 'new-tag',
      confirmReplacement: true,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);
    expect(response.results.notesModified).toBe(1);

    // Verify no duplicate tags after replacement
    const rootPath = '' as ValidatedRelativePath;
    const allNotes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
    const updatedNote = allNotes.find((n: any) => n.note.id === noteWithPath.note.id);
    expect(updatedNote?.note.tags).toEqual(['new-tag', 'other-tag']);
    expect(updatedNote?.note.tags.filter((t: any) => t === 'new-tag').length).toBe(1);
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
    const nonGitPath = '/non-git';
    fs.createDir(nonGitPath);

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
        notesStore.saveNote({
          note: `Note ${i}`,
          anchors: [`file${i}.ts`],
          tags: ['old-common', `unique-${i}`],
          metadata: {},
          directoryPath: validatedRepoPath,
          codebaseViewId: 'test-view',
        })
      );
    }

    // Replace the common tag
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      oldTag: 'old-common',
      newTag: 'new-common',
      confirmReplacement: true,
    } as any);

    // Parse the result
    const response = JSON.parse(result.content[0].text);
    expect(response.results.notesModified).toBe(5);

    // Verify tag is replaced in all notes
    const rootPath = '' as ValidatedRelativePath;
    const allNotes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
    for (let i = 0; i < 5; i++) {
      const updatedNote = allNotes.find((n: any) => n.note.id === notes[i].note.id);
      expect(updatedNote?.note.tags).toContain('new-common');
      expect(updatedNote?.note.tags).not.toContain('old-common');
      expect(updatedNote?.note.tags).toContain(`unique-${i}`);
    }
  });
});
