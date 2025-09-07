import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GetRepositoryTagsTool } from '../../../src/mcp/tools/GetRepositoryTagsTool';
import { MemoryPalace } from '../../../src/MemoryPalace';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import type { ValidatedRepositoryPath, ValidatedRelativePath } from '../../../src/pure-core/types';

describe('GetRepositoryTagsTool (Simple)', () => {
  let tool: GetRepositoryTagsTool;
  let inMemoryFs: InMemoryFileSystemAdapter;
  let memoryPalace: MemoryPalace;
  let notesStore: AnchoredNotesStore;
  const testPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    // Set up in-memory filesystem
    inMemoryFs = new InMemoryFileSystemAdapter();

    // Set up repository structure
    inMemoryFs.setupTestRepo(testPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(inMemoryFsPath);

    // Create the tool with in-memory adapter
    tool = new GetRepositoryTagsTool(inMemoryFs);

    // Create MemoryPalace for saving test data
    memoryPalace = new MemoryPalace(testPath, inMemoryFs);

    // Create AnchoredNotesStore for querying notes
    notesStore = new AnchoredNotesStore(inMemoryFs);

    // Create a test view directory structure
    const viewsDir = inMemoryFs.join(testPath, '.a24z', 'views');
    inMemoryFs.createDir(viewsDir);
    const testViewDir = inMemoryFs.join(viewsDir, 'test-view');
    inMemoryFs.createDir(testViewDir);
    inMemoryFs.writeFile(
      inMemoryFs.join(testViewDir, 'config.json'),
      JSON.stringify({
        name: 'test-view',
        description: 'Test view',
        created: new Date().toISOString(),
      })
    );

    // Create a package.json to make it look like a proper project root
    inMemoryFs.writeFile(inMemoryFs.join(testPath, 'package.json'), '{}');
  });

  afterEach(() => {
    // Clean up in-memory filesystem
    inMemoryFs.clear();
  });

  it('should return JSON response', async () => {
    const result = await tool.execute({
      path: testPath,
      includeUsedTags: true,
      includeGuidance: true,
    });

    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text!);
    expect(data.success).toBe(true);
    expect(data.usedTags).toBeDefined();
    expect(Array.isArray(data.usedTags)).toBe(true);
  });

  it('should include used tags when notes exist', async () => {
    // Save a note using MemoryPalace
    const savedNote = memoryPalace.saveNote({
      note: 'Test note',
      tags: ['custom-tag'],
      anchors: ['test-file.ts'],
      metadata: {},
      codebaseViewId: 'test-view',
    });

    console.log('Saved note:', savedNote);

    // Debug: Check if the note can be retrieved
    const rootPath = '' as ValidatedRelativePath;
    const allNotes = notesStore.getNotesForPath(validatedRepoPath, rootPath, true);
    console.log('All notes from notesStore:', allNotes);

    // Debug: Check filesystem
    console.log(
      'Files in memory:',
      Array.from(inMemoryFs.getFiles().keys()).filter((f) => f.includes('notes'))
    );

    // Try reading the note file directly
    const noteFiles = Array.from(inMemoryFs.getFiles().keys()).filter(
      (f) => f.endsWith('.json') && f.includes('notes')
    );
    if (noteFiles.length > 0) {
      const noteContent = inMemoryFs.readFile(noteFiles[0]);
      console.log('Note file content:', noteContent);
    }

    // Debug readDir
    const notesDir = inMemoryFs.join(testPath, '.a24z', 'notes');
    console.log('readDir of notes:', inMemoryFs.readDir(notesDir));
    const yearDir = inMemoryFs.join(notesDir, '2025');
    if (inMemoryFs.exists(yearDir)) {
      console.log('readDir of 2025:', inMemoryFs.readDir(yearDir));
      const monthDir = inMemoryFs.join(yearDir, '09');
      if (inMemoryFs.exists(monthDir)) {
        console.log('readDir of 09:', inMemoryFs.readDir(monthDir));
      }
    }

    const result = await tool.execute({
      path: testPath,
      includeUsedTags: true,
      includeGuidance: true,
    });
    const data = JSON.parse(result.content[0].text!);

    // Debug output
    console.log('Used tags:', data.usedTags);

    expect(data.usedTags).toBeDefined();
    expect(Array.isArray(data.usedTags)).toBe(true);
    expect(data.usedTags.length).toBeGreaterThan(0);
    expect(data.usedTags.some((tag: { name: string }) => tag.name === 'custom-tag')).toBe(true);
  });

  it('should return empty used tags when no notes exist', async () => {
    const authPath = inMemoryFs.join(testPath, 'auth');
    inMemoryFs.createDir(authPath);

    const result = await tool.execute({
      path: authPath,
      includeUsedTags: true,
      includeGuidance: true,
    });
    const data = JSON.parse(result.content[0].text!);

    expect(data.usedTags).toBeDefined();
    expect(Array.isArray(data.usedTags)).toBe(true);
    expect(data.usedTags).toHaveLength(0);
  });

  it('should include repository guidance by default', async () => {
    const result = await tool.execute({
      path: testPath,
      includeUsedTags: true,
      includeGuidance: true,
    });
    const data = JSON.parse(result.content[0].text!);

    // Should have some guidance note
    expect(data.guidanceNote || data.repositoryGuidance).toBeDefined();
  });

  it('should include custom repository guidance when it exists', async () => {
    // Create a custom guidance file
    const customGuidance = '# Custom Guidance\n\nThis is custom guidance for notes.';
    inMemoryFs.writeFile(inMemoryFs.join(testPath, '.a24z', 'note-guidance.md'), customGuidance);

    const result = await tool.execute({
      path: testPath,
      includeUsedTags: true,
      includeGuidance: true,
    });
    const data = JSON.parse(result.content[0].text!);

    expect(data.repositoryGuidance).toBe(customGuidance);
  });

  it('should exclude guidance when includeGuidance is false', async () => {
    const result = await tool.execute({
      path: testPath,
      includeUsedTags: true,
      includeGuidance: false,
    });
    const data = JSON.parse(result.content[0].text!);

    expect(data.guidanceNote).toBeUndefined();
    expect(data.repositoryGuidance).toBeUndefined();
  });

  it('should allow selective inclusion of tag types', async () => {
    const result = await tool.execute({
      path: testPath,
      includeUsedTags: false,
      includeGuidance: false,
    });
    const data = JSON.parse(result.content[0].text!);

    expect(data.usedTags).toBeUndefined();
    expect(data.suggestedTags).toBeUndefined();
    expect(data.guidanceNote).toBeUndefined();
    expect(data.repositoryGuidance).toBeUndefined();
  });
});
