import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { saveNote } from '../src/core-mcp/store/notesStore';

describe('Path Validation for saveNote', () => {
  let tempDir: string;
  let gitRepoPath: string;
  let nonGitPath: string;

  beforeEach(() => {
    // Create temp directories
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-path-test-'));
    
    // Create a valid git repository
    gitRepoPath = path.join(tempDir, 'valid-repo');
    fs.mkdirSync(gitRepoPath, { recursive: true });
    fs.mkdirSync(path.join(gitRepoPath, '.git'), { recursive: true });
    
    // Create a non-git directory
    nonGitPath = path.join(tempDir, 'not-a-repo');
    fs.mkdirSync(nonGitPath, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should reject relative paths', () => {
    expect(() => saveNote({
      note: 'Test note',
      directoryPath: 'relative/path',
      anchors: ['test.ts'],
      tags: ['test'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    })).toThrow('directoryPath must be an absolute path to a git repository root');
  });

  it('should reject non-existent paths', () => {
    const fakePath = '/this/path/does/not/exist';
    expect(() => saveNote({
      note: 'Test note',
      directoryPath: fakePath,
      anchors: ['test.ts'],
      tags: ['test'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    })).toThrow(`directoryPath does not exist: "${fakePath}"`);
  });

  it('should reject directories that are not git repositories', () => {
    expect(() => saveNote({
      note: 'Test note',
      directoryPath: nonGitPath,
      anchors: ['test.ts'],
      tags: ['test'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    })).toThrow(`directoryPath is not a git repository root: "${nonGitPath}"`);
  });

  it('should accept valid git repository paths', () => {
    const result = saveNote({
      note: 'Test note',
      directoryPath: gitRepoPath,
      anchors: ['test.ts'],
      tags: ['test'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    });
    
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    
    // Verify the note was saved in the correct location
    const notesDir = path.join(gitRepoPath, '.a24z', 'notes');
    expect(fs.existsSync(notesDir)).toBe(true);
  });

  it('should reject paths with ./ prefix', () => {
    expect(() => saveNote({
      note: 'Test note',
      directoryPath: './relative/path',
      anchors: ['test.ts'],
      tags: ['test'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    })).toThrow('directoryPath must be an absolute path to a git repository root');
  });

  it('should reject paths with ../ prefix', () => {
    expect(() => saveNote({
      note: 'Test note',
      directoryPath: '../relative/path',
      anchors: ['test.ts'],
      tags: ['test'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    })).toThrow('directoryPath must be an absolute path to a git repository root');
  });

  it('should reject empty anchors array', () => {
    expect(() => saveNote({
      note: 'Test note',
      directoryPath: gitRepoPath,
      anchors: [],
      tags: ['test'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    })).toThrow('At least one anchor path is required');
  });

  it('should reject missing anchors', () => {
    expect(() => saveNote({
      note: 'Test note',
      directoryPath: gitRepoPath,
      tags: ['test'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {}
    } as any)).toThrow('At least one anchor path is required');
  });
});