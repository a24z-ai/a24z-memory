import * as fs from 'node:fs';
import * as path from 'node:path';
import { CreateRepositoryAnchoredNoteTool } from '../src/core-mcp/tools/CreateRepositoryAnchoredNoteTool';
import { codebaseViewsStore } from '../src/core-mcp/store/codebaseViewsStore';
import { TEST_DIR } from './setup';

describe('Session View Auto-Creation', () => {
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

  it('should auto-create a session view when codebaseViewId is not provided', async () => {
    const input = {
      note: 'Test note for session view creation',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts'), path.join(testPath, 'src/utils.ts')],
      tags: ['test'],
      // codebaseViewId is intentionally omitted
    };

    const result = await tool.execute(input);

    // Should succeed without error
    expect(result.content[0].text).toContain('Note saved successfully');
    expect(result.content[0].text).toContain('Session View:');
    expect(result.content[0].text).toContain('Session View (main.ts)');
  });

  it('should create a view with session metadata', async () => {
    const input = {
      note: 'Test note for session metadata',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts')],
      tags: ['test'],
    };

    await tool.execute(input);

    // Check that a session view was created
    const views = codebaseViewsStore.listViews(testPath);
    const sessionViews = views.filter((v) => v.id.startsWith('session-'));

    expect(sessionViews.length).toBeGreaterThan(0);

    const sessionView = codebaseViewsStore.getView(testPath, sessionViews[0].id);
    expect(sessionView).toBeDefined();
    expect(sessionView!.metadata?.generationType).toBe('session');
    expect(sessionView!.name).toContain('Session View');
  });

  it('should generate appropriate cell patterns based on file anchors', async () => {
    const input = {
      note: 'Test note for pattern inference',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts'), path.join(testPath, 'src/utils.ts')],
      tags: ['test'],
    };

    await tool.execute(input);

    // Get the created session view
    const views = codebaseViewsStore.listViews(testPath);
    const sessionView = codebaseViewsStore.getView(testPath, views[0].id);

    expect(sessionView).toBeDefined();
    expect(sessionView!.cells).toBeDefined();

    // Should have typical cells like source, tests, config, docs
    const cellNames = Object.keys(sessionView!.cells);
    expect(cellNames).toContain('source');
    expect(cellNames).toContain('tests');
    expect(cellNames).toContain('config');
    expect(cellNames).toContain('docs');

    // Source cell should have patterns for TypeScript files
    const sourceCell = sessionView!.cells.source;
    expect(sourceCell.patterns.some((p) => p.includes('*.ts') || p.includes('src/'))).toBe(true);
  });

  it('should still work with explicit codebaseViewId when provided', async () => {
    // First create a manual view
    const manualView = {
      id: 'manual-test-view',
      version: '1.0.0',
      name: 'Manual Test View',
      description: 'Manually created view',
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

    // Should use the provided view, not create a session view
    expect(result.content[0].text).toContain('Note saved successfully');
    expect(result.content[0].text).toContain('Manual Test View');
    expect(result.content[0].text).not.toContain('Session View: Auto-created');
  });

  it('should create and update session activity log', async () => {
    const input1 = {
      note: 'First test note for activity logging',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/main.ts')],
      tags: ['test'],
    };

    // Create first note (creates new session view)
    await tool.execute(input1);

    // Get the session view ID from the first note
    const views = codebaseViewsStore.listViews(testPath);
    const sessionView = views.find((v) => v.id.startsWith('session-'));
    expect(sessionView).toBeDefined();

    // Check that log file was created
    const logPath = path.join(testPath, '.a24z', 'overviews', `${sessionView!.id}.md`);
    expect(fs.existsSync(logPath)).toBe(true);

    // Read initial log content
    let logContent = fs.readFileSync(logPath, 'utf-8');
    expect(logContent).toContain('# Session Log');
    expect(logContent).toContain(sessionView!.name);
    expect(logContent).toContain('Note created: "First test note for activity logging" (main.ts)');

    // Create second note WITH the session view ID to add to same view
    const input2 = {
      note: 'Second note with a longer content that should be truncated in the log to show how the summary works',
      directoryPath: testPath,
      anchors: [path.join(testPath, 'src/utils.ts')],
      tags: ['test'],
      codebaseViewId: sessionView!.id, // Use the session view from first note
    };

    await tool.execute(input2);

    // Check that activity was appended to the SAME log
    logContent = fs.readFileSync(logPath, 'utf-8');
    expect(logContent).toContain(
      'Note created: "Second note with a longer content that should be t..." (utils.ts)'
    );

    // Should have both entries in the same log
    const lines = logContent.split('\n').filter((line) => line.includes('Note created:'));
    expect(lines.length).toBe(2);

    // Verify only one session view exists (not two)
    const finalViews = codebaseViewsStore.listViews(testPath);
    const sessionViews = finalViews.filter((v) => v.id.startsWith('session-'));
    expect(sessionViews.length).toBe(1);
  });
});
