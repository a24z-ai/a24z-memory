import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GetStaleAnchoredNotesTool } from '../../../src/mcp/tools/GetStaleAnchoredNotesTool';
import { MemoryPalace } from '../../../src/MemoryPalace';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';

describe('GetStaleAnchoredNotesTool', () => {
  let inMemoryFs: InMemoryFileSystemAdapter;
  let testRepoPath: string;
  let tool: GetStaleAnchoredNotesTool;
  let memoryPalace: MemoryPalace;

  beforeEach(() => {
    // Set up in-memory filesystem
    inMemoryFs = new InMemoryFileSystemAdapter();
    testRepoPath = '/test-repo';

    // Set up repository structure
    inMemoryFs.setupTestRepo(testRepoPath);

    // Create MemoryPalace instance with in-memory adapter
    memoryPalace = new MemoryPalace(testRepoPath, inMemoryFs);

    // Create the tool with the same in-memory adapter
    tool = new GetStaleAnchoredNotesTool(inMemoryFs);
  });

  afterEach(() => {
    // Clean up in-memory filesystem
    inMemoryFs.clear();
  });

  it('should return empty result when no stale notes exist', async () => {
    // Create a file that will be referenced in the in-memory filesystem
    const validFile = inMemoryFs.join(testRepoPath, 'valid-file.ts');
    inMemoryFs.writeFile(validFile, 'content');

    // Save a note with valid anchor using MemoryPalace
    memoryPalace.saveNote({
      note: 'This note has a valid anchor',
      anchors: ['valid-file.ts'],
      tags: ['test'],
      metadata: {},
      codebaseViewId: 'test-view',
    });

    // Execute the tool - it will use the same in-memory filesystem
    const result = await tool.execute({
      directoryPath: testRepoPath,
      includeContent: true,
      includeValidAnchors: false,
    });

    // Parse the result
    const text = result.content[0].text;
    expect(text).toContain('No notes with stale anchors found');
  });

  it('should identify notes with stale anchors', async () => {
    // Create a file that will exist
    const validFile = inMemoryFs.join(testRepoPath, 'exists.ts');
    inMemoryFs.writeFile(validFile, 'content');

    // Save notes with both valid and stale anchors
    memoryPalace.saveNote({
      note: 'This note has mixed anchors',
      anchors: ['exists.ts', 'deleted.ts'],
      tags: ['test'],
      metadata: {},
      codebaseViewId: 'test-view',
    });

    memoryPalace.saveNote({
      note: 'This note has only stale anchors',
      anchors: ['missing1.ts', 'missing2.ts'],
      tags: ['stale'],
      metadata: {},
      codebaseViewId: 'test-view',
    });

    // Save a note with only valid anchors (should not appear in results)
    memoryPalace.saveNote({
      note: 'This note has only valid anchors',
      anchors: ['exists.ts'],
      tags: ['valid'],
      metadata: {},
      codebaseViewId: 'test-view',
    });

    // Execute the tool
    const result = await tool.execute({
      directoryPath: testRepoPath,
      includeContent: true,
      includeValidAnchors: true,
    });

    // Debug output
    console.log('Result:', result.content[0].text);
    inMemoryFs.debug();

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify statistics
    expect(response.totalStaleNotes).toBe(2);
    expect(response.totalStaleAnchors).toBe(3); // deleted.ts + missing1.ts + missing2.ts
    expect(response.totalValidAnchors).toBe(1); // exists.ts from the mixed note

    // Verify notes are included
    expect(response.notes).toHaveLength(2);

    // Find notes by their content
    const mixedNote = response.notes.find(
      (n: { content: string }) => n.content === 'This note has mixed anchors'
    );
    const staleOnlyNote = response.notes.find(
      (n: { content: string }) => n.content === 'This note has only stale anchors'
    );

    expect(mixedNote).toBeDefined();
    expect(mixedNote.staleAnchors).toEqual(['deleted.ts']);
    expect(mixedNote.validAnchors).toEqual(['exists.ts']);

    expect(staleOnlyNote).toBeDefined();
    expect(staleOnlyNote.staleAnchors).toEqual(['missing1.ts', 'missing2.ts']);
    expect(staleOnlyNote.validAnchors).toEqual([]);
  });

  it('should exclude content when includeContent is false', async () => {
    // Create a file that will exist
    const validFile = inMemoryFs.join(testRepoPath, 'exists.ts');
    inMemoryFs.writeFile(validFile, 'content');

    // Save a note with stale anchor
    memoryPalace.saveNote({
      note: 'This note content should not be included',
      anchors: ['missing.ts'],
      tags: ['test'],
      metadata: { key: 'value' },
      codebaseViewId: 'test-view',
    });

    // Execute the tool with includeContent false
    const result = await tool.execute({
      directoryPath: testRepoPath,
      includeContent: false,
      includeValidAnchors: false,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify note exists but content is not included
    expect(response.notes).toHaveLength(1);
    expect(response.notes[0].content).toBeUndefined();
    expect(response.notes[0].staleAnchors).toEqual(['missing.ts']);
    expect(response.notes[0].metadata).toEqual({ key: 'value' });
  });

  it('should exclude valid anchors when includeValidAnchors is false', async () => {
    // Create a file that will exist
    const validFile = inMemoryFs.join(testRepoPath, 'exists.ts');
    inMemoryFs.writeFile(validFile, 'content');

    // Save a note with mixed anchors
    memoryPalace.saveNote({
      note: 'Mixed anchors note',
      anchors: ['exists.ts', 'missing.ts'],
      tags: ['test'],
      metadata: {},
      codebaseViewId: 'test-view',
    });

    // Execute the tool with includeValidAnchors false
    const result = await tool.execute({
      directoryPath: testRepoPath,
      includeContent: true,
      includeValidAnchors: false,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify valid anchors are not included
    expect(response.notes).toHaveLength(1);
    expect(response.notes[0].staleAnchors).toEqual(['missing.ts']);
    expect(response.notes[0].validAnchors).toBeUndefined();
  });

  it('should handle repository with no notes', async () => {
    // Execute the tool on empty repository
    const result = await tool.execute({
      directoryPath: testRepoPath,
      includeContent: true,
      includeValidAnchors: false,
    });

    // Should return no stale notes message
    const text = result.content[0].text;
    expect(text).toContain('No notes with stale anchors found');
  });

  it('should throw error for non-existent path', async () => {
    await expect(
      tool.execute({
        directoryPath: '/non-existent-path',
        includeContent: true,
        includeValidAnchors: false,
      })
    ).rejects.toThrow('Path does not exist');
  });

  it('should throw error for non-git repository', async () => {
    // Create a directory without .git
    const nonGitPath = '/not-a-repo';
    inMemoryFs.createDir(nonGitPath);

    await expect(
      tool.execute({
        directoryPath: nonGitPath,
        includeContent: true,
        includeValidAnchors: false,
      })
    ).rejects.toThrow('Not a git repository');
  });
});
