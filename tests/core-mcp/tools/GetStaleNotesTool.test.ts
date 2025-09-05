import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createTestView } from '../../test-helpers';
import { GetStaleAnchoredNotesTool } from '../../../src/core-mcp/tools/GetStaleAnchoredNotesTool';
import { saveNote } from '../../../src/core-mcp/store/anchoredNotesStore';

describe('GetStaleAnchoredNotesTool', () => {
  let tempDir: string;
  let testRepoPath: string;
  let tool: GetStaleAnchoredNotesTool;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    createTestView(testRepoPath, 'test-view');
    tool = new GetStaleAnchoredNotesTool();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return empty result when no stale notes exist', async () => {
    // Create a file that will be referenced
    const validFile = path.join(testRepoPath, 'valid-file.ts');
    fs.writeFileSync(validFile, 'content');

    // Save a note with valid anchor
    saveNote({
      note: 'This note has a valid anchor',
      anchors: ['valid-file.ts'],
      tags: ['test'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool
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
    const validFile = path.join(testRepoPath, 'exists.ts');
    fs.writeFileSync(validFile, 'content');

    // Save notes with both valid and stale anchors
    const note1WithPath = saveNote({
      note: 'This note has mixed anchors',
      anchors: ['exists.ts', 'deleted.ts'],
      tags: ['test'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const note1 = note1WithPath.note;

    const note2WithPath = saveNote({
      note: 'This note has only stale anchors',
      anchors: ['missing1.ts', 'missing2.ts'],
      tags: ['stale'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const note2 = note2WithPath.note;

    // Save a note with only valid anchors (should not appear in results)
    saveNote({
      note: 'This note has only valid anchors',
      anchors: ['exists.ts'],
      tags: ['valid'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool
    const result = await tool.execute({
      directoryPath: testRepoPath,
      includeContent: true,
      includeValidAnchors: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify statistics
    expect(response.totalStaleNotes).toBe(2);
    expect(response.totalStaleAnchors).toBe(3); // deleted.ts, missing1.ts, missing2.ts
    expect(response.totalValidAnchors).toBe(1); // exists.ts from note1

    // Verify notes are included
    expect(response.notes).toHaveLength(2);

    // Find note1 in results
    interface StaleNoteResponse {
      noteId: string;
      staleAnchors: string[];
      validAnchors?: string[];
      content?: string;
    }
    const staleNote1 = response.notes.find((n: StaleNoteResponse) => n.noteId === note1.id);
    expect(staleNote1).toBeDefined();
    expect(staleNote1.staleAnchors).toEqual(['deleted.ts']);
    expect(staleNote1.validAnchors).toEqual(['exists.ts']);
    expect(staleNote1.content).toBe('This note has mixed anchors');

    // Find note2 in results
    const staleNote2 = response.notes.find((n: StaleNoteResponse) => n.noteId === note2.id);
    expect(staleNote2).toBeDefined();
    expect(staleNote2.staleAnchors).toEqual(['missing1.ts', 'missing2.ts']);
    expect(staleNote2.validAnchors).toEqual([]);
  });

  it('should exclude content when includeContent is false', async () => {
    // Save a note with stale anchor
    saveNote({
      note: 'This is the note content that should not appear',
      anchors: ['nonexistent.ts'],
      tags: ['test'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool without content
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
    expect(response.notes[0].staleAnchors).toEqual(['nonexistent.ts']);
  });

  it('should exclude valid anchors when includeValidAnchors is false', async () => {
    // Create a valid file
    const validFile = path.join(testRepoPath, 'valid.ts');
    fs.writeFileSync(validFile, 'content');

    // Save a note with mixed anchors
    saveNote({
      note: 'Mixed anchors note',
      anchors: ['valid.ts', 'stale.ts'],
      tags: ['test'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool without valid anchors
    const result = await tool.execute({
      directoryPath: testRepoPath,
      includeContent: false,
      includeValidAnchors: false,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify valid anchors are not included
    expect(response.notes[0].validAnchors).toBeUndefined();
    expect(response.notes[0].staleAnchors).toEqual(['stale.ts']);
  });

  it('should handle repository with no notes', async () => {
    // Execute the tool on empty repository
    const result = await tool.execute({
      directoryPath: testRepoPath,
      includeContent: true,
      includeValidAnchors: false,
    });

    // Verify empty response
    const text = result.content[0].text;
    expect(text).toContain('No notes with stale anchors found');
  });

  it('should throw error for non-existent path', async () => {
    await expect(
      tool.execute({
        directoryPath: '/nonexistent/path',
        includeContent: true,
        includeValidAnchors: false,
      })
    ).rejects.toThrow('Path does not exist');
  });

  it('should throw error for non-git repository', async () => {
    // Create a directory without .git
    const nonGitPath = path.join(tempDir, 'non-git');
    fs.mkdirSync(nonGitPath, { recursive: true });

    await expect(
      tool.execute({
        directoryPath: nonGitPath,
        includeContent: true,
        includeValidAnchors: false,
      })
    ).rejects.toThrow('Not a git repository');
  });
});
