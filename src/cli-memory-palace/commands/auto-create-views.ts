/**
 * Auto-create views command - Create codebase views from all untracked documentation
 */

import { Command } from 'commander';
import { getRepositoryRoot } from '../utils/repository.js';
import {
  findUntrackedDocuments,
  createViewsFromDocuments,
  getViewCreationStats,
  type ViewCreationOptions,
} from '../utils/viewCreation.js';

export function createAutoCreateViewsCommand(): Command {
  const command = new Command('auto-create-views');

  command
    .description('Automatically create codebase views from all untracked documentation')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('--dry-run', 'Show what would be created without actually creating views')
    .option('--category <category>', 'Category to assign to created views (default: "docs")')
    .option('--skip-validation', 'Skip validation during view creation')
    .option('--quiet', 'Suppress detailed output, show only summary')
    .action(async (options) => {
      try {
        const repoPath = getRepositoryRoot(options.path);

        // Find all untracked documentation files
        const untrackedDocs = await findUntrackedDocuments(repoPath);

        if (untrackedDocs.length === 0) {
          console.log(
            'No untracked markdown documents found. All documentation is already part of CodebaseViews.'
          );
          return;
        }

        console.log(
          `Found ${untrackedDocs.length} untracked documentation file${untrackedDocs.length === 1 ? '' : 's'}`
        );

        if (options.dryRun) {
          console.log('\n🔍 DRY RUN - Views that would be created:');
        } else {
          console.log('\n📚 Creating codebase views from documentation...');
        }

        // Create views from documents
        const viewOptions: ViewCreationOptions = {
          category: options.category || 'docs',
          skipValidation: options.skipValidation,
          dryRun: options.dryRun,
        };

        const results = await createViewsFromDocuments(repoPath, untrackedDocs, viewOptions);
        const stats = getViewCreationStats(results);

        // Show individual results (unless quiet)
        if (!options.quiet) {
          results.forEach((result) => {
            if (result.success) {
              const cellCount = result.view ? Object.keys(result.view.cells).length : 0;
              const fileCount = result.view
                ? Object.values(result.view.cells).reduce((sum, cell) => sum + cell.files.length, 0)
                : 0;

              console.log(`\n  ${options.dryRun ? '📄' : '✅'} ${result.file}`);
              console.log(`     → View: "${result.viewName}" (${result.viewId})`);

              if (result.view) {
                console.log(
                  `     → Grid: ${result.view.rows}×${result.view.cols}, ${cellCount} cells, ${fileCount} files`
                );
              }

              if (result.issues && result.issues > 0) {
                console.log(`     ⚠️  ${result.issues} validation issues`);
              }
            } else {
              console.log(`\n  ❌ ${result.file}: ${result.error}`);
            }
          });
        }

        // Print summary
        console.log(`\n📊 Summary:`);
        console.log(
          `   ${stats.successful} view${stats.successful === 1 ? '' : 's'} ${options.dryRun ? 'would be created' : 'created'} successfully`
        );

        if (stats.failed > 0) {
          console.log(`   ${stats.failed} file${stats.failed === 1 ? '' : 's'} failed`);
        }

        if (!options.skipValidation && stats.totalIssues > 0) {
          console.log(
            `   ${stats.totalIssues} total validation issue${stats.totalIssues === 1 ? '' : 's'} found`
          );
        }

        if (stats.successful > 0) {
          console.log(`   ${stats.totalCells} total cells created`);
          console.log(`   ${stats.totalFiles} total files referenced`);
        }

        // Show failures if any and not quiet
        if (stats.failed > 0 && !options.quiet) {
          console.log(`\n❌ Failed files:`);
          stats.failures.forEach((failure) => {
            console.log(`   ${failure.file}: ${failure.error}`);
          });
        }

        // Next steps
        if (!options.dryRun && stats.successful > 0) {
          console.log(`\n💡 Next steps:`);
          console.log(`   - Review created views: memory-palace list`);
          console.log(`   - Validate all views: memory-palace validate-all`);
          console.log(`   - Edit view configurations in .a24z/views/ as needed`);

          if (stats.totalIssues > 0) {
            console.log(`   - Address validation issues by updating documentation or view files`);
          }
        }

        // Exit with error code if there were failures
        if (stats.failed > 0) {
          process.exit(1);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
