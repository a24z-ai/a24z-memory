/**
 * Tests for the list-untracked-docs command
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { MemoryPalace } from '../../../src/MemoryPalace';
import { NodeFileSystemAdapter } from '../../../src/node-adapters/NodeFileSystemAdapter';
import { createListUntrackedDocsCommand } from '../../../src/cli-alexandria/commands/list-untracked-docs';
import type { CodebaseView } from '../../../src/pure-core/types';

describe('CLI - list-untracked-docs command', () => {
  let tempDir: string;
  let originalCwd: string;
  let fsAdapter: NodeFileSystemAdapter;
  let palace: MemoryPalace;

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd();

    // Create a temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    // Initialize it as a git repo
    execSync('git init', { cwd: tempDir });

    // Change to temp directory
    process.chdir(tempDir);

    // Create MemoryPalace instance
    fsAdapter = new NodeFileSystemAdapter();
    palace = new MemoryPalace(tempDir, fsAdapter);
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should list untracked markdown files', async () => {
    // Create some markdown files
    fs.writeFileSync('README.md', '# Test Readme');
    fs.writeFileSync('CHANGELOG.md', '# Changelog');
    fs.mkdirSync('docs', { recursive: true });
    fs.writeFileSync('docs/guide.md', '# Guide');
    fs.writeFileSync('docs/api.md', '# API');

    // Create a markdown file that will be part of a CodebaseView
    fs.writeFileSync('docs/architecture.md', '# Architecture');

    // Create a view that references one of the markdown files
    const view: CodebaseView = {
      id: 'test-view',
      name: 'Test View',
      description: 'Test view with markdown overview',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      overviewPath: 'docs/architecture.md',
      category: 'guide',
      cells: {
        cell1: {
          coordinates: [0, 0],
          files: ['src/index.ts'],
        },
      },
    };

    palace.saveView(view);

    // Capture console output
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (...args) => output.push(args.join(' '));

    // Create and execute the command
    const command = createListUntrackedDocsCommand();
    await command.parseAsync(['node', 'test']);

    // Restore console.log
    console.log = originalLog;

    // Verify output
    const fullOutput = output.join('\n');
    expect(fullOutput).toContain('Found 4 untracked markdown documents');
    expect(fullOutput).toContain('README.md');
    expect(fullOutput).toContain('CHANGELOG.md');
    expect(fullOutput).toContain('guide.md');
    expect(fullOutput).toContain('api.md');
    // architecture.md should NOT be in the list as it's part of a CodebaseView
    expect(fullOutput).not.toContain('architecture.md');
  });

  it('should exclude files in .alexandria directory', async () => {
    // Create markdown files
    fs.writeFileSync('README.md', '# Test Readme');

    // Create markdown files in .alexandria directory
    fs.mkdirSync('.alexandria', { recursive: true });
    fs.writeFileSync('.alexandria/internal.md', '# Internal');
    fs.mkdirSync('.alexandria/notes', { recursive: true });
    fs.writeFileSync('.alexandria/notes/note1.md', '# Note 1');

    // Capture console output
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (...args) => output.push(args.join(' '));

    // Create and execute the command
    const command = createListUntrackedDocsCommand();
    await command.parseAsync(['node', 'test']);

    // Restore console.log
    console.log = originalLog;

    // Verify output
    const fullOutput = output.join('\n');
    expect(fullOutput).toContain('Found 1 untracked markdown document');
    expect(fullOutput).toContain('README.md');
    // Files in .alexandria should NOT be in the list
    expect(fullOutput).not.toContain('internal.md');
    expect(fullOutput).not.toContain('note1.md');
  });

  it('should respect gitignore', async () => {
    // Create gitignore file
    fs.writeFileSync('.gitignore', 'node_modules/\nbuild/\n*.tmp.md\n');

    // Create markdown files
    fs.writeFileSync('README.md', '# Test Readme');
    fs.writeFileSync('test.tmp.md', '# Temp file');

    fs.mkdirSync('build', { recursive: true });
    fs.writeFileSync('build/output.md', '# Build output');

    fs.mkdirSync('node_modules', { recursive: true });
    fs.writeFileSync('node_modules/package.md', '# Package doc');

    // Capture console output
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (...args) => output.push(args.join(' '));

    // Create and execute the command
    const command = createListUntrackedDocsCommand();
    await command.parseAsync(['node', 'test']);

    // Restore console.log
    console.log = originalLog;

    // Verify output
    const fullOutput = output.join('\n');
    expect(fullOutput).toContain('Found 1 untracked markdown document');
    expect(fullOutput).toContain('README.md');
    // Ignored files should NOT be in the list
    expect(fullOutput).not.toContain('test.tmp.md');
    expect(fullOutput).not.toContain('output.md');
    expect(fullOutput).not.toContain('package.md');
  });

  it('should show verbose output with statistics', async () => {
    // Create markdown files
    fs.writeFileSync('README.md', '# Test Readme');
    fs.writeFileSync('CHANGELOG.md', '# Changelog');

    // Create a view with a markdown overview
    fs.writeFileSync('overview.md', '# Overview');
    const view: CodebaseView = {
      id: 'test-view',
      name: 'Test View',
      description: 'Test',
      version: '1.0.0',
      overviewPath: 'overview.md',
      category: 'guide',
      cells: {},
    };
    palace.saveView(view);

    // Capture console output
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (...args) => output.push(args.join(' '));

    // Create and execute the command with verbose flag
    const command = createListUntrackedDocsCommand();
    await command.parseAsync(['node', 'test', '--verbose']);

    // Restore console.log
    console.log = originalLog;

    // Verify verbose output
    const fullOutput = output.join('\n');
    expect(fullOutput).toContain('Summary:');
    expect(fullOutput).toContain('Total markdown files found: 3');
    expect(fullOutput).toContain('Files in CodebaseViews: 1');
    expect(fullOutput).toContain('Untracked markdown files: 2');
  });

  it('should handle when no untracked docs exist', async () => {
    // Create only tracked markdown files
    fs.writeFileSync('overview.md', '# Overview');
    const view: CodebaseView = {
      id: 'test-view',
      name: 'Test View',
      description: 'Test',
      version: '1.0.0',
      overviewPath: 'overview.md',
      category: 'guide',
      cells: {},
    };
    palace.saveView(view);

    // Capture console output
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (...args) => output.push(args.join(' '));

    // Create and execute the command
    const command = createListUntrackedDocsCommand();
    await command.parseAsync(['node', 'test']);

    // Restore console.log
    console.log = originalLog;

    // Verify output
    const fullOutput = output.join('\n');
    expect(fullOutput).toContain('No untracked markdown documents found');
  });

  it('should support different markdown extensions', async () => {
    // Create files with different markdown extensions
    fs.writeFileSync('standard.md', '# Standard');
    fs.writeFileSync('alternate.markdown', '# Alternate');
    fs.writeFileSync('mdx-file.mdx', '# MDX');
    fs.writeFileSync('not-markdown.txt', 'Not markdown');

    // Capture console output
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (...args) => output.push(args.join(' '));

    // Create and execute the command
    const command = createListUntrackedDocsCommand();
    await command.parseAsync(['node', 'test']);

    // Restore console.log
    console.log = originalLog;

    // Verify output
    const fullOutput = output.join('\n');
    expect(fullOutput).toContain('Found 3 untracked markdown documents');
    expect(fullOutput).toContain('standard.md');
    expect(fullOutput).toContain('alternate.markdown');
    expect(fullOutput).toContain('mdx-file.mdx');
    // Non-markdown files should NOT be in the list
    expect(fullOutput).not.toContain('not-markdown.txt');
  });

  it('should group files by directory', async () => {
    // Create markdown files in different directories
    fs.writeFileSync('README.md', '# Readme');

    fs.mkdirSync('docs', { recursive: true });
    fs.writeFileSync('docs/guide.md', '# Guide');
    fs.writeFileSync('docs/api.md', '# API');

    fs.mkdirSync('src/components', { recursive: true });
    fs.writeFileSync('src/components/Button.md', '# Button');

    // Capture console output
    const originalLog = console.log;
    const output: string[] = [];
    console.log = (...args) => output.push(args.join(' '));

    // Create and execute the command
    const command = createListUntrackedDocsCommand();
    await command.parseAsync(['node', 'test']);

    // Restore console.log
    console.log = originalLog;

    // Verify output shows grouped structure
    const fullOutput = output.join('\n');
    expect(fullOutput).toContain('Root directory/');
    expect(fullOutput).toContain('docs/');
    expect(fullOutput).toContain('src/components/');
    expect(fullOutput).toContain('  - README.md');
    expect(fullOutput).toContain('  - guide.md');
    expect(fullOutput).toContain('  - api.md');
    expect(fullOutput).toContain('  - Button.md');
  });

  it('should error when not in a git repository', async () => {
    // Create a non-git directory
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-git-'));
    process.chdir(nonGitDir);

    // Capture console output
    const originalError = console.error;
    const originalExit = process.exit;
    const errors: string[] = [];
    let exitCode: number | undefined;

    console.error = (...args) => errors.push(args.join(' '));
    process.exit = ((code?: string | number) => {
      exitCode = typeof code === 'number' ? code : 1;
      return undefined as never;
    }) as typeof process.exit;

    // Create and execute the command
    const command = createListUntrackedDocsCommand();
    await command.parseAsync(['node', 'test']);

    // Restore console methods
    console.error = originalError;
    process.exit = originalExit;

    // Clean up
    process.chdir(originalCwd);
    fs.rmSync(nonGitDir, { recursive: true, force: true });

    // Verify error output
    expect(errors.join('\n')).toContain('Not in a git repository');
    expect(exitCode).toBe(1);
  });
});
