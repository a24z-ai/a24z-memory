/**
 * Update command for Alexandria CLI
 *
 * Checks for and installs the latest version of the alexandria tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getCurrentVersion(): string {
  try {
    // Try multiple paths to find package.json
    const possiblePaths = [
      join(__dirname, '../../../package.json'), // Development
      join(__dirname, '../../package.json'), // Built dist
      join(process.cwd(), 'package.json'), // Current directory
    ];

    for (const path of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(path, 'utf8'));
        if (packageJson.name === 'a24z-memory' && packageJson.version) {
          return packageJson.version;
        }
      } catch {
        // Continue to next path
      }
    }

    // Fallback: try to get version from npm list for global installation
    try {
      const result = execSync('npm list -g a24z-memory --depth=0', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const match = result.match(/a24z-memory@(\d+\.\d+\.\d+)/);
      if (match) return match[1];
    } catch {
      // Continue to unknown
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function getLatestVersion(): string {
  try {
    const result = execSync('npm view a24z-memory version', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return result.trim();
  } catch {
    throw new Error('Failed to check for latest version. Are you connected to the internet?');
  }
}

function isGloballyInstalled(): boolean {
  try {
    const globalPath = execSync('npm list -g --depth=0 a24z-memory', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return globalPath.includes('a24z-memory@');
  } catch {
    return false;
  }
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (currentParts[i] < latestParts[i]) return -1;
    if (currentParts[i] > latestParts[i]) return 1;
  }
  return 0;
}

async function updatePackage(isGlobal: boolean): Promise<void> {
  const scope = isGlobal ? '-g' : '';
  const packageManager = process.env.npm_config_user_agent?.startsWith('bun') ? 'bun' : 'npm';

  console.log(chalk.cyan(`Updating a24z-memory using ${packageManager}...`));

  try {
    if (packageManager === 'bun') {
      execSync(`bun ${isGlobal ? 'install -g' : 'add'} a24z-memory@latest`, {
        stdio: 'inherit',
      });
    } else {
      execSync(`npm install ${scope} a24z-memory@latest`, {
        stdio: 'inherit',
      });
    }
    console.log(chalk.green('✓ Successfully updated to the latest version'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update: ${message}`);
  }
}

export function createUpdateCommand(): Command {
  return new Command('update')
    .description('Update Alexandria CLI to the latest version')
    .option('--check', 'Only check for updates without installing')
    .option('--force', 'Force update even if already on latest version')
    .action(async (options) => {
      try {
        const currentVersion = getCurrentVersion();
        console.log(chalk.cyan(`Current version: ${currentVersion}`));

        console.log(chalk.cyan('Checking for updates...'));
        const latestVersion = getLatestVersion();
        console.log(chalk.cyan(`Latest version: ${latestVersion}`));

        const comparison = compareVersions(currentVersion, latestVersion);

        if (comparison === 0 && !options.force) {
          console.log(chalk.green('✓ You are already on the latest version'));
          return;
        }

        if (comparison < 0) {
          console.log(chalk.yellow(`\nUpdate available: ${currentVersion} → ${latestVersion}`));
        }

        if (options.check) {
          if (comparison < 0) {
            console.log(chalk.cyan('\nRun "alexandria update" to install the latest version'));
          }
          return;
        }

        if (comparison === 0 && options.force) {
          console.log(chalk.yellow('Forcing reinstall of current version...'));
        }

        const isGlobal = isGloballyInstalled();
        if (isGlobal) {
          console.log(chalk.cyan('Detected global installation'));
        } else {
          console.log(chalk.cyan('Detected local installation'));
        }

        await updatePackage(isGlobal);

        if (comparison < 0) {
          console.log(chalk.green(`\n✓ Updated from ${currentVersion} to ${latestVersion}`));
          console.log(
            chalk.cyan('Please restart your terminal or run "hash -r" to use the new version')
          );
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });
}
