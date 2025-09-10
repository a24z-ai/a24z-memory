/**
 * Install workflow command - Install the Alexandria GitHub workflow
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getRepositoryRoot } from '../utils/repository.js';
import { getAlexandriaWorkflowTemplate } from '../templates/alexandria-workflow.js';
import { ALEXANDRIA_DIRS } from '../../constants/paths';

export function createInstallWorkflowCommand(): Command {
  const command = new Command('install-workflow');

  command
    .description('Install the Alexandria GitHub workflow to auto-register your repository')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('-f, --force', 'Overwrite existing workflow file if it exists')
    .action(async (options) => {
      try {
        const repoPath = getRepositoryRoot(options.path);

        // Check if we're in a git repository
        if (!fs.existsSync(path.join(repoPath, '.git'))) {
          console.error('Error: Not in a git repository');
          process.exit(1);
        }

        // Get the workflow template
        const workflowTemplate = getAlexandriaWorkflowTemplate();

        // Create .github/workflows directory if it doesn't exist
        const workflowsDir = path.join(repoPath, '.github', 'workflows');
        if (!fs.existsSync(workflowsDir)) {
          fs.mkdirSync(workflowsDir, { recursive: true });
          console.log(`📁 Created directory: ${path.relative(process.cwd(), workflowsDir)}`);
        }

        // Check if workflow already exists
        const workflowPath = path.join(workflowsDir, 'alexandria.yml');
        if (fs.existsSync(workflowPath) && !options.force) {
          console.error(
            `Error: Workflow already exists at ${path.relative(process.cwd(), workflowPath)}`
          );
          console.error('Use --force to overwrite');
          process.exit(1);
        }

        // Write the workflow file
        fs.writeFileSync(workflowPath, workflowTemplate, 'utf8');
        console.log(
          `✅ Installed Alexandria workflow to ${path.relative(process.cwd(), workflowPath)}`
        );

        // Check if alexandria views directory exists
        const viewsDir = path.join(repoPath, ALEXANDRIA_DIRS.PRIMARY, ALEXANDRIA_DIRS.VIEWS);
        const hasViews = fs.existsSync(viewsDir);

        if (!hasViews) {
          console.log(
            `\n⚠️  Note: No ${ALEXANDRIA_DIRS.PRIMARY}/${ALEXANDRIA_DIRS.VIEWS}/ directory found`
          );
          console.log('   Create codebase views first using:');
          console.log('   alexandria add-doc <documentation-file>');
        }

        // Provide next steps
        console.log('\n📝 Next steps:');
        console.log('1. Review the workflow file and adjust if needed');
        console.log('2. Commit the workflow:');
        console.log(`   git add ${path.relative(process.cwd(), workflowPath)}`);
        console.log('   git commit -m "Add Alexandria auto-registration workflow"');
        console.log('3. Push to your repository:');
        console.log('   git push');
        console.log('\nThe workflow will automatically register your repository with Alexandria');
        console.log(
          `whenever you push changes to ${ALEXANDRIA_DIRS.PRIMARY}/${ALEXANDRIA_DIRS.VIEWS}/ files.`
        );
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
