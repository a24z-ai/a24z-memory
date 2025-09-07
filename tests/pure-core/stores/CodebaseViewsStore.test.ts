/**
 * Test suite for the pure CodebaseViewsStore
 * Uses InMemoryFileSystemAdapter to test platform-agnostic functionality
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  CodebaseViewsStore,
  generateViewIdFromName,
} from '../../../src/pure-core/stores/CodebaseViewsStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { CodebaseView, ValidatedRepositoryPath } from '../../../src/pure-core/types';
import { MemoryPalace } from '../../../src/MemoryPalace';

describe('Pure CodebaseViewsStore', () => {
  let store: CodebaseViewsStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    store = new CodebaseViewsStore(fs);

    // Set up the test repository structure
    fs.setupTestRepo(testRepoPath);

    // Validate the repository path
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
  });

  const sampleView: CodebaseView = {
    id: 'test-view',
    version: '1.0',
    name: 'Test View',
    description: 'A test view for unit testing',
    overviewPath: 'README.md',
    cells: {
      file1: {
        files: ['src/index.ts'],
        coordinates: [0, 0],
      },
      file2: {
        files: ['src/utils.ts'],
        coordinates: [0, 1],
      },
    },
    scope: {
      includePatterns: ['src/**/*.ts'],
      excludePatterns: ['**/*.test.ts'],
    },
    links: {},
  };

  it('should save and retrieve views', () => {
    store.saveView(validatedRepoPath, sampleView);

    const retrieved = store.getView(validatedRepoPath, 'test-view');
    expect(retrieved).toBeTruthy();
    expect(retrieved?.id).toBe('test-view');
    expect(retrieved?.name).toBe('Test View');
    expect(retrieved?.description).toBe('A test view for unit testing');
  });

  it('should add timestamp when saving view without one', () => {
    const viewWithoutTimestamp = { ...sampleView };
    delete viewWithoutTimestamp.timestamp;

    store.saveView(validatedRepoPath, viewWithoutTimestamp);

    const retrieved = store.getView(validatedRepoPath, 'test-view');
    expect(retrieved?.timestamp).toBeTruthy();
    expect(typeof retrieved?.timestamp).toBe('string');
  });

  it('should preserve timestamp when view already has one', () => {
    const customTimestamp = '2024-01-01T00:00:00.000Z';
    const viewWithTimestamp = { ...sampleView, timestamp: customTimestamp };

    store.saveView(validatedRepoPath, viewWithTimestamp);

    const retrieved = store.getView(validatedRepoPath, 'test-view');
    expect(retrieved?.timestamp).toBe(customTimestamp);
  });

  it('should return null for non-existent view', () => {
    const result = store.getView(validatedRepoPath, 'non-existent');
    expect(result).toBe(null);
  });

  it('should list all views', () => {
    const view1 = { ...sampleView, id: 'view-alpha', name: 'Alpha View' };
    const view2 = { ...sampleView, id: 'view-beta', name: 'Beta View' };

    store.saveView(validatedRepoPath, view1);
    store.saveView(validatedRepoPath, view2);

    const views = store.listViews(validatedRepoPath);
    expect(views).toHaveLength(2);

    // Views should be sorted by name
    expect(views[0].name).toBe('Alpha View');
    expect(views[1].name).toBe('Beta View');
  });

  it('should return empty array when no views exist', () => {
    const views = store.listViews(validatedRepoPath);
    expect(views).toEqual([]);
  });

  it('should delete views', () => {
    store.saveView(validatedRepoPath, sampleView);

    expect(store.viewExists(validatedRepoPath, 'test-view')).toBe(true);

    const deleted = store.deleteView(validatedRepoPath, 'test-view');
    expect(deleted).toBe(true);
    expect(store.viewExists(validatedRepoPath, 'test-view')).toBe(false);
  });

  it('should return false when deleting non-existent view', () => {
    const deleted = store.deleteView(validatedRepoPath, 'non-existent');
    expect(deleted).toBe(false);
  });

  it('should update existing views', () => {
    store.saveView(validatedRepoPath, sampleView);

    const updates = {
      name: 'Updated Test View',
      description: 'An updated description',
    };

    const updated = store.updateView(validatedRepoPath, 'test-view', updates);
    expect(updated).toBe(true);

    const retrieved = store.getView(validatedRepoPath, 'test-view');
    expect(retrieved?.name).toBe('Updated Test View');
    expect(retrieved?.description).toBe('An updated description');
    expect(retrieved?.id).toBe('test-view'); // ID should remain unchanged
  });

  it('should return false when updating non-existent view', () => {
    const updated = store.updateView(validatedRepoPath, 'non-existent', { name: 'New Name' });
    expect(updated).toBe(false);
  });

  it('should check if view exists', () => {
    expect(store.viewExists(validatedRepoPath, 'test-view')).toBe(false);

    store.saveView(validatedRepoPath, sampleView);
    expect(store.viewExists(validatedRepoPath, 'test-view')).toBe(true);
  });

  it('should handle default views', () => {
    // No default view initially
    expect(store.getDefaultView(validatedRepoPath)).toBe(null);

    // Save a regular view
    store.saveView(validatedRepoPath, sampleView);

    // Set it as default
    const setDefault = store.setDefaultView(validatedRepoPath, 'test-view');
    expect(setDefault).toBe(true);

    // Retrieve default view
    const defaultView = store.getDefaultView(validatedRepoPath);
    expect(defaultView).toBeTruthy();
    expect(defaultView?.id).toBe('default');
    expect(defaultView?.name).toBe('Test View');
  });

  it('should return false when setting non-existent view as default', () => {
    const setDefault = store.setDefaultView(validatedRepoPath, 'non-existent');
    expect(setDefault).toBe(false);
  });

  it('should work with FileSystemAdapter abstraction', () => {
    // This test verifies that the store works entirely through the FileSystemAdapter
    // without any direct file system access

    store.saveView(validatedRepoPath, sampleView);

    // Check that files were created through the adapter
    const files = fs.getFiles();
    const viewFilePath = '/test-repo/.a24z/views/test-view.json';

    expect(files.has(viewFilePath)).toBe(true);

    const fileContent = files.get(viewFilePath);
    expect(fileContent).toBeTruthy();

    const parsedContent = JSON.parse(fileContent!);
    expect(parsedContent.id).toBe('test-view');
  });
});

describe('generateViewIdFromName', () => {
  it('should convert names to URL-safe IDs', () => {
    expect(generateViewIdFromName('My Architecture View')).toBe('my-architecture-view');
    expect(generateViewIdFromName('Frontend (React + Redux)')).toBe('frontend-react-redux');
    expect(generateViewIdFromName('  Spaces  ')).toBe('spaces');
    expect(generateViewIdFromName('Special!@#$%Characters')).toBe('special-characters');
  });

  it('should limit ID length for filesystem safety', () => {
    const longName = 'A'.repeat(100);
    const id = generateViewIdFromName(longName);
    expect(id.length).toBeLessThanOrEqual(50);
  });

  it('should handle empty and edge case names', () => {
    expect(generateViewIdFromName('')).toBe('');
    expect(generateViewIdFromName('   ')).toBe('');
    expect(generateViewIdFromName('123')).toBe('123');
  });
});
