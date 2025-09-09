/**
 * Validate-all command - Validate all codebase views in the repository
 */

import { Command } from 'commander';
import { getRepositoryRoot } from '../utils/repository.js';
import { formatValidationResult, formatValidationSummary } from '../utils/formatting.js';
import { validateAllViews, validateSpecificViews, getViewsByStatus } from '../utils/validation.js';

export function createValidateAllCommand(): Command {
  const command = new Command('validate-all');

  command
    .description('Validate all codebase views in the repository')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('--summary', 'Show only validation summary without detailed issues')
    .option('--errors-only', 'Show only views with errors (not warnings)')
    .option('--issues-only', 'Show only views that have validation issues')
    .option('--status', 'Group views by validation status')
    .option('--views <views...>', 'Validate only specific views (by ID or name)')
    .action(async (options) => {
      try {
        const repoPath = getRepositoryRoot(options.path);

        // Determine which views to validate
        const summary =
          options.views && options.views.length > 0
            ? validateSpecificViews(repoPath, options.views)
            : validateAllViews(repoPath);

        if (summary.totalViews === 0) {
          console.log('No codebase views found in repository.');
          return;
        }

        // Show status grouping if requested
        if (options.status) {
          const statusGroups = getViewsByStatus(repoPath);

          console.log(`📊 Validation Status Summary:`);
          console.log(`   ✅ Valid (no issues): ${statusGroups.valid.length}`);
          console.log(`   ⚠️  Valid (with warnings): ${statusGroups.validWithWarnings.length}`);
          console.log(`   ❌ Invalid (has errors): ${statusGroups.invalid.length}`);
          console.log(`   📊 Total: ${summary.totalViews} views`);

          if (statusGroups.valid.length > 0) {
            console.log(`\n✅ Valid Views:`);
            statusGroups.valid.forEach((result) => {
              console.log(`   ${result.viewName} (${result.viewId})`);
            });
          }

          if (statusGroups.validWithWarnings.length > 0) {
            console.log(`\n⚠️  Valid Views with Warnings:`);
            statusGroups.validWithWarnings.forEach((result) => {
              const warningCount = result.validationResult.summary.warnings;
              const infoCount = result.validationResult.summary.info;
              console.log(
                `   ${result.viewName} (${result.viewId}) - ${warningCount} warnings, ${infoCount} info`
              );
            });
          }

          if (statusGroups.invalid.length > 0) {
            console.log(`\n❌ Invalid Views:`);
            statusGroups.invalid.forEach((result) => {
              const errorCount = result.validationResult.summary.errors;
              console.log(`   ${result.viewName} (${result.viewId}) - ${errorCount} errors`);
            });
          }

          return;
        }

        // Filter results based on options
        let resultsToShow = summary.results;

        if (options.errorsOnly) {
          resultsToShow = summary.results.filter(
            (r) => !r.success || r.validationResult.summary.errors > 0
          );
        } else if (options.issuesOnly) {
          resultsToShow = summary.results.filter(
            (r) => !r.success || r.validationResult.issues.length > 0
          );
        }

        console.log(
          `Validating ${summary.totalViews} codebase view${summary.totalViews === 1 ? '' : 's'}...\n`
        );

        // Show individual results
        if (options.summary) {
          // Summary mode - just show status for each view
          resultsToShow.forEach((result) => {
            if (result.error) {
              console.log(`❌ ${result.viewName} (${result.viewId}): ${result.error}`);
            } else if (result.success) {
              const summaryText = formatValidationSummary(result.validationResult);
              if (result.validationResult.issues.length === 0) {
                console.log(`✅ ${result.viewName} (${result.viewId}): ${summaryText}`);
              } else {
                console.log(`⚠️  ${result.viewName} (${result.viewId}): ${summaryText}`);
              }
            } else {
              console.log(`❌ ${result.viewName} (${result.viewId}): Validation failed`);
            }
          });
        } else {
          // Detailed mode - show issues for each view
          resultsToShow.forEach((result) => {
            console.log(`📋 ${result.viewName} (${result.viewId}):`);

            if (result.error) {
              console.log(`   ❌ Error: ${result.error}\n`);
              return;
            }

            if (result.validationResult.issues.length === 0) {
              console.log(`   ✅ No issues found\n`);
            } else {
              console.log(
                formatValidationResult(result.validationResult)
                  .split('\n')
                  .map((line) => `   ${line}`)
                  .join('\n')
              );
              console.log('');
            }
          });
        }

        // Show overall summary
        console.log(`📊 Overall Summary:`);
        console.log(`   Total views: ${summary.totalViews}`);
        console.log(`   Valid: ${summary.validViews}`);
        console.log(`   Invalid: ${summary.invalidViews}`);
        console.log(`   Total issues: ${summary.totalIssues}`);

        if (summary.totalIssues > 0) {
          console.log(`     Errors: ${summary.errorCount}`);
          console.log(`     Warnings: ${summary.warningCount}`);
          console.log(`     Info: ${summary.infoCount}`);
        }

        // Show guidance if there are issues
        if (summary.invalidViews > 0 || summary.totalIssues > 0) {
          console.log(`\n💡 Next steps:`);
          console.log(`   - Edit view files in .a24z/views/ to fix errors`);
          console.log(`   - Update documentation files to fix missing file references`);
          console.log(
            `   - Use 'memory-palace validate <view-id>' for detailed validation of specific views`
          );
          console.log(
            `   - Use 'memory-palace validate-all --issues-only' to focus on problematic views`
          );
        }

        // Exit with error code if there were validation failures
        if (summary.invalidViews > 0) {
          process.exit(1);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
