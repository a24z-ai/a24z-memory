/**
 * Memory Palace CLI - Main entry point
 *
 * This CLI provides direct access to codebase views functionality
 * using the MemoryPalace API.
 */

import { Command } from 'commander';
import { BRANDING } from './branding.js';
import { createListCommand } from './cli-memory-palace/commands/list.js';
import { createSaveCommand } from './cli-memory-palace/commands/save.js';
import { createValidateCommand } from './cli-memory-palace/commands/validate.js';
import { createFromDocCommand } from './cli-memory-palace/commands/from-doc.js';
import { createInstallWorkflowCommand } from './cli-memory-palace/commands/install-workflow.js';
import { createProjectsCommand } from './cli-memory-palace/commands/projects.js';

const program = new Command();

program
  .name('memory-palace')
  .description('Codebase Views CLI for a24z Memory')
  .version(BRANDING.MCP_VERSION);

// Add commands
program.addCommand(createListCommand());
program.addCommand(createSaveCommand());
program.addCommand(createValidateCommand());
program.addCommand(createFromDocCommand());
program.addCommand(createInstallWorkflowCommand());
program.addCommand(createProjectsCommand());

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
