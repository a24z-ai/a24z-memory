/**
 * Fix overview paths command - Automatically fix CodebaseView overview document issues
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createMemoryPalace, getRepositoryRoot } from '../utils/repository.js';
import { OverviewPathAutoFix } from '../../pure-core/autofixes/OverviewPathAutoFix.js';

export function createFixOverviewPathsCommand(): Command {
  const command = new Command('fix-overview-paths');

  command
    .description('Automatically fix CodebaseView overview document path issues')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('--preferred-dir <dir>', 'Preferred directory for overview docs', 'docs/views')
    .option('--exclude <patterns...>', 'Patterns to exclude from auto-fix')
    .option('--no-create-missing', 'Do not create missing overview files')
    .option('--consolidate', 'Consolidate all overview docs to preferred directory')
    .option('--dry-run', 'Preview changes without applying them')
    .option('--apply-safe', 'Apply all safe fixes automatically')
    .action(async (options) => {
      try {
        const palace = createMemoryPalace(options.path);
        const repoPath = getRepositoryRoot(options.path);

        console.log(chalk.blue(`Analyzing CodebaseView overview paths in ${repoPath}...\n`));

        // Create auto-fix provider
        const autoFix = new OverviewPathAutoFix(palace, {
          preferredOverviewDir: options.preferredDir,
          excludePatterns: options.exclude,
          createMissing: options.createMissing !== false,
          consolidateDocs: options.consolidate === true,
        });

        // Analyze for issues
        const suggestions = await autoFix.analyze();

        if (suggestions.length === 0) {
          console.log(chalk.green('✓ No overview path issues found!'));
          return;
        }

        // Group suggestions by severity
        const safeSuggestions = suggestions.filter((s) => s.issue.severity === 'safe');
        const moderateSuggestions = suggestions.filter((s) => s.issue.severity === 'moderate');
        const dangerousSuggestions = suggestions.filter((s) => s.issue.severity === 'dangerous');

        console.log(chalk.yellow(`Found ${suggestions.length} issue(s):\n`));

        // Display issues by severity
        if (safeSuggestions.length > 0) {
          console.log(chalk.green(`Safe fixes (${safeSuggestions.length}):`));
          safeSuggestions.forEach((s) => {
            console.log(`  - ${s.issue.description}`);
            console.log(`    Location: ${s.issue.location}`);
            console.log(`    Action: ${s.action}`);
          });
          console.log();
        }

        if (moderateSuggestions.length > 0) {
          console.log(chalk.yellow(`Moderate fixes (${moderateSuggestions.length}):`));
          moderateSuggestions.forEach((s) => {
            console.log(`  - ${s.issue.description}`);
            console.log(`    Location: ${s.issue.location}`);
            console.log(`    Action: ${s.action}`);
          });
          console.log();
        }

        if (dangerousSuggestions.length > 0) {
          console.log(chalk.red(`Dangerous fixes (${dangerousSuggestions.length}):`));
          dangerousSuggestions.forEach((s) => {
            console.log(`  - ${s.issue.description}`);
            console.log(`    Location: ${s.issue.location}`);
            console.log(`    Action: ${s.action}`);
          });
          console.log();
        }

        // Handle dry-run mode
        if (options.dryRun) {
          console.log(chalk.blue('\nDry-run mode - no changes applied.'));
          console.log('To apply fixes, run without --dry-run flag.');
          return;
        }

        // Handle apply-safe mode
        if (options.applySafe) {
          if (safeSuggestions.length === 0) {
            console.log(chalk.yellow('No safe fixes to apply.'));
            return;
          }

          console.log(chalk.blue(`\nApplying ${safeSuggestions.length} safe fix(es)...\n`));

          const results = await autoFix.applyAllSafe();
          let successCount = 0;
          let failureCount = 0;

          results.forEach((result, index) => {
            if (result.success) {
              console.log(chalk.green(`✓ ${result.message}`));
              successCount++;
            } else {
              console.log(chalk.red(`✗ ${result.message}`));
              if (result.error) {
                console.log(chalk.gray(`  Error: ${result.error}`));
              }
              failureCount++;
            }
          });

          console.log();
          console.log(
            chalk.blue(
              `Summary: ${successCount} succeeded, ${failureCount} failed`
            )
          );
        } else {
          // Interactive mode (future enhancement)
          console.log(chalk.blue('\nTo apply fixes:'));
          console.log('  - Use --apply-safe to apply all safe fixes');
          console.log('  - Use --dry-run to preview changes');
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}