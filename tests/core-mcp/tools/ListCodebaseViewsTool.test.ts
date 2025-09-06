import * as fs from 'node:fs';
import * as path from 'node:path';
import { ListCodebaseViewsTool } from '../../../src/core-mcp/tools/ListCodebaseViewsTool';
import {
  codebaseViewsStore,
  type CodebaseView,
} from '../../../src/core-mcp/store/codebaseViewsStore';
import { TEST_DIR } from '../../setup';

describe('ListCodebaseViewsTool', () => {
  let tool: ListCodebaseViewsTool;
  const testRepoPath = path.join(TEST_DIR, 'list-views-test-repo');

  beforeEach(() => {
    tool = new ListCodebaseViewsTool();

    // Clean up any existing test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true });
    }

    // Ensure TEST_DIR exists first
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // Create test repository structure
    fs.mkdirSync(testRepoPath, { recursive: true });
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true });
    }
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
      cells: {
        source: {
          patterns: ['src/**/*'],
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
      cells: {
        tests: {
          patterns: ['test/**/*'],
          coordinates: [0, 1],
        },
      },
    };

    // Save views to store
    codebaseViewsStore.saveView(testRepoPath, view1);
    codebaseViewsStore.saveView(testRepoPath, view2);

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

    // Check summary format - should only include id, name, description
    expect(views[0]).toEqual({
      id: 'test-view-1',
      name: 'Test View One',
      description: 'First test view for unit testing',
    });

    expect(views[1]).toEqual({
      id: 'test-view-2',
      name: 'Test View Two',
      description: 'Second test view for comprehensive coverage',
    });

    // Verify it doesn't include internal details like cells, rows, cols
    expect(views[0].cells).toBeUndefined();
    expect(views[0].rows).toBeUndefined();
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
      cells: {
        source: {
          patterns: ['src/**/*'],
          coordinates: [0, 0],
        },
      },
    };

    codebaseViewsStore.saveView(testRepoPath, view);

    // Query from a nested path within the repository
    const nestedPath = path.join(testRepoPath, 'src', 'components');
    fs.mkdirSync(nestedPath, { recursive: true });

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
      cells: {},
    };

    const viewA: CodebaseView = {
      id: 'a-view',
      version: '1.0.0',
      name: 'A First View',
      description: 'Should appear first',
      overviewPath: 'docs/a-view.md',
      cells: {},
    };

    const viewM: CodebaseView = {
      id: 'm-view',
      version: '1.0.0',
      name: 'M Middle View',
      description: 'Should appear in middle',
      overviewPath: 'docs/m-view.md',
      cells: {},
    };

    // Save in non-alphabetical order
    codebaseViewsStore.saveView(testRepoPath, viewZ);
    codebaseViewsStore.saveView(testRepoPath, viewA);
    codebaseViewsStore.saveView(testRepoPath, viewM);

    const result = await tool.execute({ repositoryPath: testRepoPath });
    const data = JSON.parse(result.content[0].text!);

    expect(data.codebaseViews).toHaveLength(3);
    expect(data.codebaseViews[0].name).toBe('A First View');
    expect(data.codebaseViews[1].name).toBe('M Middle View');
    expect(data.codebaseViews[2].name).toBe('Z Last View');
  });
});
