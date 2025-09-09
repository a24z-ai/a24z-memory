import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter';
import { ProjectRegistryStore } from '../../projects-core/ProjectRegistryStore';
import { MemoryPalace } from '../../MemoryPalace';
import { getGitRemoteUrl } from '../../projects-core/utils';
import { hasAlexandriaWorkflow, hasMemoryNotes } from '../../projects-core/workflow-utils';

export function createProjectsCommand(): Command {
  const projectsCommand = new Command('projects').description('Manage your project registry');

  // Register subcommand
  projectsCommand
    .command('register')
    .description('Register a project in the global registry')
    .argument('[name]', 'Name for the project (defaults to directory name)')
    .option('-p, --path <path>', 'Path to the project (defaults to current directory)')
    .action(async (name?: string, options?: { path?: string }) => {
      try {
        const fsAdapter = new NodeFileSystemAdapter();
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) {
          console.error('❌ Could not determine home directory');
          process.exit(1);
        }

        // Get the project path
        const projectPath = path.resolve(options?.path || process.cwd());

        // Validate it's a git repository using MemoryPalace's validator
        const validatedPath = MemoryPalace.validateRepositoryPath(fsAdapter, projectPath);

        // Get project name (use provided name or directory name)
        const projectName = name || path.basename(validatedPath);

        // Get git remote URL
        const remoteUrl = getGitRemoteUrl(validatedPath);

        // Create registry store and register the project
        const registry = new ProjectRegistryStore(fsAdapter, homeDir);
        registry.registerProject(projectName, validatedPath, remoteUrl);

        console.log(`✅ Registered project '${projectName}' at ${validatedPath}`);
        if (remoteUrl) {
          console.log(`   Remote: ${remoteUrl}`);
        }
      } catch (error) {
        console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // List subcommand
  projectsCommand
    .command('list')
    .description('List all registered projects')
    .option('--json', 'Output as JSON')
    .action(async (options?: { json?: boolean }) => {
      try {
        const fsAdapter = new NodeFileSystemAdapter();
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) {
          console.error('❌ Could not determine home directory');
          process.exit(1);
        }

        const registry = new ProjectRegistryStore(fsAdapter, homeDir);
        const projects = registry.listProjects();

        if (projects.length === 0) {
          console.log('No projects registered yet. Use "alexandria projects register" to add one.');
          return;
        }

        if (options?.json) {
          console.log(JSON.stringify(projects, null, 2));
        } else {
          console.log('\n📁 Registered Projects:\n');

          for (const project of projects) {
            // Check if project path still exists
            const exists = fs.existsSync(project.path);
            const status = exists ? '✅' : '❌';

            console.log(`${status} ${project.name}`);
            console.log(`   Path: ${project.path}`);

            if (project.remoteUrl) {
              console.log(`   Remote: ${project.remoteUrl}`);
            }

            if (exists) {
              // Check for Alexandria workflow and memory notes
              const hasWorkflow = hasAlexandriaWorkflow(fsAdapter, project.path);
              const hasNotes = hasMemoryNotes(fsAdapter, project.path);

              const features = [];
              if (hasWorkflow) features.push('📚 Alexandria');
              if (hasNotes) features.push('🧠 Notes');

              if (features.length > 0) {
                console.log(`   Features: ${features.join(', ')}`);
              } else {
                console.log(
                  `   Features: None (run "alexandria install-workflow" to add Alexandria)`
                );
              }
            } else {
              console.log(`   ⚠️  Path no longer exists`);
            }

            console.log(`   Registered: ${new Date(project.registeredAt).toLocaleDateString()}`);
            console.log();
          }

          console.log(`Total: ${projects.length} project${projects.length !== 1 ? 's' : ''}`);
        }
      } catch (error) {
        console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // Go subcommand - outputs path for shell navigation
  projectsCommand
    .command('go')
    .description('Output project path for navigation (use with shell function)')
    .argument('<name>', 'Project name')
    .action(async (name: string) => {
      try {
        const fsAdapter = new NodeFileSystemAdapter();
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) {
          console.error('echo "Error: Could not determine home directory" >&2; false');
          process.exit(1);
        }

        const registry = new ProjectRegistryStore(fsAdapter, homeDir);
        const project = registry.getProject(name);

        if (!project) {
          console.error(`echo "Error: Project '${name}' not found" >&2; false`);
          process.exit(1);
        }

        // Output cd command for shell evaluation
        console.log(`cd "${project.path}"`);
      } catch (error) {
        console.error(`echo "Error: ${error instanceof Error ? error.message : error}" >&2; false`);
        process.exit(1);
      }
    });

  // Remove subcommand
  projectsCommand
    .command('remove')
    .description('Remove a project from the registry')
    .argument('<name>', 'Project name to remove')
    .action(async (name: string) => {
      try {
        const fsAdapter = new NodeFileSystemAdapter();
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) {
          console.error('❌ Could not determine home directory');
          process.exit(1);
        }

        const registry = new ProjectRegistryStore(fsAdapter, homeDir);
        const removed = registry.removeProject(name);

        if (removed) {
          console.log(`✅ Removed project '${name}' from registry`);
        } else {
          console.log(`❌ Project '${name}' not found in registry`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  return projectsCommand;
}
