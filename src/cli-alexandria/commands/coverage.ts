/**
 * Coverage command - Display context coverage metrics for the repository
 */

import { Command } from 'commander';
import { getRepositoryRoot } from '../utils/repository.js';
import { getContextCoverage } from '../utils/coverage.js';

export function createCoverageCommand(): Command {
  const command = new Command('coverage');

  command
    .description('Display context coverage metrics for the repository')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('-v, --verbose', 'Show list of uncovered files')
    .option('--show-covered', 'Show list of covered files')
    .option('--by-extension', 'Show coverage breakdown by file extension')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const repoPath = getRepositoryRoot(options.path);

        // Get coverage metrics
        const metrics = await getContextCoverage(repoPath);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                ...metrics,
                filesByExtension: Array.from(metrics.filesByExtension.entries()).map(
                  ([ext, stats]) => ({
                    extension: ext,
                    ...stats,
                    percentage: stats.total > 0 ? (stats.covered / stats.total) * 100 : 0,
                  })
                ),
              },
              null,
              2
            )
          );
          return;
        }

        // Display results
        console.log('📊 Alexandria Context Coverage\n');
        console.log('═══════════════════════════════════════════\n');

        // Overall coverage
        console.log('📈 Overall Coverage');
        console.log('───────────────────');
        console.log(`Total source files:    ${metrics.totalFiles}`);
        console.log(`Files with context:    ${metrics.coveredFiles}`);
        console.log(`Files without context: ${metrics.uncoveredFiles.length}`);
        console.log(`Coverage percentage:   ${metrics.coveragePercentage.toFixed(1)}%`);

        // Progress bar
        const barLength = 40;
        const filledLength = Math.round((metrics.coveragePercentage / 100) * barLength);
        const emptyLength = barLength - filledLength;
        const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
        console.log(`\n[${progressBar}] ${metrics.coveragePercentage.toFixed(1)}%\n`);

        // Coverage by extension
        if (options.byExtension && metrics.filesByExtension.size > 0) {
          console.log('📁 Coverage by Extension');
          console.log('────────────────────────');

          const sortedExtensions = Array.from(metrics.filesByExtension.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10); // Top 10 extensions

          for (const [ext, stats] of sortedExtensions) {
            const percentage = stats.total > 0 ? (stats.covered / stats.total) * 100 : 0;
            console.log(
              `${ext.padEnd(10)} ${stats.covered.toString().padStart(4)}/${stats.total.toString().padEnd(4)} ` +
                `(${percentage.toFixed(1)}%)`
            );
          }
          console.log('');
        }

        // List covered files
        if (options.showCovered && metrics.coveredFilesList.length > 0) {
          console.log('✅ Covered Files');
          console.log('────────────────');

          const maxFiles = 20;
          const filesToShow = metrics.coveredFilesList.slice(0, maxFiles);

          for (const file of filesToShow) {
            console.log(`  • ${file}`);
          }

          if (metrics.coveredFilesList.length > maxFiles) {
            console.log(`  ... and ${metrics.coveredFilesList.length - maxFiles} more`);
          }
          console.log('');
        }

        // List uncovered files
        if (options.verbose && metrics.uncoveredFiles.length > 0) {
          console.log('❌ Uncovered Files');
          console.log('──────────────────');

          const maxFiles = 20;
          const filesToShow = metrics.uncoveredFiles.slice(0, maxFiles);

          for (const file of filesToShow) {
            console.log(`  • ${file}`);
          }

          if (metrics.uncoveredFiles.length > maxFiles) {
            console.log(`  ... and ${metrics.uncoveredFiles.length - maxFiles} more`);
          }
          console.log('');
        }

        // Recommendations
        console.log('═══════════════════════════════════════════\n');

        if (metrics.coveragePercentage < 30) {
          console.log('⚠️  Low context coverage detected!');
          console.log('   Consider adding more files to your views.');
          console.log('   Run: alexandria add-doc <file> to add documentation');
        } else if (metrics.coveragePercentage < 60) {
          console.log('💡 Moderate context coverage.');
          console.log('   Keep adding context to improve AI understanding.');
        } else if (metrics.coveragePercentage < 90) {
          console.log('✨ Good context coverage!');
          console.log('   Most important files are documented.');
        } else {
          console.log('🎉 Excellent context coverage!');
          console.log('   Your codebase is well-documented for AI agents.');
        }

        if (metrics.uncoveredFiles.length > 0 && !options.verbose) {
          console.log(`\n💡 Use --verbose to see ${metrics.uncoveredFiles.length} uncovered files`);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
