/**
 * Init command - Initialize Alexandria configuration and global registry
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { CONFIG_FILENAME } from '../../config/schema.js';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter.js';
import { ProjectRegistryStore } from '../../projects-core/ProjectRegistryStore.js';
import { MemoryPalace } from '../../MemoryPalace.js';
import { getGitRemoteUrl } from '../../projects-core/utils.js';
import { getAlexandriaWorkflowTemplate } from '../templates/alexandria-workflow.js';
import { ALEXANDRIA_DIRS } from '../../constants/paths';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptYesNo(question: string, defaultValue = true): Promise<boolean> {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await prompt(`${question} (${defaultText}): `);

  if (answer === '') return defaultValue;
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize Alexandria configuration for your project')
    .option('-f, --force', 'Overwrite existing configuration')
    .option('--no-register', 'Skip registering project in global registry')
    .option('--no-workflow', 'Skip GitHub workflow setup')
    .action(async (options) => {
      try {
        const repoPath = process.cwd();
        const configPath = path.join(repoPath, CONFIG_FILENAME);

        console.log('🚀 Initializing Alexandria...\n');

        // Check if config already exists
        if (fs.existsSync(configPath) && !options.force) {
          console.error(`❌ Configuration already exists at ${CONFIG_FILENAME}`);
          console.error('   Use --force to overwrite');
          process.exit(1);
        }

        // Create minimal config
        const config = {
          $schema:
            'https://raw.githubusercontent.com/a24z-ai/alexandria/main/schema/alexandriarc.json',
          version: '1.0.0',
          context: {
            useGitignore: true,
            patterns: {
              exclude: [`${ALEXANDRIA_DIRS.PRIMARY}/**`],
            },
          },
        };

        // Write config file
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

        console.log(`✅ Created ${CONFIG_FILENAME}`);
        console.log(`📝 Using .gitignore patterns + ${ALEXANDRIA_DIRS.PRIMARY}/ exclusions\n`);

        // Setup global registry if not opted out
        if (options.register !== false) {
          const fsAdapter = new NodeFileSystemAdapter();
          const homeDir = process.env.HOME || process.env.USERPROFILE;

          if (!homeDir) {
            console.warn('⚠️  Could not determine home directory for global registry');
          } else {
            try {
              // Validate it's a git repository
              const validatedPath = MemoryPalace.validateRepositoryPath(fsAdapter, repoPath);

              // Get project name (use directory name)
              const projectName = path.basename(validatedPath);

              // Get git remote URL
              const remoteUrl = getGitRemoteUrl(validatedPath);

              // Create registry store and register the project
              const registry = new ProjectRegistryStore(fsAdapter, homeDir);

              // Check if already registered
              const existing = registry.getProject(projectName);
              if (!existing) {
                registry.registerProject(projectName, validatedPath, remoteUrl);
                console.log(`✅ Registered project '${projectName}' in global registry`);
                if (remoteUrl) {
                  console.log(`   Remote: ${remoteUrl}`);
                }
              } else {
                console.log(`ℹ️  Project '${projectName}' already registered`);
              }
            } catch (error) {
              // If not a git repo, just skip registration
              if (error instanceof Error && error.message.includes('git')) {
                console.log('ℹ️  Skipping global registry (not a git repository)');
              } else {
                console.warn(
                  `⚠️  Could not register in global registry: ${error instanceof Error ? error.message : error}`
                );
              }
            }
          }
        }

        // Ask about GitHub workflow if not opted out
        if (options.workflow !== false && fs.existsSync(path.join(repoPath, '.git'))) {
          console.log('');
          const installWorkflow = await promptYesNo(
            '📦 Would you like to install the GitHub Action workflow?\n   This will auto-register your project when pushed to GitHub',
            true
          );

          if (installWorkflow) {
            // Get the workflow template
            const workflowTemplate = getAlexandriaWorkflowTemplate();

            // Create .github/workflows directory if it doesn't exist
            const workflowsDir = path.join(repoPath, '.github', 'workflows');
            if (!fs.existsSync(workflowsDir)) {
              fs.mkdirSync(workflowsDir, { recursive: true });
            }

            // Write the workflow file
            const workflowPath = path.join(workflowsDir, 'alexandria.yml');

            if (fs.existsSync(workflowPath)) {
              const overwrite = await promptYesNo('   Workflow already exists. Overwrite?', false);
              if (!overwrite) {
                console.log('   Skipped workflow installation');
              } else {
                fs.writeFileSync(workflowPath, workflowTemplate, 'utf8');
                console.log(`✅ Updated GitHub workflow at .github/workflows/alexandria.yml`);
              }
            } else {
              fs.writeFileSync(workflowPath, workflowTemplate, 'utf8');
              console.log(`✅ Created GitHub workflow at .github/workflows/alexandria.yml`);
            }
          }
        }

        console.log('\n✨ Alexandria initialized successfully!');
        console.log('\nNext steps:');
        console.log('  1. Run: alexandria list');
        console.log('  2. Add docs to library: alexandria add-doc <path>');
        if (fs.existsSync(path.join(repoPath, '.github', 'workflows', 'alexandria.yml'))) {
          console.log('  3. Commit and push to activate GitHub workflow');
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
