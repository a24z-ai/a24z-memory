import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ListCodebaseViewsTool } from '../../../src/mcp/tools/ListCodebaseViewsTool';
import { MemoryPalace } from '../../../src/MemoryPalace';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { CodebaseViewsStore } from '../../../src/pure-core/stores/CodebaseViewsStore';
import { type CodebaseView, ValidatedRepositoryPath } from '../../../src/pure-core/types';

describe('ListCodebaseViewsTool', () => {
  let inMemoryFs: InMemoryFileSystemAdapter;
  let testRepoPath: string;
  let tool: ListCodebaseViewsTool;
  let codebaseViewsStore: CodebaseViewsStore;
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    // Set up in-memory filesystem
    inMemoryFs = new InMemoryFileSystemAdapter();
    testRepoPath = '/test-repo';

    // Set up repository structure
    inMemoryFs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(inMemoryFs, testRepoPath);

    // Create MemoryPalace instance with in-memory adapter
    new MemoryPalace(testRepoPath, inMemoryFs);

    // Create CodebaseViewsStore for managing views
    codebaseViewsStore = new CodebaseViewsStore(inMemoryFs);

    // Create the tool with the same in-memory adapter
    tool = new ListCodebaseViewsTool(inMemoryFs);
  });

  afterEach(() => {
    // Clean up in-memory filesystem
    inMemoryFs.clear();
  });

  it('should return empty list when no views exist', async () => {
    const result = await tool.execute({ repositoryPath: testRepoPath });

    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text!);

    expect(data.codebaseViews).toEqual([]);
    expect(data.repositoryPath).toBe(testRepoPath);
    expect(data.totalCount).toBe(0);
  });

  it('should list existing codebase views with correct summary format', async () => {
    // Create test views
    const view1: CodebaseView = {
      id: 'test-view-1',
      version: '1.0.0',
      name: 'Test View One',
      description: 'First test view for unit testing',
      overviewPath: 'docs/test-view-1.md',
      category: 'other',
      cells: {
        source: {
          files: ['src/index.ts', 'src/lib.ts'],
          coordinates: [0, 0],
        },
      },
    };

    const view2: CodebaseView = {
      id: 'test-view-2',
      version: '1.0.0',
      name: 'Test View Two',
      description: 'Second test view for comprehensive coverage',
      overviewPath: 'docs/test-view-2.md',
      category: 'other',
      cells: {
        tests: {
          files: ['test/index.test.ts', 'test/lib.test.ts'],
          coordinates: [0, 1],
        },
      },
    };

    // Save views using MemoryPalace
    codebaseViewsStore.saveView(validatedRepoPath, view1);
    codebaseViewsStore.saveView(validatedRepoPath, view2);

    // Execute tool
    const result = await tool.execute({ repositoryPath: testRepoPath });

    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text!);

    // Check response structure
    expect(data.codebaseViews).toHaveLength(2);
    expect(data.repositoryPath).toBe(testRepoPath);
    expect(data.totalCount).toBe(2);

    // Check that views are sorted by name (alphabetical)
    const views = data.codebaseViews;
    expect(views[0].name).toBe('Test View One');
    expect(views[1].name).toBe('Test View Two');

    // Check summary format - should include id, name, description, cellCount, gridSize, overviewPath, category
    expect(views[0]).toEqual({
      id: 'test-view-1',
      name: 'Test View One',
      description: 'First test view for unit testing',
      cellCount: 1,
      gridSize: [1, 1],
      overviewPath: 'docs/test-view-1.md',
      category: 'other', // Default category
    });

    expect(views[1]).toEqual({
      id: 'test-view-2',
      name: 'Test View Two',
      description: 'Second test view for comprehensive coverage',
      cellCount: 1,
      gridSize: [1, 2],
      overviewPath: 'docs/test-view-2.md',
      category: 'other', // Default category
    });

    // Verify it doesn't include internal details like cells, version
    expect(views[0].cells).toBeUndefined();
    expect(views[0].version).toBeUndefined();
  });

  it('should work with nested repository paths', async () => {
    // Create a view at the repository root
    const view: CodebaseView = {
      id: 'nested-test',
      version: '1.0.0',
      name: 'Nested Path Test',
      description: 'Testing nested path resolution',
      overviewPath: 'docs/nested-test.md',
      category: 'other',
      cells: {
        source: {
          files: ['src/index.ts', 'src/lib.ts'],
          coordinates: [0, 0],
        },
      },
    };

    codebaseViewsStore.saveView(validatedRepoPath, view);

    // Query from a nested path within the repository
    const nestedPath = inMemoryFs.join(testRepoPath, 'src', 'components');
    inMemoryFs.createDir(nestedPath);

    const result = await tool.execute({ repositoryPath: nestedPath });

    expect(result.content[0].type).toBe('text');
    const data = JSON.parse(result.content[0].text!);

    // Should find the view and normalize to repository root
    expect(data.codebaseViews).toHaveLength(1);
    expect(data.repositoryPath).toBe(testRepoPath); // Normalized to repo root
    expect(data.codebaseViews[0].id).toBe('nested-test');
  });

  it('should reject relative paths', async () => {
    await expect(tool.execute({ repositoryPath: 'relative/path' })).rejects.toThrow(
      /must be an absolute path/
    );
  });

  it('should sort views alphabetically by name', async () => {
    // Create views with names that will test sorting
    const viewZ: CodebaseView = {
      id: 'z-view',
      version: '1.0.0',
      name: 'Z Last View',
      description: 'Should appear last',
      overviewPath: 'docs/z-view.md',
      category: 'other',
      cells: {},
    };

    const viewA: CodebaseView = {
      id: 'a-view',
      version: '1.0.0',
      name: 'A First View',
      description: 'Should appear first',
      overviewPath: 'docs/a-view.md',
      category: 'other',
      cells: {},
    };

    const viewM: CodebaseView = {
      id: 'm-view',
      version: '1.0.0',
      name: 'M Middle View',
      description: 'Should appear in middle',
      overviewPath: 'docs/m-view.md',
      category: 'other',
      cells: {},
    };

    // Save in non-alphabetical order
    codebaseViewsStore.saveView(validatedRepoPath, viewZ);
    codebaseViewsStore.saveView(validatedRepoPath, viewA);
    codebaseViewsStore.saveView(validatedRepoPath, viewM);

    const result = await tool.execute({ repositoryPath: testRepoPath });
    const data = JSON.parse(result.content[0].text!);

    expect(data.codebaseViews).toHaveLength(3);
    expect(data.codebaseViews[0].name).toBe('A First View');
    expect(data.codebaseViews[1].name).toBe('M Middle View');
    expect(data.codebaseViews[2].name).toBe('Z Last View');
  });
});
