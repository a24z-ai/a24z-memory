import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createTestView } from '../../test-helpers';
import { DeleteAnchoredNoteTool } from '../../../src/core-mcp/tools/DeleteAnchoredNoteTool';
import { saveNote, getNoteById } from '../../../src/core-mcp/store/anchoredNotesStore';

describe('DeleteAnchoredNoteTool', () => {
  let tempDir: string;
  let testRepoPath: string;
  let tool: DeleteAnchoredNoteTool;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    createTestView(testRepoPath, 'test-view');
    tool = new DeleteAnchoredNoteTool();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should successfully delete an existing note', async () => {
    // Save a test note
    const savedNoteWithPath = saveNote({
      note: 'This is a test note for deletion',
      anchors: ['src/test.ts'],
      tags: ['testing', 'deletion'],
      metadata: { key: 'value' },
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    // Verify note exists
    expect(getNoteById(testRepoPath, savedNote.id)).toBeDefined();

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
    expect(getNoteById(testRepoPath, savedNote.id)).toBeNull();
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
    const savedNoteWithPath = saveNote({
      note: 'Test note in subdirectory',
      anchors: ['src/components/Component.tsx'],
      tags: ['component'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    // Create a subdirectory
    const subDir = path.join(testRepoPath, 'src', 'components');
    fs.mkdirSync(subDir, { recursive: true });

    // Delete using subdirectory path (tool should find the repo root)
    const result = await tool.execute({
      noteId: savedNote.id,
      directoryPath: subDir,
    });

    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(text).toContain(`Successfully deleted note ${savedNote.id}`);

    // Verify deletion
    expect(getNoteById(testRepoPath, savedNote.id)).toBeNull();
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
    const nonGitDir = path.join(tempDir, 'non-git');
    fs.mkdirSync(nonGitDir, { recursive: true });

    await expect(
      tool.execute({
        noteId: 'any-id',
        directoryPath: nonGitDir,
      })
    ).rejects.toThrow('directoryPath is not within a git repository');
  });

  it('should handle notes with long content in preview', async () => {
    const longContent = 'A'.repeat(300);

    const savedNoteWithPath = saveNote({
      note: longContent,
      anchors: ['file.ts'],
      tags: ['long'],
      metadata: {},
      directoryPath: testRepoPath,
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
    const savedNote = saveNote({
      note: 'Note with metadata',
      anchors: ['file.ts'],
      tags: ['metadata-test'],
      metadata: {
        author: 'test-user',
        prNumber: 123,
        customField: 'customValue',
      },
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });

    const result = await tool.execute({
      noteId: savedNote.note.id,
      directoryPath: testRepoPath,
    });

    const text = result.content[0].text as string;
    expect(text).toContain('Tags: metadata-test');
    expect(text).toContain('Note with metadata');
  });
});
