/**
 * Save command - Save a codebase view with validation
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createMemoryPalace, getRepositoryRoot } from '../utils/repository.js';
import { generateViewIdFromName } from '../../pure-core/stores/CodebaseViewsStore.js';
import { formatValidationResult } from '../utils/formatting.js';
import { ALEXANDRIA_DIRS } from '../../constants/paths';
import type { CodebaseView } from '../../pure-core/types/index.js';

export function createSaveCommand(): Command {
  const command = new Command('save');

  command
    .description('Save a codebase view with validation')
    .argument('<view-file>', 'Path to the JSON view file to save')
    .option('--default', 'Set this view as the default view')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .action(async (viewFile: string, options) => {
      try {
        const palace = createMemoryPalace(options.path);
        const repoPath = getRepositoryRoot(options.path);

        // Read and parse the view file
        const viewFilePath = path.resolve(viewFile);
        if (!fs.existsSync(viewFilePath)) {
          console.error(`Error: View file not found: ${viewFile}`);
          process.exit(1);
        }

        let viewContent: string;
        try {
          viewContent = fs.readFileSync(viewFilePath, 'utf8');
        } catch (error) {
          console.error(
            `Error: Cannot read view file: ${error instanceof Error ? error.message : String(error)}`
          );
          process.exit(1);
        }

        let view: CodebaseView;
        try {
          view = JSON.parse(viewContent);
        } catch (error) {
          console.error(
            `Error: Invalid JSON in view file: ${error instanceof Error ? error.message : String(error)}`
          );
          process.exit(1);
        }

        // Ensure the view has an ID (generate from name if missing)
        if (!view.id && view.name) {
          view.id = generateViewIdFromName(view.name);
        }

        // Save view with validation
        const validationResult = palace.saveViewWithValidation(view);

        // Success message with saved location
        const viewsDir = path.join(repoPath, ALEXANDRIA_DIRS.PRIMARY, ALEXANDRIA_DIRS.VIEWS);
        const savedPath = path.join(viewsDir, `${validationResult.validatedView.id}.json`);

        console.log(
          `✅ View '${validationResult.validatedView.name}' saved to ${path.relative(process.cwd(), savedPath)}`
        );

        // Delete original file if save was successful
        try {
          fs.unlinkSync(viewFilePath);
          console.log(
            `📄 Original file '${viewFile}' has been removed (now stored in ${ALEXANDRIA_DIRS.PRIMARY}/${ALEXANDRIA_DIRS.VIEWS}/)`
          );
        } catch (error) {
          console.log(
            `⚠️  Could not remove original file '${viewFile}': ${error instanceof Error ? error.message : String(error)}`
          );
        }

        // Set as default if requested
        if (options.default) {
          try {
            // Create a default view by copying the saved view
            const defaultView = {
              ...validationResult.validatedView,
              id: 'default',
              name: validationResult.validatedView.name,
              description:
                validationResult.validatedView.description ||
                `Default view based on ${validationResult.validatedView.id}`,
            };
            palace.saveView(defaultView);
            console.log(`🔧 Set as default view`);
          } catch (error) {
            console.log(
              `⚠️  Could not set as default view: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        // Display validation results
        if (validationResult.issues.length > 0) {
          console.log(''); // Empty line
          console.log(formatValidationResult(validationResult));

          // Provide guidance on next steps
          console.log(`💡 To fix these issues:`);
          console.log(`   - Edit: ${path.relative(process.cwd(), savedPath)}`);
          console.log(`   - Run: alexandria validate ${validationResult.validatedView.id}`);
        }

        // Exit with error code if there were critical issues
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
