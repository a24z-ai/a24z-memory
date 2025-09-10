/**
 * List command - Display all codebase views in the repository
 */

import { Command } from 'commander';
import * as path from 'node:path';
import { createMemoryPalace, getRepositoryRoot } from '../utils/repository.js';
import { ALEXANDRIA_DIRS } from '../../constants/paths';

export function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('List all codebase views in the current repository')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .action((options) => {
      try {
        const palace = createMemoryPalace(options.path);
        const repoPath = getRepositoryRoot(options.path);

        // Get all views using the MemoryPalace API
        const views = palace.listViews();

        if (views.length === 0) {
          console.log('No codebase views found in this repository.');
          console.log(
            `Views would be stored in: ${path.join(repoPath, ALEXANDRIA_DIRS.PRIMARY, ALEXANDRIA_DIRS.VIEWS)}/`
          );
          return;
        }

        console.log(`Found ${views.length} codebase view${views.length === 1 ? '' : 's'}:\n`);

        views.forEach((view, index) => {
          console.log(`${index + 1}. ${view.name} (${view.id})`);
          if (view.description) {
            console.log(`   ${view.description}`);
          }
          console.log(
            `   Created: ${view.timestamp ? new Date(view.timestamp).toLocaleDateString() : 'Unknown'}`
          );
          console.log(`   Cells: ${Object.keys(view.cells).length}`);
          console.log('');
        });
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
