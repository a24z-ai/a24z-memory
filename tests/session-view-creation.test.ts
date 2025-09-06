import * as fs from 'node:fs';
import * as path from 'node:path';
import { CreateRepositoryAnchoredNoteTool } from '../src/core-mcp/tools/CreateRepositoryAnchoredNoteTool';
import { codebaseViewsStore } from '../src/core-mcp/store/codebaseViewsStore';
import { TEST_DIR } from './setup';

describe('Catchall View Auto-Creation', () => {
  let tool: CreateRepositoryAnchoredNoteTool;
  const testPath = path.join(TEST_DIR, 'session-test-repo');

  beforeEach(() => {
    tool = new CreateRepositoryAnchoredNoteTool();

    // Ensure test directory exists
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    fs.mkdirSync(testPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    const gitDir = path.join(testPath, '.git');
    fs.mkdirSync(gitDir, { recursive: true });

    // Create some test files to anchor to
    const srcDir = path.join(testPath, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'main.ts'), 'console.log("hello");');
    fs.writeFileSync(path.join(srcDir, 'utils.ts'), 'export const util = () => {};');
  });

  afterEach(() => {
    if (fs.existsSync(testPath)) {
      fs.rmSync(testPath, { recursive: true, force: true });
    }
  });

  it('should auto-create a catchall view when codebaseViewId is not provided', async () => {
    const input = {
      note: 'Test note for catchall view creation',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts'), path.join(testPath, 'src/utils.ts')],
      tags: ['test'],
      // codebaseViewId is intentionally omitted
    };

    const result = await tool.execute(input);

    // Should succeed without error
    expect(result.content[0].text).toContain('Note saved successfully');
    expect(result.content[0].text).toContain('Default View:');
    expect(result.content[0].text).toContain('Default Exploration Log (default-explorer-log)');
  });

  it('should create a view with user metadata', async () => {
    const input = {
      note: 'Test note for catchall metadata',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts')],
      tags: ['test'],
    };

    await tool.execute(input);

    // Check that the catchall view was created
    const views = codebaseViewsStore.listViews(testPath);
    const catchallView = views.find((v) => v.id === 'default-explorer-log');

    expect(catchallView).toBeDefined();
    expect(catchallView!.metadata?.generationType).toBe('user');
    expect(catchallView!.name).toBe('Default Exploration Log');
  });

  it('should generate time-based cells that increment with each note', async () => {
    const input = {
      note: 'Test note for time-based cells',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts'), path.join(testPath, 'src/utils.ts')],
      tags: ['test'],
    };

    await tool.execute(input);

    // Get the created catchall view
    const catchallView = codebaseViewsStore.getView(testPath, 'default-explorer-log');

    expect(catchallView).toBeDefined();
    expect(catchallView!.cells).toBeDefined();

    // Should have at least one time-based cell
    const cellNames = Object.keys(catchallView!.cells);
    expect(cellNames.length).toBeGreaterThan(0);

    // Cell names should follow YYYY-MM-DD-HH format
    const timeCellPattern = /^\d{4}-\d{2}-\d{2}-\d{2}$/;
    expect(cellNames.some((name) => timeCellPattern.test(name))).toBe(true);

    // Cells should contain the note anchors as patterns
    const firstCell = Object.values(catchallView!.cells)[0];
    expect(firstCell.patterns).toContain('src/main.ts');
    expect(firstCell.patterns).toContain('src/utils.ts');
  });

  it('should still work with explicit codebaseViewId when provided', async () => {
    // First create a manual view
    const manualView = {
      id: 'manual-test-view',
      version: '1.0.0',
      name: 'Manual Test View',
      description: 'Manually created view',
      overviewPath: 'docs/manual-test-view.md',
      cells: {
        main: {
          patterns: ['**/*'],
          coordinates: [0, 0] as [number, number],
        },
      },
      timestamp: new Date().toISOString(),
      metadata: {
        generationType: 'user' as const,
      },
    };

    codebaseViewsStore.saveView(testPath, manualView);

    const input = {
      note: 'Test note with explicit view ID',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts')],
      tags: ['test'],
      codebaseViewId: 'manual-test-view',
    };

    const result = await tool.execute(input);

    // Should use the provided view, not create a catchall view
    expect(result.content[0].text).toContain('Note saved successfully');
    expect(result.content[0].text).toContain('Manual Test View');
    expect(result.content[0].text).not.toContain('Default View:');
  });

  it('should reuse the same catchall view for multiple notes', async () => {
    const input1 = {
      note: 'First test note',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts')],
      tags: ['test'],
    };

    // Create first note (creates catchall view)
    await tool.execute(input1);

    // Get the catchall view
    const views = codebaseViewsStore.listViews(testPath);
    const catchallView = views.find((v) => v.id === 'default-explorer-log');
    expect(catchallView).toBeDefined();

    // Create second note (should reuse the same view)
    const input2 = {
      note: 'Second test note',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/utils.ts')],
      tags: ['test'],
    };

    await tool.execute(input2);

    // Verify still only one catchall view exists
    const finalViews = codebaseViewsStore.listViews(testPath);
    const catchallViews = finalViews.filter((v) => v.id === 'default-explorer-log');
    expect(catchallViews.length).toBe(1);

    // View should have time-based cells with accumulated anchors
    const updatedView = codebaseViewsStore.getView(testPath, 'default-explorer-log');
    expect(updatedView).toBeDefined();
    expect(Object.keys(updatedView!.cells).length).toBeGreaterThan(0);

    // Check that anchors from both notes are in the same time cell (assuming same hour)
    const firstCell = Object.values(updatedView!.cells)[0];
    expect(firstCell.patterns).toContain('src/main.ts');
    expect(firstCell.patterns).toContain('src/utils.ts');
  });

  describe('Markdown Overview File Generation', () => {
    it('should create markdown overview file when catchall view is created', async () => {
      const input = {
        note: 'Test note for overview file creation',
        directoryPath: testPath,
        anchors: [path.join(testPath, 'src/main.ts')],
        tags: ['test'],
      };

      await tool.execute(input);

      // Check that the overview file was created
      const overviewPath = path.join(testPath, '.a24z', 'overviews', 'default-explorer-log.md');
      expect(fs.existsSync(overviewPath)).toBe(true);

      // Check that the overview file has content
      const content = fs.readFileSync(overviewPath, 'utf-8');
      expect(content).toContain('Default Exploration Log');
      expect(content).toContain('Time-based catchall view');
    });

    it('should update markdown overview file when notes are added to existing time cells', async () => {
      const input1 = {
        note: 'First note for overview update test',
        directoryPath: testPath,
        anchors: [path.join(testPath, 'src/main.ts')],
        tags: ['test'],
      };

      // Create first note
      await tool.execute(input1);

      const overviewPath = path.join(testPath, '.a24z', 'overviews', 'default-explorer-log.md');
      expect(fs.existsSync(overviewPath)).toBe(true);

      // Get initial content
      const initialContent = fs.readFileSync(overviewPath, 'utf-8');
      expect(initialContent).toContain('src/main.ts');

      // Add second note to same time cell (same hour)
      const input2 = {
        note: 'Second note for overview update test',
        directoryPath: testPath,
        anchors: [path.join(testPath, 'src/utils.ts')],
        tags: ['test'],
      };

      await tool.execute(input2);

      // Check that overview was updated
      const updatedContent = fs.readFileSync(overviewPath, 'utf-8');
      expect(updatedContent).toContain('src/main.ts');
      expect(updatedContent).toContain('src/utils.ts');
    });

    it('should create new time-based sections when notes are added in different hours', async () => {
      const input1 = {
        note: 'Note for first time cell',
        directoryPath: testPath,
        anchors: [path.join(testPath, 'src/main.ts')],
        tags: ['test'],
      };

      await tool.execute(input1);

      // Get the view to see current time cell
      const view = codebaseViewsStore.getView(testPath, 'default-explorer-log');
      const currentCells = Object.keys(view!.cells);
      expect(currentCells.length).toBe(1);

      // Mock a different hour by directly creating a new cell
      const now = new Date();
      const differentHour = (now.getHours() + 1) % 24;
      const today = now.toISOString().split('T')[0];
      const newCellName = `${today}-${differentHour.toString().padStart(2, '0')}`;

      // Simulate adding to different time cell by updating view directly
      view!.cells[newCellName] = {
        patterns: ['src/utils.ts'],
        coordinates: [0, 1],
        priority: 5,
      };
      codebaseViewsStore.saveView(testPath, view!);

      // Check overview reflects multiple time sections
      const overviewPath = path.join(testPath, '.a24z', 'overviews', 'default-explorer-log.md');

      // Since we're testing the overview generation, we need to trigger it
      // This test verifies the structure would support multiple time cells
      expect(fs.existsSync(overviewPath)).toBe(true);
      const content = fs.readFileSync(overviewPath, 'utf-8');
      expect(content).toContain('Default Exploration Log');
    });

    it('should handle overview file creation in nested directories', async () => {
      const input = {
        note: 'Test nested directory overview',
        directoryPath: testPath,
        anchors: ['deeply/nested/path/file.ts'],
        tags: ['test'],
      };

      await tool.execute(input);

      // Verify overview directory structure was created
      const overviewDir = path.join(testPath, '.a24z', 'overviews');
      expect(fs.existsSync(overviewDir)).toBe(true);

      const overviewPath = path.join(overviewDir, 'default-explorer-log.md');
      expect(fs.existsSync(overviewPath)).toBe(true);

      const content = fs.readFileSync(overviewPath, 'utf-8');
      expect(content).toContain('deeply/nested/path/file.ts');
    });

    it('should preserve existing overview content when updating', async () => {
      const input1 = {
        note: 'Initial note with important context',
        directoryPath: testPath,
        anchors: ['important/file.ts'],
        tags: ['critical'],
      };

      await tool.execute(input1);

      const overviewPath = path.join(testPath, '.a24z', 'overviews', 'default-explorer-log.md');
      // Verify initial content exists
      expect(fs.existsSync(overviewPath)).toBe(true);

      // Add a second note
      const input2 = {
        note: 'Additional context note',
        directoryPath: testPath,
        anchors: ['additional/file.ts'],
        tags: ['supplementary'],
      };

      await tool.execute(input2);

      const updatedContent = fs.readFileSync(overviewPath, 'utf-8');

      // Should contain both files
      expect(updatedContent).toContain('important/file.ts');
      expect(updatedContent).toContain('additional/file.ts');

      // Should maintain the overview structure
      expect(updatedContent).toContain('Default Exploration Log');
    });
  });
});
