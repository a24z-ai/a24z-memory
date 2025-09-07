import { describe, it, expect, beforeEach } from 'bun:test';
import { DeleteAnchoredNoteTool } from '../../../src/mcp/tools/DeleteAnchoredNoteTool';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { CodebaseViewsStore } from '../../../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type { ValidatedRepositoryPath, CodebaseView } from '../../../src/pure-core/types';

describe('DeleteAnchoredNoteTool', () => {
  let fs: InMemoryFileSystemAdapter;
  let notesStore: AnchoredNotesStore;
  let tool: DeleteAnchoredNoteTool;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    notesStore = new AnchoredNotesStore(fs);
    tool = new DeleteAnchoredNoteTool(fs);
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

  it('should successfully delete an existing note', async () => {
    // Save a test note
    const savedNoteWithPath = notesStore.saveNote({
      note: 'This is a test note for deletion',
      anchors: ['src/test.ts'],
      tags: ['testing', 'deletion'],
      metadata: { key: 'value' },
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    // Verify note exists
    expect(notesStore.getNoteById(validatedRepoPath, savedNote.id)).toBeDefined();

    // Delete the note
    const result = await tool.execute({
      noteId: savedNote.id,
      directoryPath: testRepoPath,
    });

    // Check the result
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(text).toContain(`Successfully deleted note ${savedNote.id}`);
    expect(text).toContain('This is a test note for deletion');
    expect(text).toContain('Tags: testing, deletion');

    // Verify note no longer exists
    expect(notesStore.getNoteById(validatedRepoPath, savedNote.id)).toBeNull();
  });

  it('should throw error when trying to delete non-existent note', async () => {
    const nonExistentId = 'note-1234567890-abc123';

    await expect(
      tool.execute({
        noteId: nonExistentId,
        directoryPath: testRepoPath,
      })
    ).rejects.toThrow(`Note with ID "${nonExistentId}" not found`);
  });

  it('should handle deletion from subdirectory path', async () => {
    // Save a test note
    const savedNoteWithPath = notesStore.saveNote({
      note: 'Test note in subdirectory',
      anchors: ['src/components/Component.tsx'],
      tags: ['component'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    // Create a subdirectory
    const subDir = fs.join(testRepoPath, 'src', 'components');
    fs.createDir(subDir);

    // Delete using subdirectory path (tool should find the repo root)
    const result = await tool.execute({
      noteId: savedNote.id,
      directoryPath: subDir,
    });

    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(text).toContain(`Successfully deleted note ${savedNote.id}`);

    // Verify deletion
    expect(notesStore.getNoteById(validatedRepoPath, savedNote.id)).toBeNull();
  });

  it('should throw error for non-absolute path', async () => {
    await expect(
      tool.execute({
        noteId: 'any-id',
        directoryPath: 'relative/path',
      })
    ).rejects.toThrow('directoryPath must be an absolute path');
  });

  it('should throw error for non-existent directory path', async () => {
    await expect(
      tool.execute({
        noteId: 'any-id',
        directoryPath: '/non/existent/path',
      })
    ).rejects.toThrow('directoryPath does not exist');
  });

  it('should throw error for path outside git repository', async () => {
    const nonGitDir = '/non-git';
    fs.createDir(nonGitDir);

    await expect(
      tool.execute({
        noteId: 'any-id',
        directoryPath: nonGitDir,
      })
    ).rejects.toThrow('directoryPath is not within a git repository');
  });

  it('should handle notes with long content in preview', async () => {
    const longContent = 'A'.repeat(300);

    const savedNoteWithPath = notesStore.saveNote({
      note: longContent,
      anchors: ['file.ts'],
      tags: ['long'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    const result = await tool.execute({
      noteId: savedNote.id,
      directoryPath: testRepoPath,
    });

    const text = result.content[0].text as string;
    // Should show first 200 chars with ellipsis
    expect(text).toContain('A'.repeat(200) + '...');
  });

  it('should preserve metadata in deletion preview', async () => {
    const savedNoteWithPath = notesStore.saveNote({
      note: 'Note with metadata',
      anchors: ['file.ts'],
      tags: ['metadata-test'],
      metadata: {
        author: 'test-user',
        prNumber: 123,
        customField: 'customValue',
      },
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    const result = await tool.execute({
      noteId: savedNote.id,
      directoryPath: testRepoPath,
    });

    const text = result.content[0].text as string;
    expect(text).toContain('Tags: metadata-test');
    expect(text).toContain('Note with metadata');
  });
});
