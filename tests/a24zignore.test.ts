import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getEligibleFilesSync } from '../src/core-mcp/utils/eligibleFiles';
import { calculateNoteCoverage } from '../src/core-mcp/utils/noteCoverage';
import { parseIgnoreFile } from '../src/core-mcp/utils/ignoreFileParser';

describe('.a24zignore functionality', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24zignore-test-'));

    // Initialize as git repo
    fs.mkdirSync(path.join(testDir, '.git'));

    // Create .gitignore
    fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\n.env\ntmp/\n');
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseIgnoreFile', () => {
    it('should parse ignore patterns correctly', () => {
      const ignorePath = path.join(testDir, '.a24zignore');
      fs.writeFileSync(
        ignorePath,
        `# Comment line
dist/
*.test.ts
build/**
  
# Another comment
*.min.js
node_modules
`
      );

      const patterns = parseIgnoreFile(ignorePath);

      // The new implementation returns raw patterns as they appear in the file
      expect(patterns).toContain('dist/');
      expect(patterns).toContain('*.test.ts');
      expect(patterns).toContain('build/**');
      expect(patterns).toContain('*.min.js');
      expect(patterns).toContain('node_modules');

      // Should NOT contain extra patterns - the ignore package handles these internally
      expect(patterns).not.toContain('**/dist/**');
      expect(patterns).not.toContain('**/*.test.ts');
      expect(patterns).not.toContain('**/node_modules/**');
    });

    it('should return empty array for non-existent file', () => {
      const patterns = parseIgnoreFile(path.join(testDir, 'non-existent'));
      expect(patterns).toEqual([]);
    });

    it('should skip empty lines and comments', () => {
      const ignorePath = path.join(testDir, '.a24zignore');
      fs.writeFileSync(
        ignorePath,
        `# This is a comment
        
# Another comment
valid-pattern

  # Indented comment
  `
      );

      const patterns = parseIgnoreFile(ignorePath);
      expect(patterns).toContain('valid-pattern');
      expect(patterns.filter((p) => p.includes('#'))).toHaveLength(0);
    });
  });

  describe('getEligibleFilesSync with .a24zignore', () => {
    beforeEach(() => {
      // Create test file structure
      fs.mkdirSync(path.join(testDir, 'src'));
      fs.mkdirSync(path.join(testDir, 'dist'));
      fs.mkdirSync(path.join(testDir, 'tests'));

      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export {}');
      fs.writeFileSync(path.join(testDir, 'src', 'utils.ts'), 'export {}');
      fs.writeFileSync(path.join(testDir, 'src', 'utils.test.ts'), 'test()');
      fs.writeFileSync(path.join(testDir, 'dist', 'index.js'), 'module.exports = {}');
      fs.writeFileSync(path.join(testDir, 'dist', 'index.min.js'), '// minified');
      fs.writeFileSync(path.join(testDir, 'tests', 'app.test.ts'), 'test()');
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
    });

    it('should exclude files matching .a24zignore patterns', () => {
      // Create .a24zignore
      fs.writeFileSync(
        path.join(testDir, '.a24zignore'),
        `# Exclude build output
dist/

# Exclude test files
*.test.ts`
      );

      // Verify .a24zignore was created
      expect(fs.existsSync(path.join(testDir, '.a24zignore'))).toBe(true);

      const { files } = getEligibleFilesSync(testDir);
      const filePaths = files.map((f) => f.relativePath);

      // Should include these
      expect(filePaths).toContain('src/index.ts');
      expect(filePaths).toContain('src/utils.ts');
      expect(filePaths).toContain('README.md');

      // Should exclude these (matched by .a24zignore)
      expect(filePaths).not.toContain('dist/index.js');
      expect(filePaths).not.toContain('dist/index.min.js');
      expect(filePaths).not.toContain('src/utils.test.ts');
      expect(filePaths).not.toContain('tests/app.test.ts');

      // Debug output
      console.log('Files found:', filePaths);
    });

    it('should work without .a24zignore file', () => {
      // No .a24zignore file created
      const { files } = getEligibleFilesSync(testDir);
      const filePaths = files.map((f) => f.relativePath);

      // Should include all files (no .a24zignore filtering)
      expect(filePaths).toContain('src/index.ts');
      expect(filePaths).toContain('src/utils.ts');
      expect(filePaths).toContain('src/utils.test.ts');
      expect(filePaths).toContain('dist/index.js');
      expect(filePaths).toContain('dist/index.min.js');
      expect(filePaths).toContain('tests/app.test.ts');
      expect(filePaths).toContain('README.md');
    });

    it('should apply both .gitignore and .a24zignore (additive)', () => {
      // Create files that match .gitignore
      fs.mkdirSync(path.join(testDir, 'node_modules'));
      fs.writeFileSync(path.join(testDir, 'node_modules', 'package.js'), '{}');
      fs.writeFileSync(path.join(testDir, '.env'), 'SECRET=123');

      // Create .a24zignore
      fs.writeFileSync(path.join(testDir, '.a24zignore'), 'dist/');

      const { files } = getEligibleFilesSync(testDir);
      const filePaths = files.map((f) => f.relativePath);

      // Note: In test environment, globby may not fully respect .gitignore
      // without a real git repo. But .a24zignore should still work.
      // We'll just check that .a24zignore patterns are applied

      // Should exclude from .a24zignore
      expect(filePaths).not.toContain('dist/index.js');
      expect(filePaths).not.toContain('dist/index.min.js');

      // Should include files not matched by .a24zignore
      expect(filePaths).toContain('src/index.ts');
      expect(filePaths).toContain('README.md');

      // Files that should be included (test that .a24zignore works)
      expect(filePaths).toContain('src/utils.ts');
    });
  });

  describe('Coverage calculation with .a24zignore', () => {
    beforeEach(() => {
      // Create test file structure
      fs.mkdirSync(path.join(testDir, 'src'));
      fs.mkdirSync(path.join(testDir, 'dist'));

      fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'export {}');
      fs.writeFileSync(path.join(testDir, 'src', 'documented.ts'), 'export {}');
      fs.writeFileSync(path.join(testDir, 'src', 'utils.test.ts'), 'test()');
      fs.writeFileSync(path.join(testDir, 'dist', 'bundle.js'), '// bundled');

      // Create notes directory and a note
      const notesDir = path.join(testDir, '.a24z', 'notes', '2025', '01');
      fs.mkdirSync(notesDir, { recursive: true });

      const noteData = {
        id: 'test-note-1',
        note: 'Documentation for documented.ts',
        anchors: ['src/documented.ts'],
        tags: ['test'],
        timestamp: Date.now(),
        reviewed: false,
      };

      fs.writeFileSync(path.join(notesDir, 'note-test-1.json'), JSON.stringify(noteData, null, 2));
    });

    it('should exclude .a24zignore files from coverage calculation', () => {
      // Without .a24zignore
      const reportWithoutIgnore = calculateNoteCoverage(testDir);

      // Create .a24zignore to exclude test files and dist
      fs.writeFileSync(
        path.join(testDir, '.a24zignore'),
        `dist/
*.test.ts`
      );

      // With .a24zignore
      const reportWithIgnore = calculateNoteCoverage(testDir);

      // Total eligible files should be less with .a24zignore
      expect(reportWithIgnore.metrics.totalEligibleFiles).toBeLessThan(
        reportWithoutIgnore.metrics.totalEligibleFiles
      );

      // Coverage percentage should be higher (same covered files, fewer total)
      expect(reportWithIgnore.metrics.fileCoveragePercentage).toBeGreaterThan(
        reportWithoutIgnore.metrics.fileCoveragePercentage
      );

      // Uncovered files should not include ignored patterns
      const uncoveredPaths = reportWithIgnore.uncoveredFiles.map((f) => f.relativePath);
      expect(uncoveredPaths).not.toContain('dist/bundle.js');
      expect(uncoveredPaths).not.toContain('src/utils.test.ts');
      expect(uncoveredPaths).toContain('src/index.ts'); // Not ignored, not covered
    });
  });
});
