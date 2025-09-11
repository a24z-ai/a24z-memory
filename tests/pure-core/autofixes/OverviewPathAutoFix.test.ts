import { describe, test, expect, beforeEach } from 'bun:test';
import { MemoryPalace } from '../../../src/MemoryPalace';
import { OverviewPathAutoFix } from '../../../src/pure-core/autofixes/OverviewPathAutoFix';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { CodebaseView } from '../../../src/pure-core/types';

describe('OverviewPathAutoFix', () => {
  let fs: InMemoryFileSystemAdapter;
  let palace: MemoryPalace;
  let autoFix: OverviewPathAutoFix;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    
    // Set up a test repository structure
    const repoPath = '/test/repo';
    fs.createDir(repoPath);
    fs.createDir(`${repoPath}/.git`);
    fs.createDir(`${repoPath}/.alexandria`);
    fs.createDir(`${repoPath}/.alexandria/views`);
    fs.writeFile(`${repoPath}/.git/config`, '[core]\n');

    palace = new MemoryPalace(repoPath, fs);
    
    autoFix = new OverviewPathAutoFix(palace, {
      createMissing: true,
      consolidateDocs: false,
    });
  });

  test('should identify missing overview files', async () => {
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'A test view',
      overviewPath: 'missing-doc.md',
      category: 'test',
      displayOrder: 0,
      cells: {},
    };

    // Save the view to the palace
    palace.saveView(testView);

    const suggestions = await autoFix.analyze();

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].issue.type).toBe('missing_overview_file');
    expect(suggestions[0].issue.location).toBe('missing-doc.md');
    expect(suggestions[0].issue.severity).toBe('safe');
  });

  test('should not suggest fixes for existing overview files', async () => {
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'A test view',
      overviewPath: 'existing-doc.md',
      category: 'test',
      displayOrder: 0,
      cells: {},
    };

    // Create the overview file
    fs.writeFile('/test/repo/existing-doc.md', '# Existing Doc\n');
    
    // Save the view
    palace.saveView(testView);

    const suggestions = await autoFix.analyze();

    expect(suggestions).toHaveLength(0);
  });

  test('should create missing overview files', async () => {
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'A test view',
      overviewPath: 'docs/test-view.md',
      category: 'test',
      displayOrder: 0,
      cells: {
        'main': {
          coordinates: [0, 0],
          files: ['src/main.ts'],
        },
      },
    };

    palace.saveView(testView);

    const suggestions = await autoFix.analyze();
    const result = await suggestions[0].apply();

    expect(result.success).toBe(true);
    expect(result.status).toBe('applied');
    
    // Check that the file was created
    expect(fs.exists('/test/repo/docs/test-view.md')).toBe(true);
    
    const content = fs.readFile('/test/repo/docs/test-view.md');
    expect(content).toContain('# Test View');
    expect(content).toContain('A test view');
  });

  test('should suggest consolidation when enabled', async () => {
    const consolidatingAutoFix = new OverviewPathAutoFix(palace, {
      consolidateDocs: true,
      preferredOverviewDir: 'docs/views',
    });

    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'A test view',
      overviewPath: 'README.md',
      category: 'test',
      displayOrder: 0,
      cells: {},
    };

    // Create the existing file
    fs.writeFile('/test/repo/README.md', '# Test View\n');
    
    palace.saveView(testView);

    const suggestions = await consolidatingAutoFix.analyze();

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].issue.type).toBe('misplaced_overview_file');
    expect(suggestions[0].issue.severity).toBe('moderate');
  });

  test('should generate proper overview content', async () => {
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'A comprehensive test view',
      overviewPath: 'docs/test-view.md',
      category: 'test',
      displayOrder: 0,
      cells: {
        'main': {
          coordinates: [0, 0],
          files: ['src/main.ts', 'src/utils.ts'],
        },
        'tests': {
          coordinates: [0, 1],
          files: ['tests/main.test.ts'],
        },
      },
      links: {
        'related-view': 'Related functionality',
      },
    };

    palace.saveView(testView);

    const suggestions = await autoFix.analyze();
    await suggestions[0].apply();

    const content = fs.readFile('/test/repo/docs/test-view.md');
    
    expect(content).toContain('# Test View');
    expect(content).toContain('A comprehensive test view');
    expect(content).toContain('**main** (2 files): Located at [0, 0]');
    expect(content).toContain('**tests** (1 files): Located at [0, 1]');
    expect(content).toContain('- [Related functionality](related-view)');
    expect(content).toContain('Generated on');
  });

  test('should apply all safe fixes', async () => {
    const view1: CodebaseView = {
      id: 'view-1',
      version: '1.0.0',
      name: 'View 1',
      description: 'First test view',
      overviewPath: 'missing-1.md',
      category: 'test',
      displayOrder: 0,
      cells: {},
    };

    const view2: CodebaseView = {
      id: 'view-2',
      version: '1.0.0',
      name: 'View 2',
      description: 'Second test view',
      overviewPath: 'missing-2.md',
      category: 'test',
      displayOrder: 1,
      cells: {},
    };

    palace.saveView(view1);
    palace.saveView(view2);

    const results = await autoFix.applyAllSafe();

    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
    expect(results.every(r => r.status === 'applied')).toBe(true);
    
    // Check that both files were created
    expect(fs.exists('/test/repo/missing-1.md')).toBe(true);
    expect(fs.exists('/test/repo/missing-2.md')).toBe(true);
  });
});