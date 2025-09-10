/**
 * List untracked documents command - Display markdown files not part of any CodebaseView
 */

import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { globby } from 'globby';
import ignore from 'ignore';
import { createMemoryPalace, getRepositoryRoot } from '../utils/repository.js';
import { ALEXANDRIA_DIRS } from '../../constants/paths';

export function createListUntrackedDocsCommand(): Command {
  const command = new Command('list-untracked-docs');

  command
    .description('List all markdown documents not part of any CodebaseView')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('-v, --verbose', 'Show verbose output including reasons for exclusion')
    .action(async (options) => {
      try {
        const palace = createMemoryPalace(options.path);
        const repoPath = getRepositoryRoot(options.path);

        // Load gitignore
        const gitignorePath = path.join(repoPath, '.gitignore');
        let ig = ignore();
        if (fs.existsSync(gitignorePath)) {
          const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
          ig = ig.add(gitignoreContent);
        }

        // Find all markdown files in the repository
        const allMarkdownFiles = await globby(['**/*.md', '**/*.markdown', '**/*.mdx'], {
          cwd: repoPath,
          gitignore: true,
          absolute: false,
          onlyFiles: true,
        });

        // Filter out files that are gitignored
        const gitFilteredFiles = allMarkdownFiles.filter((file) => !ig.ignores(file));

        // Filter out files in alexandria directory
        const nonAlexandriaFiles = gitFilteredFiles.filter(
          (file) => !file.startsWith(`${ALEXANDRIA_DIRS.PRIMARY}/`)
        );

        // Get all views and collect their overview paths
        const views = palace.listViews();
        const overviewPaths = new Set<string>();

        views.forEach((view) => {
          if (view.overviewPath) {
            // Normalize the path (remove leading ./ if present)
            const normalizedPath = view.overviewPath.replace(/^\.\//, '');
            overviewPaths.add(normalizedPath);
          }
        });

        // Filter out files that are part of CodebaseViews
        const untrackedFiles = nonAlexandriaFiles.filter((file) => !overviewPaths.has(file));

        // Sort files by directory for better organization
        untrackedFiles.sort((a, b) => {
          const dirA = path.dirname(a);
          const dirB = path.dirname(b);
          if (dirA !== dirB) {
            return dirA.localeCompare(dirB);
          }
          return a.localeCompare(b);
        });

        // Display results
        if (untrackedFiles.length === 0) {
          console.log('No untracked markdown documents found.');
          if (options.verbose) {
            console.log(`\nSummary:`);
            console.log(`  Total markdown files found: ${nonAlexandriaFiles.length}`);
            console.log(`  Files in CodebaseViews: ${overviewPaths.size}`);
            console.log(`  Untracked markdown files: 0`);
          }
          return;
        }

        console.log(
          `Found ${untrackedFiles.length} untracked markdown document${untrackedFiles.length === 1 ? '' : 's'}:\n`
        );

        // Group files by directory
        const filesByDir = new Map<string, string[]>();
        untrackedFiles.forEach((file) => {
          const dir = path.dirname(file);
          if (!filesByDir.has(dir)) {
            filesByDir.set(dir, []);
          }
          filesByDir.get(dir)!.push(path.basename(file));
        });

        // Display grouped files
        filesByDir.forEach((files, dir) => {
          const displayDir = dir === '.' ? 'Root directory' : dir;
          console.log(`${displayDir}/`);
          files.forEach((file) => {
            console.log(`  - ${file}`);
          });
        });

        if (options.verbose) {
          console.log(`\nSummary:`);
          console.log(`  Total markdown files found: ${nonAlexandriaFiles.length}`);
          console.log(`  Files in CodebaseViews: ${overviewPaths.size}`);
          console.log(`  Untracked markdown files: ${untrackedFiles.length}`);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
