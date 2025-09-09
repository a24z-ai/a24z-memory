/**
 * Alexandria CLI - Main entry point
 *
 * This CLI provides direct access to codebase views functionality
 * using the MemoryPalace API.
 */

import { Command } from 'commander';
import { BRANDING } from './branding.js';
import { createListCommand } from './cli-alexandria/commands/list.js';
import { createSaveCommand } from './cli-alexandria/commands/save.js';
import { createValidateCommand } from './cli-alexandria/commands/validate.js';
import { createFromDocCommand } from './cli-alexandria/commands/from-doc.js';
import { createInstallWorkflowCommand } from './cli-alexandria/commands/install-workflow.js';
import { createProjectsCommand } from './cli-alexandria/commands/projects.js';
import { createListUntrackedDocsCommand } from './cli-alexandria/commands/list-untracked-docs.js';
import { createAutoCreateViewsCommand } from './cli-alexandria/commands/auto-create-views.js';
import { createValidateAllCommand } from './cli-alexandria/commands/validate-all.js';
import { createInitCommand } from './cli-alexandria/commands/init.js';

const program = new Command();

program
  .name('alexandria')
  .description('Alexandria CLI - Codebase knowledge management')
  .version(BRANDING.MCP_VERSION);

// Add commands
program.addCommand(createInitCommand());
program.addCommand(createListCommand());
program.addCommand(createSaveCommand());
program.addCommand(createValidateCommand());
program.addCommand(createValidateAllCommand());
program.addCommand(createFromDocCommand());
program.addCommand(createAutoCreateViewsCommand());
program.addCommand(createInstallWorkflowCommand());
program.addCommand(createProjectsCommand());
program.addCommand(createListUntrackedDocsCommand());

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
