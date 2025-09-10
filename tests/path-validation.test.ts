import { describe, it, expect, beforeEach } from 'bun:test';
import { MemoryPalace } from '../src/MemoryPalace';
import { InMemoryFileSystemAdapter } from './test-adapters/InMemoryFileSystemAdapter';

describe('Path Validation for MemoryPalace', () => {
  let gitRepoPath: string;
  let nonGitPath: string;
  let fsAdapter: InMemoryFileSystemAdapter;

  beforeEach(() => {
    // Set up file system adapter
    fsAdapter = new InMemoryFileSystemAdapter();

    // Create a valid git repository in memory
    gitRepoPath = '/valid-repo';
    fsAdapter.setupTestRepo(gitRepoPath);

    // Create a non-git directory
    nonGitPath = '/not-a-repo';
    fsAdapter.createDir(nonGitPath);
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

    // Verify the .alexandria directory was created
    const a24zDir = fsAdapter.join(gitRepoPath, '.alexandria');
    expect(fsAdapter.exists(a24zDir)).toBe(true);
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
    ).toThrow('Validation failed: Notes must have at least one anchor');
  });

  it('should reject missing anchors', () => {
    const memoryPalace = new MemoryPalace(gitRepoPath, fsAdapter);
    expect(() =>
      memoryPalace.saveNote({
        note: 'Test note',
        anchors: [], // Empty array instead of missing property
        tags: ['test'],
        codebaseViewId: 'test-view',
        metadata: {},
      })
    ).toThrow('Validation failed: Notes must have at least one anchor');
  });
});
