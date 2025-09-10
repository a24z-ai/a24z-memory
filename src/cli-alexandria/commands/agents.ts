/**
 * Agents command - Manage Alexandria guidance in AGENTS.md files
 */

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getRepositoryRoot } from '../utils/repository.js';

const ALEXANDRIA_SECTION_HEADER = '## Alexandria';
const AGENTS_FILENAME = 'AGENTS.md';

/**
 * Get the Alexandria guidance content from template
 */
function getAlexandriaGuidance(): string {
  const templatePath = path.join(
    path.dirname(import.meta.url.replace('file://', '')),
    '../../../templates/agents-guidance.md'
  );
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }

  // Fallback to embedded content if template file is not found
  return `## Alexandria

Alexandria is a unified context management system that helps AI assistants understand your project structure and documentation through structured codebase views.

### Key Commands

\`\`\`bash
# List all codebase views in the repository
alexandria list

# Add a specific documentation file to the library
alexandria add-doc README.md
# Skip the interactive guidance prompt
alexandria add-doc README.md --skip-guidance
# Preview what would be created without actually creating it
alexandria add-doc README.md --skip-guidance --dry-run

# Add all untracked documentation files at once
alexandria add-all-docs

# Validate a specific codebase view
alexandria validate <view-name>

# Validate all codebase views
alexandria validate-all

# Check for context quality issues
alexandria lint
# Only fail on errors, not warnings
alexandria lint --errors-only

# Manage pre-commit hooks
alexandria hooks --add     # Add Alexandria validation to pre-commit
alexandria hooks --remove  # Remove Alexandria validation
alexandria hooks --check   # Check if hooks are installed
\`\`\`

### What Alexandria Provides

- **Codebase Views**: Structured representations stored in \`.alexandria/views/\` that contain:
  - Documentation content organized in a grid layout
  - File references to relevant source code files
  - Relationships between different parts of your codebase
- **Context Library**: Maintains important documents with explicit file references for AI understanding
- **Quality Validation**: Ensures all views and file references are valid and properly formatted

### Understanding Codebase Views

Each codebase view in \`.alexandria/views/\` contains:
- **Grouped File References**: Related source files grouped together (e.g., \`files: ['src/auth/login.ts', 'src/auth/session.ts']\`)
- **Documentation Links**: Connections between documentation and the code it describes
- **Contextual Relationships**: Explicit mappings of which files work together

When exploring a codebase with Alexandria, these views tell you which files are related and should be considered together.

### Working with Alexandria

1. **Check existing views**: Use \`alexandria list\` to see what documentation is already indexed
2. **Add new documentation**: Use \`alexandria add-doc <file>\` for important files that should be part of the context
3. **Bulk add documents**: Use \`alexandria add-all-docs\` to quickly add all untracked markdown files
4. **Validate changes**: Always run \`alexandria validate-all\` to ensure all file references point to existing files

### Pre-commit Integration

If the project has a pre-commit hook configured, \`alexandria lint\` will run automatically to check for:
- Orphaned references in codebase views
- Stale context that needs updating
- Invalid view structures

For detailed information about hooks, rules, and configuration options, see [docs/HOOKS_AND_RULES.md](../docs/HOOKS_AND_RULES.md).

### Repository Views

For projects with GitHub integration, codebase views are automatically published to:
\`https://a24z-ai.github.io/Alexandria/repo/?owner=<owner>&name=<repo>\``;
}

/**
 * Check if AGENTS.md file has Alexandria section
 */
function hasAlexandriaSection(content: string): boolean {
  return content.includes(ALEXANDRIA_SECTION_HEADER);
}

/**
 * Add Alexandria section to AGENTS.md content
 */
function addAlexandriaSection(content: string, guidance: string): string {
  // If already has section, return unchanged
  if (hasAlexandriaSection(content)) {
    return content;
  }

  // Add the guidance at the end of the file
  // Ensure proper spacing
  const trimmedContent = content.trimEnd();
  return `${trimmedContent}\n\n${guidance}\n`;
}

/**
 * Remove Alexandria section from AGENTS.md content
 */
function removeAlexandriaSection(content: string): string {
  if (!hasAlexandriaSection(content)) {
    return content;
  }

  // Split by lines and find the Alexandria section
  const lines = content.split('\n');
  const startIndex = lines.findIndex((line) => line.trim() === ALEXANDRIA_SECTION_HEADER);

  if (startIndex === -1) {
    return content;
  }

  // Find the end of the Alexandria section (next ## heading or end of file)
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].match(/^#{1,2}\s+/) && !lines[i].startsWith('###')) {
      endIndex = i;
      break;
    }
  }

  // Remove the section
  lines.splice(startIndex, endIndex - startIndex);

  // Clean up extra blank lines
  let result = lines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

export function createAgentsCommand(): Command {
  const command = new Command('agents');

  command
    .description('Manage Alexandria guidance in AGENTS.md')
    .option('-p, --path <path>', 'Repository path (defaults to current directory)')
    .option('--add', 'Add Alexandria guidance to AGENTS.md')
    .option('--remove', 'Remove Alexandria guidance from AGENTS.md')
    .option('--check', 'Check if Alexandria guidance exists in AGENTS.md')
    .action((options) => {
      try {
        const repoPath = getRepositoryRoot(options.path);
        const agentsPath = path.join(repoPath, AGENTS_FILENAME);

        // Check if AGENTS.md exists
        if (!fs.existsSync(agentsPath)) {
          if (options.check) {
            console.log(`❌ No ${AGENTS_FILENAME} file found`);
            process.exit(1);
          } else if (options.add) {
            // Create AGENTS.md with Alexandria guidance
            const guidance = getAlexandriaGuidance();
            fs.writeFileSync(agentsPath, `# AI Agent Instructions\n\n${guidance}\n`, 'utf8');
            console.log(`✅ Created ${AGENTS_FILENAME} with Alexandria guidance`);
            return;
          } else if (options.remove) {
            console.log(`ℹ️  No ${AGENTS_FILENAME} file found`);
            return;
          } else {
            console.error(`❌ No ${AGENTS_FILENAME} file found in repository root`);
            console.error(`   Create one or use --add to create with Alexandria guidance`);
            process.exit(1);
          }
        }

        // Read existing AGENTS.md
        const content = fs.readFileSync(agentsPath, 'utf8');
        const hasSection = hasAlexandriaSection(content);

        if (options.check) {
          if (hasSection) {
            console.log(`✅ Alexandria guidance found in ${AGENTS_FILENAME}`);
          } else {
            console.log(`❌ No Alexandria guidance in ${AGENTS_FILENAME}`);
            process.exit(1);
          }
        } else if (options.add) {
          if (hasSection) {
            console.log(`ℹ️  Alexandria guidance already exists in ${AGENTS_FILENAME}`);
          } else {
            const guidance = getAlexandriaGuidance();
            const updated = addAlexandriaSection(content, guidance);
            fs.writeFileSync(agentsPath, updated, 'utf8');
            console.log(`✅ Added Alexandria guidance to ${AGENTS_FILENAME}`);
          }
        } else if (options.remove) {
          if (!hasSection) {
            console.log(`ℹ️  No Alexandria guidance found in ${AGENTS_FILENAME}`);
          } else {
            const updated = removeAlexandriaSection(content);
            fs.writeFileSync(agentsPath, updated, 'utf8');
            console.log(`✅ Removed Alexandria guidance from ${AGENTS_FILENAME}`);
          }
        } else {
          // Default action: show status
          if (hasSection) {
            console.log(`✅ ${AGENTS_FILENAME} contains Alexandria guidance`);
            console.log(`\nUse --remove to remove it or --check to verify`);
          } else {
            console.log(`ℹ️  ${AGENTS_FILENAME} does not contain Alexandria guidance`);
            console.log(`\nUse --add to add it or --check to verify`);
          }
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
