/**
 * Status command - Display Alexandria configuration and repository status
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { CONFIG_FILENAME } from '../../config/schema.js';
import { createMemoryPalace, getRepositoryRoot } from '../utils/repository.js';
import { ALEXANDRIA_DIRS } from '../../constants/paths';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter.js';
import { MemoryPalace } from '../../MemoryPalace.js';

interface ConfigData {
  version?: string;
  context?: {
    useGitignore?: boolean;
    patterns?: {
      exclude?: string[];
    };
  };
}

interface StatusInfo {
  hasConfig: boolean;
  configPath?: string;
  config?: ConfigData;
  hasHuskyHook: boolean;
  huskyHookPath?: string;
  hasGitWorkflow: boolean;
  workflowPath?: string;
  hasAgentsGuidance: boolean;
  agentsPath?: string;
  isPrivateRepo: boolean;
  repoUrl?: string;
  viewsCount: number;
  untrackedDocsCount: number;
  untrackedDocs?: string[];
}

function checkHuskyHook(repoPath: string): { hasHook: boolean; hookPath?: string } {
  // Check for husky pre-commit hook with alexandria lint
  const huskyPath = path.join(repoPath, '.husky', 'pre-commit');

  if (fs.existsSync(huskyPath)) {
    const content = fs.readFileSync(huskyPath, 'utf8');
    if (content.includes('alexandria lint')) {
      return { hasHook: true, hookPath: huskyPath };
    }
  }

  return { hasHook: false };
}

function checkAgentsGuidance(repoPath: string): { hasGuidance: boolean; agentsPath?: string } {
  const agentsPath = path.join(repoPath, 'AGENTS.md');

  if (fs.existsSync(agentsPath)) {
    const content = fs.readFileSync(agentsPath, 'utf8');
    if (content.includes('## Alexandria')) {
      return { hasGuidance: true, agentsPath };
    }
    return { hasGuidance: false, agentsPath };
  }

  return { hasGuidance: false };
}

function checkGitWorkflow(repoPath: string): { hasWorkflow: boolean; workflowPath?: string } {
  const workflowPath = path.join(repoPath, '.github', 'workflows', 'alexandria.yml');

  if (fs.existsSync(workflowPath)) {
    return { hasWorkflow: true, workflowPath };
  }

  return { hasWorkflow: false };
}

function isPrivateRepository(repoPath: string): boolean {
  try {
    // Try to get the remote URL and check if it's private
    execSync('git remote get-url origin', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();

    // For now, we can't easily determine if a repo is private without API calls
    // Return false as default, but note this in the status
    return false;
  } catch {
    // No remote configured
    return false;
  }
}

function getRepoUrl(repoPath: string): string | undefined {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();

    // Convert git URL to HTTPS URL for GitHub
    if (remoteUrl.startsWith('git@github.com:')) {
      const parts = remoteUrl.replace('git@github.com:', '').replace('.git', '').split('/');
      if (parts.length === 2) {
        return `https://a24z-ai.github.io/Alexandria/repo/?owner=${parts[0]}&name=${parts[1]}`;
      }
    } else if (remoteUrl.includes('github.com')) {
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(\.git)?$/);
      if (match) {
        return `https://a24z-ai.github.io/Alexandria/repo/?owner=${match[1]}&name=${match[2]}`;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function getUntrackedDocs(repoPath: string): string[] {
  const fsAdapter = new NodeFileSystemAdapter();
  const palace = new MemoryPalace(repoPath, fsAdapter);

  // Get all markdown files
  const allDocs: string[] = [];

  function findMarkdownFiles(dir: string, basePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Skip common directories that shouldn't be tracked
        if (
          !['node_modules', '.git', ALEXANDRIA_DIRS.PRIMARY, 'dist', 'build'].includes(entry.name)
        ) {
          findMarkdownFiles(fullPath, relativePath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        allDocs.push(relativePath);
      }
    }
  }

  findMarkdownFiles(repoPath);

  // Get tracked docs from views
  const views = palace.listViews();
  const trackedDocs = new Set<string>();

  for (const view of views) {
    // Documents are tracked by the overviewPath property
    if (view.overviewPath) {
      trackedDocs.add(view.overviewPath);
    }
  }

  // Return untracked docs
  return allDocs.filter((doc) => !trackedDocs.has(doc));
}

export function createStatusCommand(): Command {
  const command = new Command('status');

  command
    .description('Display Alexandria configuration and repository status')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('-v, --verbose', 'Show detailed information')
    .action((options) => {
      try {
        const repoPath = getRepositoryRoot(options.path);
        const palace = createMemoryPalace(options.path);

        console.log('📊 Alexandria Status\n');
        console.log('═══════════════════════════════════════════\n');

        // Gather status information
        const status: StatusInfo = {
          hasConfig: false,
          hasHuskyHook: false,
          hasGitWorkflow: false,
          hasAgentsGuidance: false,
          isPrivateRepo: false,
          viewsCount: 0,
          untrackedDocsCount: 0,
        };

        // Check for config
        const configPath = path.join(repoPath, CONFIG_FILENAME);
        if (fs.existsSync(configPath)) {
          status.hasConfig = true;
          status.configPath = configPath;
          try {
            status.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          } catch {
            // Config exists but can't be parsed
          }
        }

        // Check for husky hook
        const huskyCheck = checkHuskyHook(repoPath);
        status.hasHuskyHook = huskyCheck.hasHook;
        status.huskyHookPath = huskyCheck.hookPath;

        // Check for GitHub workflow
        const workflowCheck = checkGitWorkflow(repoPath);
        status.hasGitWorkflow = workflowCheck.hasWorkflow;
        status.workflowPath = workflowCheck.workflowPath;

        // Check for AGENTS.md guidance
        const agentsCheck = checkAgentsGuidance(repoPath);
        status.hasAgentsGuidance = agentsCheck.hasGuidance;
        status.agentsPath = agentsCheck.agentsPath;

        // Check if private repo
        status.isPrivateRepo = isPrivateRepository(repoPath);
        status.repoUrl = getRepoUrl(repoPath);

        // Get views count
        const views = palace.listViews();
        status.viewsCount = views.length;

        // Get untracked docs
        const untrackedDocs = getUntrackedDocs(repoPath);
        status.untrackedDocsCount = untrackedDocs.length;
        status.untrackedDocs = untrackedDocs;

        // Display configuration status
        console.log('📁 Configuration');
        console.log('───────────────');
        if (status.hasConfig) {
          console.log(`✅ Config file: ${CONFIG_FILENAME}`);
          if (options.verbose && status.config) {
            console.log('   Settings:');
            console.log(`   • Version: ${status.config.version || 'unknown'}`);
            console.log(`   • Use .gitignore: ${status.config.context?.useGitignore ?? true}`);
            if (status.config.context?.patterns?.exclude) {
              console.log(
                `   • Exclude patterns: ${status.config.context.patterns.exclude.join(', ')}`
              );
            }
          }
        } else {
          console.log(`⚠️  No config file found`);
          console.log(`   Run: alexandria init`);
        }
        console.log('');

        // Display AGENTS.md status
        console.log('📚 AI Guidance');
        console.log('──────────────');
        if (status.hasAgentsGuidance) {
          console.log(`✅ AGENTS.md has Alexandria guidance`);
          if (options.verbose) {
            console.log(`   Path: ${status.agentsPath}`);
          }
        } else if (status.agentsPath) {
          console.log(`⚠️  AGENTS.md exists but missing Alexandria guidance`);
          console.log(`   To add: alexandria agents --add`);
        } else {
          console.log(`ℹ️  No AGENTS.md file`);
          console.log(`   To create: alexandria agents --add`);
        }
        console.log('');

        // Display hooks status
        console.log('🪝 Git Hooks');
        console.log('────────────');
        if (status.hasHuskyHook) {
          console.log(`✅ Husky pre-commit hook configured`);
          if (options.verbose) {
            console.log(`   Path: ${status.huskyHookPath}`);
          }
        } else {
          console.log(`ℹ️  No husky pre-commit hook`);
          console.log(`   To add: alexandria hooks --add`);
        }
        console.log('');

        // Display GitHub workflow status
        console.log('🔄 GitHub Workflow');
        console.log('──────────────────');
        if (status.hasGitWorkflow) {
          console.log(`✅ GitHub workflow installed`);
          if (status.repoUrl) {
            console.log(`   📍 View your repository at:`);
            console.log(`   ${status.repoUrl}`);
          }
        } else {
          console.log(`ℹ️  No GitHub workflow`);
          if (status.isPrivateRepo) {
            console.log(`   Note: GitHub workflow not available for private repositories`);
          } else {
            console.log(`   Run: alexandria install-workflow`);
          }
        }
        console.log('');

        // Display repository stats
        console.log('📈 Repository Stats');
        console.log('───────────────────');
        console.log(`• Codebase Views: ${status.viewsCount}`);
        console.log(`• Untracked Documents: ${status.untrackedDocsCount}`);

        if (status.untrackedDocsCount > 0) {
          if (options.verbose && status.untrackedDocs) {
            console.log('\n  Untracked documents:');
            status.untrackedDocs.slice(0, 10).forEach((doc) => {
              console.log(`  • ${doc}`);
            });
            if (status.untrackedDocs.length > 10) {
              console.log(`  ... and ${status.untrackedDocs.length - 10} more`);
            }
          }
          console.log(`\n  💡 Add all documents: alexandria auto-create-views`);
        }
        console.log('');

        // Summary and recommendations
        console.log('═══════════════════════════════════════════\n');

        if (!status.hasConfig) {
          console.log('🚀 Get started: alexandria init');
        } else if (status.viewsCount === 0) {
          console.log('🚀 Next step: Create your first view');
          console.log('   • Add a document: alexandria add-doc README.md');
          console.log('   • Add all docs: alexandria auto-create-views');
        } else {
          console.log('✨ Alexandria is configured and ready!');
          if (status.untrackedDocsCount > 0) {
            console.log(
              `   Consider adding ${status.untrackedDocsCount} untracked document${status.untrackedDocsCount === 1 ? '' : 's'}`
            );
          }
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
