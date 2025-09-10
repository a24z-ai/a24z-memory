/**
 * Alexandria CLI - Main entry point
 *
 * This CLI provides direct access to codebase views functionality
 * using the MemoryPalace API.
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createListCommand } from './cli-alexandria/commands/list.js';
import { createSaveCommand } from './cli-alexandria/commands/save.js';
import { createValidateCommand } from './cli-alexandria/commands/validate.js';
import { createAddDocCommand } from './cli-alexandria/commands/add-doc.js';
import { createInstallWorkflowCommand } from './cli-alexandria/commands/install-workflow.js';
import { createProjectsCommand } from './cli-alexandria/commands/projects.js';
import { createListUntrackedDocsCommand } from './cli-alexandria/commands/list-untracked-docs.js';
import { createAutoCreateViewsCommand } from './cli-alexandria/commands/auto-create-views.js';
import { createValidateAllCommand } from './cli-alexandria/commands/validate-all.js';
import { createInitCommand } from './cli-alexandria/commands/init.js';
import { lintCommand } from './cli-alexandria/commands/lint.js';
import { createUpdateCommand } from './cli-alexandria/commands/update.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const program = new Command();

program
  .name('alexandria')
  .description('Alexandria CLI - Unified Context Management')
  .version(packageJson.version);

// Add commands
program.addCommand(createInitCommand());
program.addCommand(lintCommand);
program.addCommand(createListCommand());
program.addCommand(createSaveCommand());
program.addCommand(createValidateCommand());
program.addCommand(createValidateAllCommand());
program.addCommand(createAddDocCommand());
program.addCommand(createAutoCreateViewsCommand());
program.addCommand(createInstallWorkflowCommand());
program.addCommand(createProjectsCommand());
program.addCommand(createListUntrackedDocsCommand());
program.addCommand(createUpdateCommand());

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
