/**
 * Hooks command - Manage husky pre-commit hooks for Alexandria
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getRepositoryRoot } from '../utils/repository.js';
import { execSync } from 'node:child_process';

const HUSKY_DIR = '.husky';
const PRE_COMMIT_HOOK = 'pre-commit';
const ALEXANDRIA_HOOK_MARKER = '# Alexandria validation';

/**
 * Get the Alexandria pre-commit hook content
 */
function getAlexandriaHookContent(): string {
  return `${ALEXANDRIA_HOOK_MARKER}
echo "Running Alexandria validation..."
npx alexandria validate-all --errors-only || {
  echo "❌ Alexandria validation failed (errors found)"
  echo "   Run 'alexandria validate-all' to see details"
  exit 1
}

echo "Running Alexandria lint..."
npx alexandria lint --errors-only 2>/dev/null || {
  # Only fail if lint exits with non-zero code
  if [ $? -ne 0 ]; then
    echo "❌ Alexandria lint failed"
    echo "   Run 'alexandria lint' to see details"
    exit 1
  fi
}
`;
}

/**
 * Check if husky is installed
 */
function isHuskyInstalled(repoPath: string): boolean {
  const huskyPath = path.join(repoPath, HUSKY_DIR);
  return fs.existsSync(huskyPath);
}

/**
 * Initialize husky if not already installed
 */
function initializeHusky(repoPath: string): void {
  if (!isHuskyInstalled(repoPath)) {
    console.log('📦 Installing husky...');
    try {
      // Check if package.json exists
      const packageJsonPath = path.join(repoPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('No package.json found. Please run npm init first.');
      }

      // Install husky
      execSync('npm install --save-dev husky', {
        cwd: repoPath,
        stdio: 'inherit',
      });

      // Initialize husky
      execSync('npx husky init', {
        cwd: repoPath,
        stdio: 'inherit',
      });

      // Remove the default placeholder if it exists
      const hookPath = path.join(repoPath, HUSKY_DIR, PRE_COMMIT_HOOK);
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8').trim();
        if (content === 'npm test') {
          // Remove the placeholder file - we'll create our own when --add is used
          fs.unlinkSync(hookPath);
          console.log('ℹ️  Removed default husky placeholder hook');
        }
      }

      console.log('✅ Husky installed and initialized');
    } catch (error) {
      throw new Error(
        `Failed to initialize husky: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Check if pre-commit hook has Alexandria validation
 */
function hasAlexandriaHook(repoPath: string): boolean {
  const hookPath = path.join(repoPath, HUSKY_DIR, PRE_COMMIT_HOOK);
  if (!fs.existsSync(hookPath)) {
    return false;
  }

  const content = fs.readFileSync(hookPath, 'utf8');
  return content.includes(ALEXANDRIA_HOOK_MARKER);
}

/**
 * Add Alexandria validation to pre-commit hook
 */
function addAlexandriaHook(repoPath: string): void {
  const hookPath = path.join(repoPath, HUSKY_DIR, PRE_COMMIT_HOOK);
  const alexandriaContent = getAlexandriaHookContent();

  if (fs.existsSync(hookPath)) {
    // Append to existing hook
    let existingContent = fs.readFileSync(hookPath, 'utf8');

    // Check if already has Alexandria hook
    if (existingContent.includes(ALEXANDRIA_HOOK_MARKER)) {
      return;
    }

    // Remove default husky placeholder if it's the only content
    const trimmedContent = existingContent.trim();
    if (trimmedContent === 'npm test') {
      // Replace the placeholder entirely
      fs.writeFileSync(hookPath, alexandriaContent, 'utf8');
      console.log('ℹ️  Replaced default husky placeholder with Alexandria validation');
    } else {
      // Add Alexandria hook at the end
      const updatedContent = existingContent.trimEnd() + '\n\n' + alexandriaContent;
      fs.writeFileSync(hookPath, updatedContent, 'utf8');
    }
  } else {
    // Create new hook file
    fs.writeFileSync(hookPath, alexandriaContent, 'utf8');
    // Make it executable
    fs.chmodSync(hookPath, 0o755);
  }
}

/**
 * Remove Alexandria validation from pre-commit hook
 */
function removeAlexandriaHook(repoPath: string): void {
  const hookPath = path.join(repoPath, HUSKY_DIR, PRE_COMMIT_HOOK);

  if (!fs.existsSync(hookPath)) {
    return;
  }

  const content = fs.readFileSync(hookPath, 'utf8');

  if (!content.includes(ALEXANDRIA_HOOK_MARKER)) {
    return;
  }

  // Split content by lines and find the Alexandria section
  const lines = content.split('\n');
  const startIndex = lines.findIndex((line) => line.includes(ALEXANDRIA_HOOK_MARKER));

  if (startIndex === -1) {
    return;
  }

  // Find the end of the Alexandria section
  // Look for all lines that are part of our added content
  let endIndex = lines.length - 1;

  // Starting from the marker, find all related lines
  let inAlexandriaBlock = true;
  let i = startIndex + 1;

  while (i < lines.length && inAlexandriaBlock) {
    const line = lines[i];

    // Check if this line is part of the Alexandria block
    if (
      line.includes('alexandria') ||
      line.includes('Alexandria') ||
      line.includes('echo "Running Alexandria') ||
      (line.includes('exit 1') && i > startIndex && i < startIndex + 10) ||
      (line === '}' && i > startIndex && i < startIndex + 10) ||
      (line.trim() === '' && i === startIndex + 1)
    ) {
      endIndex = i;
      i++;
    } else if (line.trim() === '' && i < startIndex + 10) {
      // Empty line might be part of our block
      endIndex = i;
      i++;
    } else {
      // We've reached content that's not part of our block
      inAlexandriaBlock = false;
    }
  }

  // Remove the section (inclusive)
  lines.splice(startIndex, endIndex - startIndex + 1);

  // Clean up extra blank lines
  let result = lines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  if (result) {
    fs.writeFileSync(hookPath, result + '\n', 'utf8');
  } else {
    // If hook is now empty, remove it
    fs.unlinkSync(hookPath);
  }
}

export function createHooksCommand(): Command {
  const command = new Command('hooks');

  command
    .description('Manage husky pre-commit hooks for Alexandria')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('--add', 'Add Alexandria validation to pre-commit hook')
    .option('--remove', 'Remove Alexandria validation from pre-commit hook')
    .option('--check', 'Check if Alexandria validation exists in pre-commit hook')
    .option('--init', 'Initialize husky if not already installed')
    .action((options) => {
      try {
        const repoPath = getRepositoryRoot(options.path);

        // Check if it's a git repository
        if (!fs.existsSync(path.join(repoPath, '.git'))) {
          console.error('❌ Not a git repository');
          process.exit(1);
        }

        // Handle init option
        if (options.init) {
          initializeHusky(repoPath);
          return;
        }

        // Check if husky is installed
        if (!isHuskyInstalled(repoPath)) {
          if (options.check) {
            console.log('❌ Husky is not installed');
            console.log('   Run "alexandria hooks --init" to install husky');
            process.exit(1);
          } else if (options.add) {
            console.log('❌ Husky is not installed');
            console.log('   Run "alexandria hooks --init" first to install husky');
            process.exit(1);
          } else if (options.remove) {
            console.log('ℹ️  Husky is not installed');
            return;
          } else {
            console.log('❌ Husky is not installed in this repository');
            console.log('\nTo install husky and set up Alexandria hooks:');
            console.log('  alexandria hooks --init --add');
            process.exit(1);
          }
        }

        const hasHook = hasAlexandriaHook(repoPath);

        if (options.check) {
          if (hasHook) {
            console.log('✅ Alexandria validation found in pre-commit hook');
          } else {
            console.log('❌ No Alexandria validation in pre-commit hook');
            process.exit(1);
          }
        } else if (options.add) {
          if (hasHook) {
            console.log('ℹ️  Alexandria validation already exists in pre-commit hook');
          } else {
            addAlexandriaHook(repoPath);
            console.log('✅ Added Alexandria validation to pre-commit hook');
            console.log('\nPre-commit hook will now:');
            console.log('  • Validate all Alexandria views');
            console.log('  • Run Alexandria lint checks');
          }
        } else if (options.remove) {
          if (!hasHook) {
            console.log('ℹ️  No Alexandria validation found in pre-commit hook');
          } else {
            removeAlexandriaHook(repoPath);
            console.log('✅ Removed Alexandria validation from pre-commit hook');
          }
        } else {
          // Default action: show status
          if (hasHook) {
            console.log('✅ Pre-commit hook contains Alexandria validation');
            console.log('\nUse --remove to remove it or --check to verify');
          } else {
            console.log('ℹ️  Pre-commit hook does not contain Alexandria validation');
            console.log('\nUse --add to add it or --check to verify');
          }
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
