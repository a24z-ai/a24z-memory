/**
 * Add-doc command - Add a documentation file to the Alexandria library as a codebase view
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createMemoryPalace, getRepositoryRoot } from '../utils/repository.js';
import { createViewFromDocument, type UntrackedDocumentInfo } from '../utils/viewCreation.js';
import { ALEXANDRIA_DIRS } from '../../constants/paths.js';

export function createAddDocCommand(): Command {
  const command = new Command('add-doc');

  command
    .description('Add a documentation file to the Alexandria library as a codebase view')
    .argument('<doc-file>', 'Path to the markdown documentation file')
    .option('-n, --name <name>', 'Name for the codebase view')
    .option('-d, --description <desc>', 'Description for the codebase view')
    .option('--default', 'Set this view as the default view')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('--skip-guidance', 'Skip the guidance on creating effective CodebaseViews')
    .action(async (docFile: string, options) => {
      // Show guidance by default (unless skipped)
      if (!options.skipGuidance) {
        console.log(`
📚 Adding Documentation to the Alexandria Library
═══════════════════════════════════════════════════════

IMPORTANT: The goal is to add CURRENT and MAINTAINABLE documentation to the library that will be reliable going forward.

🎯 Key Principles:

1. ANCHOR TO FILE PATHS
   Your documentation should reference specific files and directories.
   Examples:
   - "The authentication logic is in src/auth/provider.ts"
   - "Database models are located in src/models/"
   - "Configuration files: config/app.json and config/database.json"

2. UPDATE STALE DOCUMENTATION IS ENCOURAGED! 
   If you discover outdated references while creating a view:
   ✅ DO update the documentation to reflect current file structure
   ✅ DO remove references to deleted files
   ✅ DO add references to new important files
   
   This is not just okay—it's ESSENTIAL for creating reliable CodebaseViews.

3. STRUCTURE YOUR DOCUMENTATION
   Organize your markdown with clear sections that map to grid cells:
   
   # Architecture Overview
   
   ## Core Components [0,0]
   The main application entry point is in src/index.ts...
   
   ## API Layer [0,1]
   REST endpoints are defined in src/api/routes/...
   
   ## Data Layer [1,0]
   Database models in src/models/...

4. BE SPECIFIC
   Instead of: "The utils folder contains helper functions"
   Write: "Utility functions in src/utils/string.ts, src/utils/date.ts"

5. MAINTENANCE MINDSET
   Remember: CodebaseViews are living documents. Creating them with accurate,
   current file references ensures they remain useful and get maintained.

💡 Tips:
- Run 'alexandria list-untracked-docs' to find documentation to add to the library
- Check file existence before referencing them
- Use relative paths from repository root
- Group related files in the same grid cell
- Consider the visual layout (typically 2-3 rows, 2-4 columns works well)

Press Enter to continue, or Ctrl+C to exit...
`);
        // Wait for user input
        await new Promise<void>((resolve) => {
          process.stdin.once('data', () => resolve());
        });
        return;
      }
      try {
        const palace = createMemoryPalace(options.path);
        const repoPath = getRepositoryRoot(options.path);

        // Read and validate the documentation file
        const docFilePath = path.resolve(docFile);

        // Check if file exists
        if (!fs.existsSync(docFilePath)) {
          console.error(`Error: Documentation file not found: ${docFile}`);
          process.exit(1);
        }

        // Get relative path for the doc
        const relativePath = path.relative(repoPath, docFilePath);

        // Check if file is within repository
        if (relativePath.startsWith('..')) {
          console.error(`Error: Documentation file must be within the repository`);
          process.exit(1);
        }

        // Create document info for the centralized function
        const docInfo: UntrackedDocumentInfo = {
          filePath: relativePath,
          relativePath: relativePath,
          fullPath: docFilePath,
        };

        // Use centralized function to create view
        const result = createViewFromDocument(repoPath, docInfo, {
          category: 'other',
          skipValidation: false,
          dryRun: false,
          name: options.name,
          description: options.description,
        });

        if (!result.success) {
          console.error(`Error: ${result.error}`);
          process.exit(1);
        }

        // Success message with saved location
        const viewsDir = path.join(repoPath, ALEXANDRIA_DIRS.PRIMARY, ALEXANDRIA_DIRS.VIEWS);
        const savedPath = path.join(viewsDir, `${result.viewId}.json`);

        console.log('');
        console.log(`✅ Documentation added to the Alexandria library!`);
        console.log('');
        console.log(`📍 View Details:`);
        console.log(`   Name: ${result.viewName}`);
        console.log(`   ID: ${result.viewId}`);
        console.log(`   Location: ${path.relative(process.cwd(), savedPath)}`);
        console.log(`   Overview: ${result.view!.overviewPath}`);
        console.log('');
        console.log(`📊 Structure Extracted:`);
        console.log(`   Grid: ${result.view!.rows} rows × ${result.view!.cols} columns`);
        console.log(`   Cells: ${Object.keys(result.view!.cells).length} sections`);

        let totalFiles = 0;
        for (const cell of Object.values(result.view!.cells)) {
          totalFiles += cell.files.length;
        }
        console.log(`   Files: ${totalFiles} files referenced`);
        console.log('');
        console.log(`📝 How to Modify:`);
        console.log(`   1. Edit the view: ${path.relative(process.cwd(), savedPath)}`);
        console.log(`   2. Validate changes: alexandria validate ${result.viewId}`);
        console.log(`   3. List all views: alexandria list`);

        // Set as default if requested
        if (options.default) {
          try {
            const defaultView = {
              ...result.view!,
              id: 'default',
              name: result.viewName!,
              description: result.view!.description || `Default view based on ${result.viewId}`,
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
        if (result.issues && result.issues > 0) {
          console.log('');
          console.log(
            `⚠️  ${result.issues} validation issue${result.issues === 1 ? '' : 's'} found`
          );
        }

        console.log('');
        console.log(`💡 Next Steps:`);
        console.log(`   - Review the extracted file references for accuracy`);
        console.log(`   - If any references are outdated, UPDATE YOUR DOCUMENTATION!`);
        console.log(`   - Keeping docs current ensures reliable, maintainable views`);
        console.log(`   - You can manually edit the JSON to refine the structure`);
        console.log(`   - Add more files to cells or reorganize the grid layout`);
        console.log('');
        console.log(`⚠️  Remember: It's GOOD to update stale documentation!`);
        console.log(`   This ensures your CodebaseView remains useful over time.`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
