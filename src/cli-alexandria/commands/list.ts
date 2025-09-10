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
    .option('-c, --category <category>', 'Filter by category (e.g., product, documentation, etc.)')
    .action((options) => {
      try {
        const palace = createMemoryPalace(options.path);
        const repoPath = getRepositoryRoot(options.path);

        // Get all views using the MemoryPalace API
        let views = palace.listViews();

        // Filter by category if specified
        if (options.category) {
          views = views.filter((view) => view.category === options.category);
        }

        // Sort by displayOrder if present, otherwise by name
        views.sort((a, b) => {
          if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
            return a.displayOrder - b.displayOrder;
          }
          if (a.displayOrder !== undefined) return -1;
          if (b.displayOrder !== undefined) return 1;
          return (a.name || a.id).localeCompare(b.name || b.id);
        });

        if (views.length === 0) {
          if (options.category) {
            console.log(`No codebase views found in category '${options.category}'.`);
          } else {
            console.log('No codebase views found in this repository.');
          }
          console.log(
            `Views would be stored in: ${path.join(repoPath, ALEXANDRIA_DIRS.PRIMARY, ALEXANDRIA_DIRS.VIEWS)}/`
          );
          return;
        }

        const categoryLabel = options.category ? ` in category '${options.category}'` : '';
        console.log(
          `Found ${views.length} codebase view${views.length === 1 ? '' : 's'}${categoryLabel}:\n`
        );

        views.forEach((view, index) => {
          const displayOrder =
            view.displayOrder !== undefined ? ` [order: ${view.displayOrder}]` : '';
          const category = view.category ? ` (${view.category})` : '';
          console.log(`${index + 1}. ${view.name} (${view.id})${category}${displayOrder}`);
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
