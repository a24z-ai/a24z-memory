/**
 * Validate command - Validate an existing codebase view
 */

import { Command } from 'commander';
import * as path from 'node:path';
import { createMemoryPalace, getRepositoryRoot } from '../utils/repository.js';
import { formatValidationResult, formatValidationSummary } from '../utils/formatting.js';

export function createValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate an existing codebase view')
    .argument('<view-name-or-path>', 'View ID/name or path to JSON file to validate')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('--summary', 'Show only validation summary')
    .action(async (viewNameOrPath: string, options) => {
      try {
        const palace = createMemoryPalace(options.path);
        const repoPath = getRepositoryRoot(options.path);

        let view;
        let viewSource: string;

        // Check if the argument is a file path or view ID
        if (viewNameOrPath.endsWith('.json') || viewNameOrPath.includes('/')) {
          // Treat as file path
          const fs = await import('node:fs');
          const viewFilePath = path.resolve(viewNameOrPath);

          if (!fs.existsSync(viewFilePath)) {
            console.error(`Error: View file not found: ${viewNameOrPath}`);
            process.exit(1);
          }

          try {
            const viewContent = fs.readFileSync(viewFilePath, 'utf8');
            view = JSON.parse(viewContent);
            viewSource = `file ${viewNameOrPath}`;
          } catch (error) {
            console.error(
              `Error: Cannot read or parse view file: ${error instanceof Error ? error.message : String(error)}`
            );
            process.exit(1);
          }
        } else {
          // Treat as view ID - get from repository
          const views = palace.listViews();
          view = views.find((v) => v.id === viewNameOrPath || v.name === viewNameOrPath);

          if (!view) {
            console.error(`Error: View '${viewNameOrPath}' not found in repository`);
            console.error(`Available views: ${views.map((v) => v.id).join(', ')}`);
            process.exit(1);
          }

          viewSource = `repository view '${view.name}' (${view.id})`;
        }

        // Validate the view
        const validationResult = palace.validateView(view);

        // Display results
        console.log(`Validating ${viewSource}...\n`);

        if (options.summary) {
          // Show only summary
          const summaryText = formatValidationSummary(validationResult);
          if (validationResult.isValid) {
            console.log(`✅ Validation passed: ${summaryText}`);
          } else {
            console.log(`❌ Validation failed: ${summaryText}`);
          }
        } else {
          // Show detailed results
          if (validationResult.issues.length === 0) {
            console.log('✅ View validation passed! No issues found.');
          } else {
            console.log(formatValidationResult(validationResult));
          }

          // Show summary at the end
          console.log(`\n📊 Summary: ${formatValidationSummary(validationResult)}`);
        }

        // Provide guidance if there are issues
        if (validationResult.issues.length > 0 && !options.summary) {
          console.log(`\n💡 Next steps:`);

          if (viewNameOrPath.endsWith('.json') || viewNameOrPath.includes('/')) {
            console.log(`   - Edit the file: ${viewNameOrPath}`);
            console.log(`   - Re-run: alexandria validate ${viewNameOrPath}`);
          } else {
            const viewPath = path.join(repoPath, '.a24z', 'views', `${view.id}.json`);
            console.log(`   - Edit: ${path.relative(process.cwd(), viewPath)}`);
            console.log(`   - Re-run: alexandria validate ${view.id}`);
          }
        }

        // Exit with error code if validation failed
        if (!validationResult.isValid) {
          process.exit(1);
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
