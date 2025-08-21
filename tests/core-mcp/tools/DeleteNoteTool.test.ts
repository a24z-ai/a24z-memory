import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DeleteNoteTool } from '../../../src/core-mcp/tools/DeleteNoteTool';
import { saveNote, getNoteById } from '../../../src/core-mcp/store/notesStore';

describe('DeleteNoteTool', () => {
  let tempDir: string;
  let testRepoPath: string;
  let tool: DeleteNoteTool;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });
    
    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    
    tool = new DeleteNoteTool();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should successfully delete an existing note', async () => {
    // Save a test note
    const savedNote = saveNote({
      note: 'This is a test note for deletion',
      anchors: ['src/test.ts'],
      tags: ['testing', 'deletion'],
      confidence: 'high',
      type: 'explanation',
      metadata: { key: 'value' },
      directoryPath: testRepoPath
    });
    
    // Verify note exists
    expect(getNoteById(testRepoPath, savedNote.id)).toBeDefined();
    
    // Delete the note
    const result = await tool.execute({ 
      noteId: savedNote.id,
      directoryPath: testRepoPath 
    });
    
    // Check the result
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(text).toContain(`Successfully deleted note ${savedNote.id}`);
    expect(text).toContain('This is a test note for deletion');
    expect(text).toContain('Type: explanation');
    expect(text).toContain('Tags: testing, deletion');
    
    // Verify note no longer exists
    expect(getNoteById(testRepoPath, savedNote.id)).toBeNull();
  });

  it('should throw error when trying to delete non-existent note', async () => {
    const nonExistentId = 'note-1234567890-abc123';
    
    await expect(tool.execute({ 
      noteId: nonExistentId,
      directoryPath: testRepoPath 
    })).rejects.toThrow(`Note with ID "${nonExistentId}" not found`);
  });

  it('should handle deletion from subdirectory path', async () => {
    // Save a test note
    const savedNote = saveNote({
      note: 'Test note in subdirectory',
      anchors: ['src/components/Component.tsx'],
      tags: ['component'],
      confidence: 'medium',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath
    });
    
    // Create a subdirectory
    const subDir = path.join(testRepoPath, 'src', 'components');
    fs.mkdirSync(subDir, { recursive: true });
    
    // Delete using subdirectory path (tool should find the repo root)
    const result = await tool.execute({ 
      noteId: savedNote.id,
      directoryPath: subDir 
    });
    
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(text).toContain(`Successfully deleted note ${savedNote.id}`);
    
    // Verify deletion
    expect(getNoteById(testRepoPath, savedNote.id)).toBeNull();
  });

  it('should throw error for non-absolute path', async () => {
    await expect(tool.execute({ 
      noteId: 'any-id',
      directoryPath: 'relative/path' 
    })).rejects.toThrow('directoryPath must be an absolute path');
  });

  it('should throw error for non-existent directory path', async () => {
    await expect(tool.execute({ 
      noteId: 'any-id',
      directoryPath: '/non/existent/path' 
    })).rejects.toThrow('directoryPath does not exist');
  });

  it('should throw error for path outside git repository', async () => {
    const nonGitDir = path.join(tempDir, 'non-git');
    fs.mkdirSync(nonGitDir, { recursive: true });
    
    await expect(tool.execute({ 
      noteId: 'any-id',
      directoryPath: nonGitDir 
    })).rejects.toThrow('directoryPath is not within a git repository');
  });

  it('should handle notes with long content in preview', async () => {
    const longContent = 'A'.repeat(300);
    
    const savedNote = saveNote({
      note: longContent,
      anchors: ['file.ts'],
      tags: ['long'],
      confidence: 'low',
      type: 'gotcha',
      metadata: {},
      directoryPath: testRepoPath
    });
    
    const result = await tool.execute({ 
      noteId: savedNote.id,
      directoryPath: testRepoPath 
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
      confidence: 'high',
      type: 'decision',
      metadata: {
        author: 'test-user',
        prNumber: 123,
        customField: 'customValue'
      },
      directoryPath: testRepoPath
    });
    
    const result = await tool.execute({ 
      noteId: savedNote.id,
      directoryPath: testRepoPath 
    });
    
    const text = result.content[0].text as string;
    expect(text).toContain('Type: decision');
    expect(text).toContain('Tags: metadata-test');
    expect(text).toContain('Note with metadata');
  });
});