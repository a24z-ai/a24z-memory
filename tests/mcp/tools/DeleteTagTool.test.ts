import { describe, it, expect, beforeEach } from 'bun:test';
import { DeleteTagTool } from '../../../src/mcp/tools/DeleteTagTool';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { CodebaseViewsStore } from '../../../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  ValidatedRelativePath,
  CodebaseView,
  ValidatedAlexandriaPath,
} from '../../../src/pure-core/types';

describe('DeleteTagTool', () => {
  let tool: DeleteTagTool;
  let notesStore: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;
  let alexandriaPath: ValidatedAlexandriaPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    tool = new DeleteTagTool(fs);
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
    alexandriaPath = MemoryPalace.getAlexandriaPath(validatedRepoPath, fs);

    notesStore = new AnchoredNotesStore(fs, alexandriaPath);

    // Create a test view using CodebaseViewsStore
    const codebaseViewsStore = new CodebaseViewsStore(fs, alexandriaPath);
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'Test view for testing',
      overviewPath: 'README.md',
      cells: {},
      timestamp: new Date().toISOString(),
    };
    codebaseViewsStore.saveView(validatedRepoPath, testView);
  });

  it('should require confirmation to delete a tag', async () => {
    // Create a tag description
    notesStore.saveTagDescription('test-tag', 'Test description');

    // Attempt to delete without confirmation
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const tags = notesStore.getTagDescriptions();
    expect(tags['test-tag']).toBe('Test description');
  });

  it('should delete tag from notes and remove description', async () => {
    // Create a tag description
    notesStore.saveTagDescription('delete-me', 'This tag will be deleted');

    // Save notes with the tag
    const note1WithPath = notesStore.saveNote({
      note: 'Note 1 with tag',
      anchors: ['file1.ts'],
      tags: ['delete-me', 'keep-me'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note1 = note1WithPath.note;

    const note2WithPath = notesStore.saveNote({
      note: 'Note 2 with tag',
      anchors: ['file2.ts'],
      tags: ['delete-me'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note2 = note2WithPath.note;

    const note3WithPath = notesStore.saveNote({
      note: 'Note 3 without tag',
      anchors: ['file3.ts'],
      tags: ['keep-me'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note3 = note3WithPath.note;

    // Delete the tag with confirmation
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const allNotes = notesStore.getNotesForPath(
      validatedRepoPath,
      '' as ValidatedRelativePath,
      true
    );
    const updatedNote1 = allNotes.find((n) => n.note.id === note1.id);
    const updatedNote2 = allNotes.find((n) => n.note.id === note2.id);
    const updatedNote3 = allNotes.find((n) => n.note.id === note3.id);

    expect(updatedNote1?.note.tags).toEqual(['keep-me']);
    expect(updatedNote2?.note.tags).toEqual([]);
    expect(updatedNote3?.note.tags).toEqual(['keep-me']);

    // Verify tag description is deleted
    const tags = notesStore.getTagDescriptions();
    expect(tags['delete-me']).toBeUndefined();
  });

  it('should handle deletion of tag with no description', async () => {
    // Save notes with a tag that has no description
    const note1WithPath = notesStore.saveNote({
      note: 'Note with undescribed tag',
      anchors: ['file.ts'],
      tags: ['no-description'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note1 = note1WithPath.note;

    // Delete the tag
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const allNotes = notesStore.getNotesForPath(
      validatedRepoPath,
      '' as ValidatedRelativePath,
      true
    );
    const updatedNote = allNotes.find((n) => n.note.id === note1.id);
    expect(updatedNote?.note.tags).toEqual([]);
  });

  it('should handle deletion of unused tag with description', async () => {
    // Create a tag description but don't use it in any notes
    notesStore.saveTagDescription('unused-tag', 'This tag is not used');

    // Delete the tag
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const tags = notesStore.getTagDescriptions();
    expect(tags['unused-tag']).toBeUndefined();
  });

  it('should handle deletion of non-existent tag', async () => {
    // Try to delete a tag that doesn't exist
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
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
    const note = notesStore.saveNote({
      note: 'Note with multiple tags',
      anchors: ['file.ts'],
      tags: ['tag1', 'tag2', 'tag3'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    // Delete one tag
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      tag: 'tag2',
      confirmDeletion: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);
    expect(response.results.notesModified).toBe(1);

    // Verify other tags are preserved
    const allNotes = notesStore.getNotesForPath(
      validatedRepoPath,
      '' as ValidatedRelativePath,
      true
    );
    const updatedNote = allNotes.find((n) => n.note.id === note.note.id);
    expect(updatedNote?.note.tags).toEqual(['tag1', 'tag3']);
  });

  it('should throw error for non-existent path', async () => {
    await expect(
      tool.execute({
        directoryPath: '/nonexistent/path',
        tag: 'test',
        confirmDeletion: true,
      })
    ).rejects.toThrow('Not a git repository');
  });

  it('should throw error for non-git repository', async () => {
    // Create a directory without .git
    const nonGitPath = '/non-git';
    fs.createDir(nonGitPath);

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
        notesStore.saveNote({
          note: `Note ${i}`,
          anchors: [`file${i}.ts`],
          tags: ['common-tag', `unique-${i}`],
          metadata: {},
          directoryPath: validatedRepoPath,
          codebaseViewId: 'test-view',
        })
      );
    }

    // Delete the common tag
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      tag: 'common-tag',
      confirmDeletion: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);
    expect(response.results.notesModified).toBe(5);

    // Verify tag is removed from all notes but unique tags remain
    const allNotes = notesStore.getNotesForPath(
      validatedRepoPath,
      '' as ValidatedRelativePath,
      true
    );
    for (let i = 0; i < 5; i++) {
      const updatedNote = allNotes.find((n) => n.note.id === notes[i].note.id);
      expect(updatedNote?.note.tags).toEqual([`unique-${i}`]);
      expect(updatedNote?.note.tags).not.toContain('common-tag');
    }
  });
});
