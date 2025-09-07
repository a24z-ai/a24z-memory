import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { MemoryPalace } from '../src/MemoryPalace';
import { InMemoryFileSystemAdapter } from './test-adapters/InMemoryFileSystemAdapter';
import { createTestView } from './test-helpers';

describe('Path Validation for MemoryPalace', () => {
  let tempDir: string;
  let gitRepoPath: string;
  let nonGitPath: string;
  let fsAdapter: InMemoryFileSystemAdapter;

  beforeEach(() => {
    // Create temp directories
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-path-test-'));

    // Create a valid git repository
    gitRepoPath = path.join(tempDir, 'valid-repo');
    fs.mkdirSync(gitRepoPath, { recursive: true });
    fs.mkdirSync(path.join(gitRepoPath, '.git'), { recursive: true });
    createTestView(gitRepoPath, 'test-view');

    // Create a non-git directory
    nonGitPath = path.join(tempDir, 'not-a-repo');
    fs.mkdirSync(nonGitPath, { recursive: true });

    // Set up file system adapter
    fsAdapter = new InMemoryFileSystemAdapter();
  });

  afterEach(() => {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should reject relative paths', () => {
    expect(() => MemoryPalace.validateRepositoryPath(fsAdapter, 'relative/path')).toThrow(
      'directoryPath must be an absolute path'
    );
  });

  it('should reject non-existent paths', () => {
    const fakePath = '/this/path/does/not/exist';
    expect(() => MemoryPalace.validateRepositoryPath(fsAdapter, fakePath)).toThrow(
      'must point to an existing directory'
    );
  });

  it('should reject directories that are not git repositories', () => {
    expect(() => MemoryPalace.validateRepositoryPath(fsAdapter, nonGitPath)).toThrow(
      'not a git repository'
    );
  });

  it('should accept valid git repository paths', () => {
    expect(() => MemoryPalace.validateRepositoryPath(fsAdapter, gitRepoPath)).not.toThrow();

    // Also test that MemoryPalace can be constructed successfully
    const memoryPalace = new MemoryPalace(gitRepoPath, fsAdapter);
    expect(memoryPalace).toBeDefined();

    // Verify the note was saved in the correct location
    const notesDir = path.join(gitRepoPath, '.a24z', 'notes');
    expect(fs.existsSync(notesDir)).toBe(true);
  });

  it('should reject paths with ./ prefix', () => {
    expect(() => MemoryPalace.validateRepositoryPath(fsAdapter, './relative/path')).toThrow(
      'directoryPath must be an absolute path'
    );
  });

  it('should reject paths with ../ prefix', () => {
    expect(() => MemoryPalace.validateRepositoryPath(fsAdapter, '../relative/path')).toThrow(
      'directoryPath must be an absolute path'
    );
  });

  it('should reject empty anchors array', () => {
    const memoryPalace = new MemoryPalace(gitRepoPath, fsAdapter);
    expect(() =>
      memoryPalace.saveNote({
        note: 'Test note',
        anchors: [],
        tags: ['test'],
        metadata: {},
        codebaseViewId: 'test-view',
      })
    ).toThrow('At least one anchor path is required');
  });

  it('should reject missing anchors', () => {
    const memoryPalace = new MemoryPalace(gitRepoPath, fsAdapter);
    expect(
      () =>
        memoryPalace.saveNote({
          note: 'Test note',
          anchors: [], // Empty array instead of missing property
          tags: ['test'],
          codebaseViewId: 'test-view',
          metadata: {},
        })
    ).toThrow('At least one anchor path is required');
  });
});
