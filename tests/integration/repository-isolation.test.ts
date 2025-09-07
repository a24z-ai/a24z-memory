// Test file - any types used for mock data
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  saveNote,
  getNotesForPath,
  getUsedTagsForPath,
} from '../../src/core/store/anchoredNotesStore';
import { CreateRepositoryAnchoredNoteTool } from '../../src/mcp/tools/CreateRepositoryAnchoredNoteTool';
import { GetAnchoredNotesTool } from '../../src/mcp/tools/GetAnchoredNotesTool';
import { createTestView } from '../test-helpers';
import { InMemoryFileSystemAdapter } from '../test-adapters/InMemoryFileSystemAdapter';

describe('Repository Isolation and Cross-Repository Testing', () => {
  const tempBase = path.join(os.tmpdir(), 'a24z-repo-isolation-test-' + Date.now());
  let repo1Path: string;
  let repo2Path: string;
  let repo3Path: string;

  beforeAll(() => {
    // Create temp base directory
    fs.mkdirSync(tempBase, { recursive: true });
  });

  afterAll(() => {
    // Clean up all test directories
    if (fs.existsSync(tempBase)) {
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Set up three distinct repository structures
    repo1Path = path.join(tempBase, 'project-alpha');
    repo2Path = path.join(tempBase, 'project-beta');
    repo3Path = path.join(tempBase, 'project-gamma');

    // Repository 1: Git repository with package.json
    fs.mkdirSync(path.join(repo1Path, '.git'), { recursive: true });
    fs.writeFileSync(
      path.join(repo1Path, '.git', 'config'),
      '[core]\nrepositoryformatversion = 0\n'
    );
    fs.writeFileSync(
      path.join(repo1Path, 'package.json'),
      JSON.stringify({
        name: 'project-alpha',
        version: '1.0.0',
      })
    );
    fs.mkdirSync(path.join(repo1Path, 'src', 'components'), { recursive: true });
    createTestView(repo1Path, 'test-view');

    // Repository 2: Git repository with package.json
    fs.mkdirSync(repo2Path, { recursive: true });
    fs.mkdirSync(path.join(repo2Path, '.git'), { recursive: true });
    fs.writeFileSync(
      path.join(repo2Path, '.git', 'config'),
      '[core]\nrepositoryformatversion = 0\n'
    );
    fs.writeFileSync(
      path.join(repo2Path, 'package.json'),
      JSON.stringify({
        name: 'project-beta',
        version: '2.0.0',
      })
    );
    fs.mkdirSync(path.join(repo2Path, 'lib', 'utils'), { recursive: true });
    createTestView(repo2Path, 'test-view');

    // Repository 3: Git repository without package.json
    fs.mkdirSync(path.join(repo3Path, '.git'), { recursive: true });
    fs.writeFileSync(
      path.join(repo3Path, '.git', 'config'),
      '[core]\nrepositoryformatversion = 0\n'
    );
    fs.mkdirSync(path.join(repo3Path, 'modules', 'core'), { recursive: true });
    createTestView(repo3Path, 'test-view');
  });

  afterEach(() => {
    // Clean up repository directories
    [repo1Path, repo2Path, repo3Path].forEach((repoPath) => {
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
      }
    });
  });

  describe('Basic Repository Isolation', () => {
    it('should create separate .a24z directories for each repository', () => {
      // Save a note in each repository
      saveNote({
        codebaseViewId: 'test-view',
        note: 'Alpha project note',
        directoryPath: repo1Path,
        tags: ['alpha'],
        anchors: [repo1Path],
        metadata: { project: 'alpha' },
      });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Beta project note',
        directoryPath: repo2Path,
        tags: ['beta'],
        anchors: [repo2Path],
        metadata: { project: 'beta' },
      });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Gamma project note',
        directoryPath: repo3Path,
        tags: ['gamma'],
        anchors: [repo3Path],
        metadata: { project: 'gamma' },
      });

      // Verify each repository has its own .a24z directory
      expect(fs.existsSync(path.join(repo1Path, '.a24z'))).toBe(true);
      expect(fs.existsSync(path.join(repo2Path, '.a24z'))).toBe(true);
      expect(fs.existsSync(path.join(repo3Path, '.a24z'))).toBe(true);

      // Verify each has its own notes directory structure
      expect(fs.existsSync(path.join(repo1Path, '.a24z', 'notes'))).toBe(true);
      expect(fs.existsSync(path.join(repo2Path, '.a24z', 'notes'))).toBe(true);
      expect(fs.existsSync(path.join(repo3Path, '.a24z', 'notes'))).toBe(true);
    });

    it('should not cross-contaminate notes between repositories', () => {
      // Save different notes in each repository
      const note1 = saveNote({
        codebaseViewId: 'test-view',
        note: 'Secret alpha note',
        directoryPath: repo1Path,
        tags: ['secret', 'alpha-only'],
        anchors: [repo1Path],
        metadata: { confidential: true },
      });

      const note2 = saveNote({
        codebaseViewId: 'test-view',
        note: 'Private beta note',
        directoryPath: repo2Path,
        tags: ['private', 'beta-only'],
        anchors: [repo2Path],
        metadata: { proprietary: true },
      });

      // Retrieve notes from each repository
      const alphaNotesCount = getNotesForPath(repo1Path, true);
      const betaNotesCount = getNotesForPath(repo2Path, true);

      // Each should only see its own note
      expect(alphaNotesCount).toHaveLength(1);
      expect(alphaNotesCount[0].id).toBe(note1.note.id);
      expect(alphaNotesCount[0].note).toContain('alpha');

      expect(betaNotesCount).toHaveLength(1);
      expect(betaNotesCount[0].id).toBe(note2.note.id);
      expect(betaNotesCount[0].note).toContain('beta');

      // Verify notes directories contain only their own notes
      const alphaNotes = getNotesForPath(repo1Path, true);
      const betaNotes = getNotesForPath(repo2Path, true);

      expect(alphaNotes.every((n: any) => !n.note.includes('beta'))).toBe(true);
      expect(betaNotes.every((n: any) => !n.note.includes('alpha'))).toBe(true);
    });
  });

  describe('Subdirectory Storage Behavior', () => {
    it('should store notes from subdirectories in repository root', () => {
      const subPath1 = path.join(repo1Path, 'src', 'components');
      const subPath2 = path.join(repo1Path, 'src', 'components', 'buttons', 'PrimaryButton.tsx');

      // Save notes from different subdirectory depths
      // Create the subdirectory paths first
      fs.mkdirSync(path.dirname(subPath2), { recursive: true });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Component level note',
        directoryPath: repo1Path,
        tags: ['components'],
        anchors: [subPath1],
        metadata: {},
      });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Deep button note',
        directoryPath: repo1Path,
        tags: ['button'],
        anchors: [subPath2],
        metadata: {},
      });

      // Both should be stored in repository root .a24z
      const notesDir = path.join(repo1Path, '.a24z', 'notes');
      expect(fs.existsSync(notesDir)).toBe(true);

      // Should NOT create .a24z in subdirectories
      expect(fs.existsSync(path.join(subPath1, '.a24z'))).toBe(false);
      expect(fs.existsSync(path.join(path.dirname(subPath2), '.a24z'))).toBe(false);

      // Verify notes are accessible from repository root
      const notes = getNotesForPath(repo1Path, true);
      expect(notes).toHaveLength(2);
    });

    it('should retrieve parent notes when querying from subdirectories', () => {
      // Save note at repository root
      const rootNote = saveNote({
        codebaseViewId: 'test-view',
        note: 'Repository-wide configuration',
        directoryPath: repo1Path,
        tags: ['config', 'root'],
        anchors: [repo1Path],
        metadata: {},
      });

      // Query from a deep subdirectory
      const deepPath = path.join(repo1Path, 'src', 'components', 'forms', 'input', 'TextField.tsx');
      const notes = getNotesForPath(deepPath, true);

      // Should find the root note
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(rootNote.note.id);
      expect(notes[0].isParentDirectory).toBe(true);
      expect(notes[0].pathDistance).toBeGreaterThan(0);
    });
  });

  describe('Cross-Repository Query Prevention', () => {
    it('should not return notes from other repositories when querying', () => {
      // Save notes with similar tags in different repositories
      // Create the auth directory first
      fs.mkdirSync(path.join(repo1Path, 'src', 'auth'), { recursive: true });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Authentication implementation in Alpha',
        directoryPath: repo1Path,
        tags: ['auth', 'security'],
        anchors: [path.join(repo1Path, 'src', 'auth')],
        metadata: {},
      });

      // Create the auth directory first
      fs.mkdirSync(path.join(repo2Path, 'lib', 'auth'), { recursive: true });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Authentication implementation in Beta',
        directoryPath: repo2Path,
        tags: ['auth', 'security'],
        anchors: [path.join(repo2Path, 'lib', 'auth')],
        metadata: {},
      });

      // Create the auth directory first
      fs.mkdirSync(path.join(repo3Path, 'modules', 'auth'), { recursive: true });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Authentication implementation in Gamma',
        directoryPath: repo3Path,
        tags: ['auth', 'security'],
        anchors: [path.join(repo3Path, 'modules', 'auth')],
        metadata: {},
      });

      // Query each repository for auth notes
      const alphaAuth = getNotesForPath(path.join(repo1Path, 'src', 'auth'), true);
      const betaAuth = getNotesForPath(path.join(repo2Path, 'lib', 'auth'), true);
      const gammaAuth = getNotesForPath(path.join(repo3Path, 'modules', 'auth'), true);

      // Each should only find its own note
      expect(alphaAuth).toHaveLength(1);
      expect(alphaAuth[0].note).toContain('Alpha');

      expect(betaAuth).toHaveLength(1);
      expect(betaAuth[0].note).toContain('Beta');

      expect(gammaAuth).toHaveLength(1);
      expect(gammaAuth[0].note).toContain('Gamma');
    });

    it('should maintain tag isolation between repositories', () => {
      // Save notes with overlapping tags
      saveNote({
        codebaseViewId: 'test-view',
        note: 'Alpha feature',
        directoryPath: repo1Path,
        tags: ['feature', 'v1'],
        anchors: [repo1Path],
        metadata: {},
      });

      saveNote({
        codebaseViewId: 'test-view',
        note: 'Beta feature',
        directoryPath: repo2Path,
        tags: ['feature', 'v2'],
        anchors: [repo2Path],
        metadata: {},
      });

      // Get used tags from each repository
      const alphaTags = getUsedTagsForPath(repo1Path);
      const betaTags = getUsedTagsForPath(repo2Path);

      // Verify tag isolation
      expect(alphaTags).toContain('v1');
      expect(alphaTags).not.toContain('v2');

      expect(betaTags).toContain('v2');
      expect(betaTags).not.toContain('v1');
    });
  });

  describe('MCP Tool Repository Isolation', () => {
    it('should maintain isolation through MCP tools', async () => {
      const fs = new InMemoryFileSystemAdapter();
      const createTool = new CreateRepositoryAnchoredNoteTool(fs);
      const getTool = new GetAnchoredNotesTool(fs);

      // Create notes in different repositories using MCP tool
      await createTool.execute({
        note: 'MCP note in Alpha',
        directoryPath: repo1Path,
        anchors: [repo1Path],
        tags: ['mcp', 'alpha'],
        codebaseViewId: 'test-view',
        metadata: {},
      });

      await createTool.execute({
        note: 'MCP note in Beta',
        directoryPath: repo2Path,
        anchors: [repo2Path],
        tags: ['mcp', 'beta'],
        codebaseViewId: 'test-view',
        metadata: {},
      });

      // Retrieve using MCP tool
      const alphaResult = await getTool.execute({
        path: repo1Path,
        includeParentNotes: true,
        filterReviewed: 'all',
        includeStale: true,
        sortBy: 'timestamp',
        limit: 10,
        offset: 0,
        includeMetadata: true,
      });

      const betaResult = await getTool.execute({
        path: repo2Path,
        includeParentNotes: true,
        filterReviewed: 'all',
        includeStale: true,
        sortBy: 'timestamp',
        limit: 10,
        offset: 0,
        includeMetadata: true,
      });

      // Parse results
      const alphaData = JSON.parse(alphaResult.content[0].text!);
      const betaData = JSON.parse(betaResult.content[0].text!);

      // Verify isolation
      expect(alphaData.pagination.total).toBe(1);
      expect(alphaData.notes[0].note).toContain('Alpha');

      expect(betaData.pagination.total).toBe(1);
      expect(betaData.notes[0].note).toContain('Beta');
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle nested repositories correctly', () => {
      // Create a nested repository inside repo1
      const nestedRepoPath = path.join(repo1Path, 'vendor', 'nested-project');
      fs.mkdirSync(path.join(nestedRepoPath, '.git'), { recursive: true });
      fs.writeFileSync(
        path.join(nestedRepoPath, '.git', 'config'),
        '[core]\nrepositoryformatversion = 0\n'
      );
      fs.writeFileSync(
        path.join(nestedRepoPath, 'package.json'),
        JSON.stringify({
          name: 'nested-project',
          version: '1.0.0',
        })
      );
      createTestView(nestedRepoPath, 'test-view');

      // Save notes in parent and nested repositories
      const parentNote = saveNote({
        codebaseViewId: 'test-view',
        note: 'Parent repository note',
        directoryPath: repo1Path,
        tags: ['parent'],
        anchors: [repo1Path],
        metadata: {},
      });

      const nestedNote = saveNote({
        codebaseViewId: 'test-view',
        note: 'Nested repository note',
        directoryPath: nestedRepoPath,
        tags: ['nested'],
        anchors: [nestedRepoPath],
        metadata: {},
      });

      // Each should have its own .a24z directory
      expect(fs.existsSync(path.join(repo1Path, '.a24z'))).toBe(true);
      expect(fs.existsSync(path.join(nestedRepoPath, '.a24z'))).toBe(true);

      // Notes should be isolated
      const parentNotes = getNotesForPath(repo1Path, true);
      const nestedNotes = getNotesForPath(nestedRepoPath, true);

      expect(parentNotes).toHaveLength(1);
      expect(parentNotes[0].id).toBe(parentNote.note.id);

      expect(nestedNotes).toHaveLength(1);
      expect(nestedNotes[0].id).toBe(nestedNote.note.id);
    });

    it('should handle repository without package.json but with git', () => {
      const orphanPath = path.join(tempBase, 'orphan-directory');
      fs.mkdirSync(orphanPath, { recursive: true });

      // Create minimal git structure
      fs.mkdirSync(path.join(orphanPath, '.git'), { recursive: true });
      fs.writeFileSync(
        path.join(orphanPath, '.git', 'config'),
        '[core]\nrepositoryformatversion = 0\n'
      );
      createTestView(orphanPath, 'test-view');

      const orphanNote = saveNote({
        codebaseViewId: 'test-view',
        note: 'Orphan directory note',
        directoryPath: orphanPath,
        tags: ['orphan'],
        anchors: [orphanPath],
        metadata: {},
      });

      // Should create .a24z in the directory itself
      expect(fs.existsSync(path.join(orphanPath, '.a24z'))).toBe(true);

      // Should be able to retrieve the note
      const notes = getNotesForPath(orphanPath, true);
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(orphanNote.note.id);
    });

    it('should handle concurrent saves to multiple repositories', () => {
      const notePromises = [];

      // Create 5 notes in each repository concurrently
      for (let i = 0; i < 5; i++) {
        notePromises.push(
          saveNote({
            codebaseViewId: 'test-view',
            note: `Alpha concurrent note ${i}`,
            directoryPath: repo1Path,
            tags: ['concurrent', 'alpha'],
            anchors: [repo1Path],
            metadata: { index: i },
          })
        );

        notePromises.push(
          saveNote({
            codebaseViewId: 'test-view',
            note: `Beta concurrent note ${i}`,
            directoryPath: repo2Path,
            tags: ['concurrent', 'beta'],
            anchors: [repo2Path],
            metadata: { index: i },
          })
        );

        notePromises.push(
          saveNote({
            codebaseViewId: 'test-view',
            note: `Gamma concurrent note ${i}`,
            directoryPath: repo3Path,
            tags: ['concurrent', 'gamma'],
            anchors: [repo3Path],
            metadata: { index: i },
          })
        );
      }

      // Wait for all saves
      notePromises.map((n) => n);

      // Verify each repository has exactly 5 notes
      const alphaNotes = getNotesForPath(repo1Path, true);
      const betaNotes = getNotesForPath(repo2Path, true);
      const gammaNotes = getNotesForPath(repo3Path, true);

      expect(alphaNotes).toHaveLength(5);
      expect(betaNotes).toHaveLength(5);
      expect(gammaNotes).toHaveLength(5);

      // Verify no cross-contamination
      expect(alphaNotes.every((n: any) => n.note.includes('Alpha'))).toBe(true);
      expect(betaNotes.every((n: any) => n.note.includes('Beta'))).toBe(true);
      expect(gammaNotes.every((n: any) => n.note.includes('Gamma'))).toBe(true);
    });
  });
});
