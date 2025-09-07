/**
 * From-doc command - Create a codebase view from a documentation file
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createMemoryPalace, getRepositoryRoot } from '../utils/repository.js';
import { generateViewIdFromName } from '../../pure-core/stores/CodebaseViewsStore.js';
import { formatValidationResult } from '../utils/formatting.js';
import { extractStructureFromMarkdown } from '../utils/documentParser.js';
import { MemoryPalace } from '../../MemoryPalace.js';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter.js';
import type { CodebaseView, ValidatedRepositoryPath } from '../../pure-core/types/index.js';

export function createFromDocCommand(): Command {
  const command = new Command('from-doc');

  command
    .description('Create a codebase view from a documentation file')
    .argument('<doc-file>', 'Path to the markdown documentation file')
    .option('-n, --name <name>', 'Name for the codebase view')
    .option('-d, --description <desc>', 'Description for the codebase view')
    .option('--default', 'Set this view as the default view')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .action(async (docFile: string, options) => {
      try {
        const palace = createMemoryPalace(options.path);
        const repoPath = getRepositoryRoot(options.path);
        const fileSystemAdapter = new NodeFileSystemAdapter();

        // Read and validate the documentation file
        const docFilePath = path.resolve(docFile);

        // Validate the documentation file is within the repository
        let relativePath: string;
        try {
          const validatedRelPath = MemoryPalace.validateRelativePath(
            repoPath as ValidatedRepositoryPath,
            docFilePath,
            fileSystemAdapter
          );
          relativePath = validatedRelPath;
        } catch (error) {
          console.error(`Error: Documentation file must be within the repository`);
          console.error((error as Error).message);
          process.exit(1);
        }

        if (!fileSystemAdapter.exists(docFilePath)) {
          console.error(`Error: Documentation file not found: ${docFile}`);
          process.exit(1);
        }

        let docContent: string;
        try {
          docContent = fs.readFileSync(docFilePath, 'utf8');
        } catch (error) {
          console.error(
            `Error: Cannot read documentation file: ${error instanceof Error ? error.message : String(error)}`
          );
          process.exit(1);
        }

        // Extract structure from the markdown
        const extracted = extractStructureFromMarkdown(docContent);

        // Create the codebase view
        const viewName = options.name || extracted.name;
        const view: CodebaseView = {
          id: generateViewIdFromName(viewName),
          version: '1.0.0',
          name: viewName,
          description: options.description || extracted.description,
          rows: extracted.rows,
          cols: extracted.cols,
          cells: extracted.cells,
          overviewPath: relativePath,
          timestamp: new Date().toISOString(),
          metadata: {
            generationType: 'user',
            ui: {
              enabled: true,
              rows: extracted.rows,
              cols: extracted.cols,
              showCellLabels: true,
              cellLabelPosition: 'top',
            },
          },
        };

        // Save view with validation
        const validationResult = palace.saveViewWithValidation(view);

        // Success message with saved location
        const viewsDir = path.join(repoPath, '.a24z', 'views');
        const savedPath = path.join(viewsDir, `${validationResult.validatedView.id}.json`);

        console.log('');
        console.log(`✅ Codebase view created from documentation!`);
        console.log('');
        console.log(`📍 View Details:`);
        console.log(`   Name: ${validationResult.validatedView.name}`);
        console.log(`   ID: ${validationResult.validatedView.id}`);
        console.log(`   Location: ${path.relative(process.cwd(), savedPath)}`);
        console.log(`   Overview: ${validationResult.validatedView.overviewPath}`);
        console.log('');
        console.log(`📊 Structure Extracted:`);
        console.log(`   Grid: ${extracted.rows} rows × ${extracted.cols} columns`);
        console.log(`   Cells: ${Object.keys(extracted.cells).length} sections`);

        let totalFiles = 0;
        for (const cell of Object.values(extracted.cells)) {
          totalFiles += cell.files.length;
        }
        console.log(`   Files: ${totalFiles} files referenced`);
        console.log('');
        console.log(`📝 How to Modify:`);
        console.log(`   1. Edit the view: ${path.relative(process.cwd(), savedPath)}`);
        console.log(
          `   2. Validate changes: memory-palace validate ${validationResult.validatedView.id}`
        );
        console.log(`   3. List all views: memory-palace list`);

        // Set as default if requested
        if (options.default) {
          try {
            const defaultView = {
              ...validationResult.validatedView,
              id: 'default',
              name: validationResult.validatedView.name,
              description:
                validationResult.validatedView.description ||
                `Default view based on ${validationResult.validatedView.id}`,
            };
            palace.saveView(defaultView);
            console.log('');
            console.log(`🔧 Set as default view`);
          } catch (error) {
            console.log(
              `⚠️  Could not set as default view: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        // Display validation results if there are issues
        if (validationResult.issues.length > 0) {
          console.log('');
          console.log(formatValidationResult(validationResult));
        }

        console.log('');
        console.log(`💡 Tips:`);
        console.log(`   - The view extracted file references from your documentation`);
        console.log(`   - Sections with code references became grid cells`);
        console.log(`   - You can manually edit the JSON to refine the structure`);
        console.log(`   - Add more files to cells or reorganize the grid layout`);

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
