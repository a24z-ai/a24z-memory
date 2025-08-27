import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { CheckStaleNotesTool } from '../../../src/core-mcp/tools/CheckStaleNotesTool';
import { saveNote } from '../../../src/core-mcp/store/notesStore';

describe('CheckStaleNotesTool', () => {
  let tempDir: string;
  let testRepoPath: string;
  let tool: CheckStaleNotesTool;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });

    tool = new CheckStaleNotesTool();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should report no stale notes when all anchors are valid', async () => {
    // Create test files
    const file1 = path.join(testRepoPath, 'file1.ts');
    const file2 = path.join(testRepoPath, 'file2.ts');
    fs.writeFileSync(file1, 'content');
    fs.writeFileSync(file2, 'content');

    // Save notes with valid anchors
    saveNote({
      note: 'Note with valid anchors',
      anchors: ['file1.ts', 'file2.ts'],
      tags: ['test'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    const result = await tool.execute({ directoryPath: testRepoPath });

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('No stale notes found');
  });

  it('should identify and report stale notes', async () => {
    // Create one valid file
    const validFile = path.join(testRepoPath, 'valid.ts');
    fs.writeFileSync(validFile, 'content');

    // Save notes with various anchor configurations
    const note1 = saveNote({
      note: 'This is a note with mixed anchors that should be detected',
      anchors: ['valid.ts', 'stale1.ts', 'stale2.ts'],
      tags: ['mixed', 'testing'],
      confidence: 'medium',
      type: 'gotcha',
      metadata: {},
      directoryPath: testRepoPath,
    });

    const note2 = saveNote({
      note: 'This note has all stale anchors',
      anchors: ['missing1.ts', 'missing2.ts'],
      tags: ['stale'],
      confidence: 'low',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath,
    });

    const result = await tool.execute({ directoryPath: testRepoPath });

    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;

    // Check that it found 2 stale notes
    expect(text).toContain('Found 2 note(s) with stale anchors');

    // Check for note IDs
    expect(text).toContain(note1.id);
    expect(text).toContain(note2.id);

    // Check for stale anchor indicators
    expect(text).toContain('❌ stale1.ts');
    expect(text).toContain('❌ stale2.ts');
    expect(text).toContain('❌ missing1.ts');
    expect(text).toContain('❌ missing2.ts');

    // Check for valid anchor indicator
    expect(text).toContain('✅ valid.ts');

    // Check for note metadata
    expect(text).toContain('Type: gotcha');
    expect(text).toContain('Type: pattern');
    expect(text).toContain('Tags: mixed, testing');
    expect(text).toContain('Tags: stale');
  });

  it('should handle subdirectories in the repository', async () => {
    const subDir = path.join(testRepoPath, 'src', 'components');
    fs.mkdirSync(subDir, { recursive: true });

    // Create a file in subdirectory
    const validFile = path.join(subDir, 'Component.tsx');
    fs.writeFileSync(validFile, 'content');

    // Save a note with mixed anchors
    saveNote({
      note: 'Component documentation',
      anchors: ['src/components/Component.tsx', 'src/components/Missing.tsx'],
      tags: ['component'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    // Can provide any path within the repo
    const result = await tool.execute({ directoryPath: subDir });

    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;

    expect(text).toContain('Found 1 note(s) with stale anchors');
    expect(text).toContain('❌ src/components/Missing.tsx');
    expect(text).toContain('✅ src/components/Component.tsx');
  });

  it('should throw error for non-absolute path', async () => {
    await expect(tool.execute({ directoryPath: 'relative/path' })).rejects.toThrow(
      'directoryPath must be an absolute path'
    );
  });

  it('should throw error for non-existent path', async () => {
    await expect(tool.execute({ directoryPath: '/non/existent/path' })).rejects.toThrow(
      'directoryPath does not exist'
    );
  });

  it('should throw error for path outside git repository', async () => {
    const nonGitDir = path.join(tempDir, 'non-git');
    fs.mkdirSync(nonGitDir, { recursive: true });

    await expect(tool.execute({ directoryPath: nonGitDir })).rejects.toThrow(
      'directoryPath is not within a git repository'
    );
  });

  it('should handle notes with long content correctly', async () => {
    const longContent = 'A'.repeat(200);

    saveNote({
      note: longContent,
      anchors: ['missing.ts'],
      tags: ['long'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    const result = await tool.execute({ directoryPath: testRepoPath });
    const text = result.content[0].text as string;

    // Should truncate to 100 chars with ellipsis
    expect(text).toContain('A'.repeat(100) + '...');
  });
});
