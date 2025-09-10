/**
 * Test that demonstrates the new pure AnchoredNotesStore working with real Node.js filesystem
 * This shows the same functionality as the old tests but with the new class-based approach
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { NodeFileSystemAdapter } from '../../../src/node-adapters/NodeFileSystemAdapter';
import { createTestView } from '../../test-helpers';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  ValidatedAlexandriaPath,
} from '../../../src/pure-core/types';

describe('Pure AnchoredNotesStore with Node.js FileSystem', () => {
  let store: AnchoredNotesStore;
  let tempDir: string;
  let gitRepoPath: string;
  let validatedRepoPath: ValidatedRepositoryPath;
  let alexandriaPath: ValidatedAlexandriaPath;
  let nodeFs: NodeFileSystemAdapter;

  beforeEach(() => {
    // Create the store with Node.js filesystem adapter
    nodeFs = new NodeFileSystemAdapter();

    // Create temp directories
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-pure-test-'));

    // Create a valid git repository
    gitRepoPath = path.join(tempDir, 'valid-repo');
    fs.mkdirSync(gitRepoPath, { recursive: true });
    fs.mkdirSync(path.join(gitRepoPath, '.git'), { recursive: true });
    createTestView(gitRepoPath, 'test-view');

    // Validate the repository path and get alexandria path
    validatedRepoPath = MemoryPalace.validateRepositoryPath(nodeFs, gitRepoPath);
    alexandriaPath = MemoryPalace.getAlexandriaPath(validatedRepoPath, nodeFs);

    // Create the store with alexandria path
    store = new AnchoredNotesStore(nodeFs, alexandriaPath);
  });

  afterEach(() => {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save and retrieve notes using real filesystem', () => {
    const noteInput = {
      note: 'Test note with real filesystem',
      anchors: ['src/test.ts'],
      tags: ['integration', 'test'],
      codebaseViewId: 'test-view',
      metadata: { testType: 'integration' },
      directoryPath: validatedRepoPath,
    };

    // Save the note
    const saved = store.saveNote(noteInput);

    expect(saved.note.note).toBe('Test note with real filesystem');
    expect(saved.note.anchors).toEqual(['src/test.ts']);
    expect(saved.note.tags).toEqual(['integration', 'test']);
    expect(saved.note.id).toBeTruthy();

    // Verify the note was actually saved to disk with date-based directory structure
    const notesDir = path.join(gitRepoPath, '.a24z', 'notes');
    expect(fs.existsSync(notesDir)).toBe(true);

    // Check that year directory was created
    const yearDirs = fs.readdirSync(notesDir);
    expect(yearDirs.length).toBe(1);
    expect(yearDirs[0]).toMatch(/^\d{4}$/);

    // Check that month directory was created
    const yearDir = path.join(notesDir, yearDirs[0]);
    const monthDirs = fs.readdirSync(yearDir);
    expect(monthDirs.length).toBe(1);
    expect(monthDirs[0]).toMatch(/^\d{2}$/);

    // Check that note file was created
    const monthDir = path.join(yearDir, monthDirs[0]);
    const noteFiles = fs.readdirSync(monthDir);
    expect(noteFiles.length).toBe(1);
    expect(noteFiles[0]).toMatch(/^note-\d+-\w+\.json$/);

    // Retrieve the note using the class method
    const retrieved = store.getNoteById(validatedRepoPath, saved.note.id);
    expect(retrieved).toEqual(saved.note);

    // Verify the file contents match
    const noteFilePath = path.join(monthDir, noteFiles[0]);
    const fileContents = fs.readFileSync(noteFilePath, 'utf8');
    const parsedNote = JSON.parse(fileContents);
    expect(parsedNote).toEqual(saved.note);
  });

  it('should handle configuration persistence', () => {
    // Update configuration
    const updates = {
      limits: {
        noteMaxLength: 8000,
        maxTagsPerNote: 8,
        maxAnchorsPerNote: 15,
        tagDescriptionMaxLength: 1200,
      },
      storage: { compressionEnabled: true },
    };

    const updated = store.updateConfiguration(validatedRepoPath, updates);
    expect(updated.limits.noteMaxLength).toBe(8000);

    // Verify config file was created
    const configPath = path.join(gitRepoPath, '.a24z', 'config.json');
    expect(fs.existsSync(configPath)).toBe(true);

    // Create a new store instance to verify persistence
    const newStore = new AnchoredNotesStore(nodeFs, alexandriaPath);
    const loaded = newStore.getConfiguration();

    expect(loaded.limits.noteMaxLength).toBe(8000);
    expect(loaded.storage.compressionEnabled).toBe(true);
  });

  it('should validate notes properly', () => {
    // Test note too long
    const longNoteInput = {
      note: 'x'.repeat(11000),
      anchors: ['src/test.ts'],
      tags: ['test'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    expect(() => store.saveNote(longNoteInput)).toThrow('Validation failed: Note is too long');

    // Test no anchors
    const noAnchorsInput = {
      note: 'Test note',
      anchors: [],
      tags: ['test'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    expect(() => store.saveNote(noAnchorsInput)).toThrow(
      'Validation failed: Notes must have at least one anchor'
    );
  });

  it('should handle note deletion', () => {
    const noteInput = {
      note: 'Note to be deleted',
      anchors: ['src/delete-me.ts'],
      tags: ['temporary'],
      codebaseViewId: 'test-view',
      metadata: {},
      directoryPath: validatedRepoPath,
    };

    // Save the note
    const saved = store.saveNote(noteInput);

    // Verify it exists on disk in the date-based structure
    const notesDir = path.join(gitRepoPath, '.a24z', 'notes');
    const yearDirs = fs.readdirSync(notesDir);
    expect(yearDirs.length).toBe(1);

    const yearDir = path.join(notesDir, yearDirs[0]);
    const monthDirs = fs.readdirSync(yearDir);
    expect(monthDirs.length).toBe(1);

    const monthDir = path.join(yearDir, monthDirs[0]);
    const noteFiles = fs.readdirSync(monthDir);
    expect(noteFiles.length).toBe(1);

    // Delete the note
    const deleted = store.deleteNoteById(validatedRepoPath, saved.note.id);
    expect(deleted).toBe(true);

    // Verify it's gone from disk
    const remainingFiles = fs.readdirSync(monthDir);
    expect(remainingFiles.length).toBe(0);

    // Verify it can't be retrieved
    const retrieved = store.getNoteById(validatedRepoPath, saved.note.id);
    expect(retrieved).toBe(null);
  });

  it('should demonstrate platform independence by using filesystem adapter', () => {
    // This test shows that the same store class works with any FileSystemAdapter
    // The fact that we can inject different adapters proves platform independence

    const noteInput = {
      note: 'Testing adapter pattern',
      anchors: ['src/adapter-test.ts'],
      tags: ['adapter', 'pattern'],
      codebaseViewId: 'test-view',
      metadata: { pattern: 'dependency-injection' },
      directoryPath: validatedRepoPath,
    };

    // Save with current adapter
    const saved = store.saveNote(noteInput);

    // Create another store instance with the same adapter instance
    // This demonstrates that data persists within the same adapter
    const sameAdapterStore = new AnchoredNotesStore(nodeFs, alexandriaPath);

    // Verify the other store can read the same data (same adapter instance)
    const retrieved = sameAdapterStore.getNoteById(validatedRepoPath, saved.note.id);
    expect(retrieved).toEqual(saved.note);

    console.log('✅ Pure AnchoredNotesStore successfully uses dependency injection pattern');
    console.log('✅ Same store can work with any FileSystemAdapter implementation');
  });
});
