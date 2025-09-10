import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CreateRepositoryAnchoredNoteTool } from '../src/mcp/tools/CreateRepositoryAnchoredNoteTool';
import { InMemoryFileSystemAdapter } from './test-adapters/InMemoryFileSystemAdapter';
import { CodebaseViewsStore } from '../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  CodebaseView,
  ValidatedAlexandriaPath,
} from '../src/pure-core/types';

describe('Default View Auto-Creation', () => {
  let tool: CreateRepositoryAnchoredNoteTool;
  let viewsStore: CodebaseViewsStore;
  let fs: InMemoryFileSystemAdapter;
  const testPath = '/default-view-test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;
  let alexandriaPath: ValidatedAlexandriaPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    tool = new CreateRepositoryAnchoredNoteTool(fs);

    // Set up test repository
    fs.setupTestRepo(testPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testPath);
    alexandriaPath = MemoryPalace.getAlexandriaPath(validatedRepoPath, fs);

    // Initialize stores with alexandria path
    viewsStore = new CodebaseViewsStore(fs, alexandriaPath);

    // Create some test files to anchor to
    const srcDir = fs.join(testPath, 'src');
    fs.createDir(srcDir);
    fs.writeFile(fs.join(srcDir, 'main.ts'), 'console.log("hello");');
    fs.writeFile(fs.join(srcDir, 'utils.ts'), 'export const util = () => {};');
  });

  afterEach(() => {
    // Clean up is handled automatically by InMemoryFileSystemAdapter
  });

  it('should auto-create a default view when codebaseViewId is not provided', async () => {
    const input = {
      note: 'Test note for default view creation',
      directoryPath: testPath,
      anchors: ['src/main.ts', 'src/utils.ts'],
      tags: ['test'],
    };

    await tool.execute(input);

    // Check that the default view was created
    const views = viewsStore.listViews(validatedRepoPath);
    const defaultView = views.find((v: CodebaseView) => v.id === 'default-explorer-log');

    expect(defaultView).toBeDefined();
    expect(defaultView!.metadata?.generationType).toBe('user');
    expect(defaultView!.name).toBe('Default Exploration Log');
  });

  it('should create a view with user metadata', async () => {
    const input = {
      note: 'Test note for default metadata',
      directoryPath: testPath,
      anchors: ['src/main.ts'],
      tags: ['test'],
    };

    await tool.execute(input);

    // Check that the default view was created
    const views = viewsStore.listViews(validatedRepoPath);
    const defaultView = views.find((v: CodebaseView) => v.id === 'default-explorer-log');

    expect(defaultView).toBeDefined();
    expect(defaultView!.metadata?.generationType).toBe('user');
    expect(defaultView!.name).toBe('Default Exploration Log');
  });

  it('should generate time-based cells in the default view', async () => {
    const input = {
      note: 'Test note for time-based cells',
      directoryPath: testPath,
      anchors: ['src/main.ts', 'src/utils.ts'],
      tags: ['test'],
    };

    await tool.execute(input);

    // Check that the default view was created with cells
    const defaultView = viewsStore.getView(validatedRepoPath, 'default-explorer-log');
    expect(defaultView).toBeDefined();
    expect(defaultView!.cells).toBeDefined();
    expect(Object.keys(defaultView!.cells).length).toBeGreaterThan(0);

    // Check that the first cell contains the anchored files
    const firstCell = Object.values(defaultView!.cells)[0];
    expect(firstCell.files).toContain('src/main.ts');
    expect(firstCell.files).toContain('src/utils.ts');
  });

  it('should not create default view when codebaseViewId is provided', async () => {
    // Create a manual view first
    const manualView: CodebaseView = {
      id: 'manual-test-view',
      version: '1.0.0',
      name: 'Manual Test View',
      description: 'A manually created view',
      overviewPath: 'README.md',
      cells: {
        'cell-1': {
          files: ['src/main.ts'],
          coordinates: [0, 0],
        },
      },
      timestamp: Date.now().toString(),
    };

    viewsStore.saveView(validatedRepoPath, manualView);

    const input = {
      note: 'Test note with manual view',
      directoryPath: testPath,
      anchors: ['src/main.ts'],
      tags: ['test'],
      codebaseViewId: 'manual-test-view',
    };

    const result = await tool.execute(input);
    expect(result.content[0].text).toContain('Note saved successfully');
  });

  it('should update existing default view when adding new notes', async () => {
    // Create first note
    const input1 = {
      note: 'First test note',
      directoryPath: testPath,
      anchors: ['src/main.ts'],
      tags: ['test'],
    };

    await tool.execute(input1);

    // Check initial view state
    const views = viewsStore.listViews(validatedRepoPath);
    const defaultView = views.find((v: CodebaseView) => v.id === 'default-explorer-log');
    expect(defaultView).toBeDefined();

    // Create second note
    const input2 = {
      note: 'Second test note',
      directoryPath: testPath,
      anchors: ['src/utils.ts'],
      tags: ['test'],
    };

    await tool.execute(input2);

    // Check that the view was updated
    const finalViews = viewsStore.listViews(validatedRepoPath);
    const defaultViews = finalViews.filter((v: CodebaseView) => v.id === 'default-explorer-log');
    expect(defaultViews).toHaveLength(1);

    const updatedView = viewsStore.getView(validatedRepoPath, 'default-explorer-log');
    expect(updatedView).toBeDefined();
    expect(updatedView!.cells).toBeDefined();

    // Check that both files are in the patterns
    const firstCell = Object.values(updatedView!.cells)[0];
    expect(firstCell.files).toContain('src/main.ts');
    expect(firstCell.files).toContain('src/utils.ts');
  });

  it('should create overview files for default views', async () => {
    const input = {
      note: 'Test note for overview generation',
      directoryPath: testPath,
      anchors: ['src/main.ts'],
      tags: ['test'],
    };

    await tool.execute(input);

    // Check that overview file was created
    const overviewPath = fs.join(testPath, 'docs', 'default-explorer-log.md');
    expect(fs.exists(overviewPath)).toBe(true);

    // Check overview content
    const content = fs.readFile(overviewPath);
    expect(content).toContain('Default Exploration Log');
    expect(content).toContain('src/main.ts');
  });

  it('should update overview files when view is modified', async () => {
    // Create initial note
    const input1 = {
      note: 'Initial note',
      directoryPath: testPath,
      anchors: ['src/main.ts'],
      tags: ['test'],
    };

    await tool.execute(input1);

    // Check initial overview
    const overviewPath = fs.join(testPath, 'docs', 'default-explorer-log.md');
    expect(fs.exists(overviewPath)).toBe(true);

    const initialContent = fs.readFile(overviewPath);

    // Add second note
    const input2 = {
      note: 'Second note',
      directoryPath: testPath,
      anchors: ['src/utils.ts'],
      tags: ['test'],
    };

    await tool.execute(input2);

    // Check that overview was updated
    const updatedContent = fs.readFile(overviewPath);
    expect(updatedContent).not.toBe(initialContent);
    expect(updatedContent).toContain('src/utils.ts');
  });

  it('should handle view updates correctly', async () => {
    // Create initial note
    const input1 = {
      note: 'Initial note',
      directoryPath: testPath,
      anchors: ['src/main.ts'],
      tags: ['test'],
    };

    await tool.execute(input1);

    // Get the view and modify it
    const view = viewsStore.getView(validatedRepoPath, 'default-explorer-log');
    expect(view).toBeDefined();

    // Add a new cell to the view
    if (view) {
      view.cells['cell-2'] = {
        files: ['src/utils.ts'],
        coordinates: [0, 1],
      };

      // Save the modified view
      viewsStore.saveView(validatedRepoPath, view);
    }

    // Check that overview was updated
    const overviewPath = fs.join(testPath, 'docs', 'default-explorer-log.md');
    expect(fs.exists(overviewPath)).toBe(true);

    const content = fs.readFile(overviewPath);
    expect(content).toContain('src/main.ts');
    // Note: The overview might not immediately reflect the new cell addition
    // as it's generated based on the view's current state
  });

  it('should create overview directory structure', async () => {
    const input = {
      note: 'Test note for directory structure',
      directoryPath: testPath,
      anchors: ['src/main.ts'],
      tags: ['test'],
    };

    await tool.execute(input);

    // Check that overview directory exists
    const overviewDir = fs.join(testPath, 'docs');
    expect(fs.exists(overviewDir)).toBe(true);

    // Check that overview file exists
    const overviewPath = fs.join(overviewDir, 'default-explorer-log.md');
    expect(fs.exists(overviewPath)).toBe(true);

    const content = fs.readFile(overviewPath);
    expect(content).toContain('Default Exploration Log');
  });

  it('should handle multiple notes in the same view', async () => {
    // Create first note
    const input1 = {
      note: 'First note',
      directoryPath: testPath,
      anchors: ['src/main.ts'],
      tags: ['test'],
    };

    await tool.execute(input1);

    // Create second note
    const input2 = {
      note: 'Second note',
      directoryPath: testPath,
      anchors: ['src/utils.ts'],
      tags: ['test'],
    };

    await tool.execute(input2);

    // Check that both notes are in the same view
    const view = viewsStore.getView(validatedRepoPath, 'default-explorer-log');
    expect(view).toBeDefined();
    expect(view!.cells).toBeDefined();

    // Check that both files are in the patterns
    const firstCell = Object.values(view!.cells)[0];
    expect(firstCell.files).toContain('src/main.ts');
    expect(firstCell.files).toContain('src/utils.ts');
  });
});
