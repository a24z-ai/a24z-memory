import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createTestView } from '../../test-helpers';
import { saveNote, getNotesForPath } from '../../../src/core-mcp/store/anchoredNotesStore';

describe('Anchor Normalization and Matching', () => {
  let tempDir: string;
  let repoDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-test-'));
    repoDir = path.join(tempDir, 'test-repo');
    fs.mkdirSync(repoDir, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
    createTestView(repoDir, 'test-view');
    // Create a package.json to make it look like a proper project root
    fs.writeFileSync(path.join(repoDir, 'package.json'), '{}');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('anchor normalization on save', () => {
    it('should normalize anchor paths to be relative to repo root', () => {
      const noteWithPath = saveNote({
        note: 'Test note with relative anchors',
        directoryPath: repoDir,
        codebaseViewId: 'test-view',
        anchors: ['src/components/Button.tsx', './lib/utils.ts', 'docs/README.md'],
        tags: ['test'],
        metadata: {},
      });
      const note = noteWithPath.note;

      // All anchors should be relative paths to repo root
      expect(note.anchors).toHaveLength(3);
      expect(path.isAbsolute(note.anchors[0])).toBe(false);
      expect(path.isAbsolute(note.anchors[1])).toBe(false);
      expect(path.isAbsolute(note.anchors[2])).toBe(false);

      // Check they're correctly normalized relative to repo root
      expect(note.anchors[0]).toBe('src/components/Button.tsx');
      expect(note.anchors[1]).toBe('lib/utils.ts');
      expect(note.anchors[2]).toBe('docs/README.md');
    });

    it('should convert absolute anchor paths to relative', () => {
      const absoluteAnchor = path.join(repoDir, 'src/api/endpoint.ts');

      const noteWithPath = saveNote({
        note: 'Test note with absolute anchor',
        directoryPath: repoDir,
        codebaseViewId: 'test-view',
        anchors: [absoluteAnchor],
        tags: ['test'],
        metadata: {},
      });
      const note = noteWithPath.note;

      expect(note.anchors).toHaveLength(1);
      expect(path.isAbsolute(note.anchors[0])).toBe(false);
      expect(note.anchors[0]).toBe('src/api/endpoint.ts');
    });

    it('should handle mixed relative and absolute anchors', () => {
      const absoluteAnchor = path.join(repoDir, 'absolute/path.ts');

      const noteWithPath = saveNote({
        note: 'Test note with mixed anchors',
        directoryPath: repoDir,
        codebaseViewId: 'test-view',
        anchors: ['relative/path.ts', absoluteAnchor, './another/relative.ts'],
        tags: ['test'],
        metadata: {},
      });
      const note = noteWithPath.note;

      expect(note.anchors).toHaveLength(3);
      expect(note.anchors[0]).toBe('relative/path.ts');
      expect(note.anchors[1]).toBe('absolute/path.ts');
      expect(note.anchors[2]).toBe('another/relative.ts');
    });
  });

  describe('anchor matching in getNotesForPath', () => {
    beforeEach(() => {
      // Create some notes with various anchors
      saveNote({
        note: 'Button component note',
        directoryPath: repoDir,
        codebaseViewId: 'test-view',
        anchors: ['src/components/Button.tsx', 'src/components/Button.test.tsx'],
        tags: ['component'],
        metadata: {},
      });

      saveNote({
        note: 'API utils note',
        directoryPath: repoDir,
        codebaseViewId: 'test-view',
        anchors: ['src/utils/api.ts', 'src/utils'],
        tags: ['utils'],
        metadata: {},
      });

      saveNote({
        note: 'Database config note',
        directoryPath: repoDir,
        codebaseViewId: 'test-view',
        anchors: ['config/database.yml'],
        tags: ['config'],
        metadata: {},
      });
    });

    it('should find notes when querying exact anchor path', () => {
      const buttonPath = path.join(repoDir, 'src/components/Button.tsx');
      const notes = getNotesForPath(buttonPath, false);

      expect(notes).toHaveLength(1);
      expect(notes[0].note).toBe('Button component note');
      expect(notes[0].pathDistance).toBe(0); // Exact anchor match should have distance 0
      // Verify the anchor is stored as relative
      expect(notes[0].anchors).toContain('src/components/Button.tsx');
    });

    it('should find notes when querying child of anchor directory', () => {
      const utilsChildPath = path.join(repoDir, 'src/utils/helpers.ts');
      const notes = getNotesForPath(utilsChildPath, false);

      expect(notes).toHaveLength(1);
      expect(notes[0].note).toBe('API utils note');
      expect(notes[0].pathDistance).toBe(0); // Matches anchor directory
    });

    it('should find notes when querying parent of anchor file', () => {
      const componentsDir = path.join(repoDir, 'src/components');
      const notes = getNotesForPath(componentsDir, false);

      // Should find the Button note because the anchor is a child of this directory
      const buttonNote = notes.find((n) => n.note === 'Button component note');
      expect(buttonNote).toBeDefined();
    });

    it('should not find notes for unrelated paths', () => {
      const unrelatedPath = path.join(repoDir, 'src/unrelated/file.ts');
      const notes = getNotesForPath(unrelatedPath, false);

      expect(notes).toHaveLength(0);
    });

    it.skip('should handle relative path queries correctly', () => {
      // Skipped due to macOS /var vs /private/var symlink issues in temp directories
      // Save current directory
      const originalCwd = process.cwd();

      try {
        // Change to repo directory
        process.chdir(repoDir);

        // Query with relative path
        const notes = getNotesForPath('src/components/Button.tsx', false);

        expect(notes).toHaveLength(1);
        expect(notes[0].note).toBe('Button component note');
      } finally {
        // Restore original directory
        process.chdir(originalCwd);
      }
    });

    it.skip('should prioritize exact anchor matches over parent directory matches', () => {
      // Create a note that has the components directory as its directoryPath
      saveNote({
        note: 'General components note',
        directoryPath: path.join(repoDir, 'src/components'),
        codebaseViewId: 'test-view',
        anchors: ['src/components/index.ts'],
        tags: ['general'],
        metadata: {},
      });

      const buttonPath = path.join(repoDir, 'src/components/Button.tsx');
      const notes = getNotesForPath(buttonPath, true);

      // Should find both notes, but Button note should come first (distance 0)
      expect(notes.length).toBeGreaterThanOrEqual(1);
      expect(notes[0].note).toBe('Button component note');
      expect(notes[0].pathDistance).toBe(0);
    });

    it.skip('should handle anchor normalization with ../ paths', () => {
      const note = saveNote({
        note: 'Parent directory reference note',
        directoryPath: path.join(repoDir, 'src/components'),
        codebaseViewId: 'test-view',
        anchors: ['../utils/shared.ts', './Button.tsx'],
        tags: ['test'],
        metadata: {},
      });

      // Anchors should be normalized to relative paths from repo root
      expect(note.note.anchors[0]).toBe('src/utils/shared.ts');
      expect(note.note.anchors[1]).toBe('src/components/Button.tsx');

      // Should find the note when querying the normalized paths
      const sharedNotes = getNotesForPath(path.join(repoDir, 'src/utils/shared.ts'), false);
      // Should find both notes: API utils (because src/utils is a parent) and Parent directory reference
      expect(sharedNotes).toHaveLength(2);
      const noteTexts = sharedNotes.map((n) => n.note);
      expect(noteTexts).toContain('Parent directory reference note');
      expect(noteTexts).toContain('API utils note');
    });
  });

  describe('cross-repository isolation', () => {
    it.skip('should not find notes from different repositories', () => {
      // Create another repository
      const otherRepo = path.join(tempDir, 'other-repo');
      fs.mkdirSync(otherRepo, { recursive: true });
      fs.writeFileSync(path.join(otherRepo, 'package.json'), '{}');

      // Save note in first repo
      saveNote({
        note: 'First repo note',
        directoryPath: repoDir,
        codebaseViewId: 'test-view',
        anchors: ['src/file.ts'],
        tags: ['repo1'],
        metadata: {},
      });

      // Save note in second repo
      saveNote({
        note: 'Second repo note',
        directoryPath: otherRepo,
        codebaseViewId: 'test-view',
        anchors: ['src/file.ts'],
        tags: ['repo2'],
        metadata: {},
      });

      // Query first repo - should only find first note
      const repo1Notes = getNotesForPath(path.join(repoDir, 'src/file.ts'), false);
      expect(repo1Notes).toHaveLength(1);
      expect(repo1Notes[0].note).toBe('First repo note');

      // Query second repo - should only find second note
      const repo2Notes = getNotesForPath(path.join(otherRepo, 'src/file.ts'), false);
      expect(repo2Notes).toHaveLength(1);
      expect(repo2Notes[0].note).toBe('Second repo note');
    });
  });
});
