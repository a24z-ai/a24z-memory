# Alexandria Hooks and Rules Documentation

## Overview

Alexandria provides a flexible system for validating and linting your codebase through pre-commit hooks and configurable rules. This ensures consistency and quality in your documentation and codebase views.

## Table of Contents

- [Pre-commit Hooks](#pre-commit-hooks)
- [Lint Rules](#lint-rules)
- [Configuration](#configuration)
- [Command Line Options](#command-line-options)
- [Examples](#examples)

## Pre-commit Hooks

### Installation

Alexandria can automatically set up husky pre-commit hooks to validate your codebase before each commit.

```bash
# Install hooks during init
alexandria init

# Initialize husky if not already installed
alexandria hooks --init

# Add Alexandria validation to pre-commit hook
alexandria hooks --add

# Remove hooks
alexandria hooks --remove

# Check if hooks are installed
alexandria hooks --check
```

**Note:** When adding Alexandria hooks to a new project, the command automatically detects and replaces the default `npm test` placeholder that husky creates. If your pre-commit hook only contains `npm test`, it will be replaced entirely with Alexandria validation. If you have other commands in your pre-commit hook, Alexandria validation will be appended to preserve your existing setup.

### What Hooks Do

When enabled, pre-commit hooks will:

1. **Validate all Alexandria views** - Ensures all codebase views are structurally valid
2. **Run lint checks** - Checks for documentation quality issues

By default, hooks only fail on **errors**, not warnings. This allows you to commit with minor issues while preventing critical problems.

## Lint Rules

Alexandria includes four built-in lint rules that help maintain documentation quality:

### 1. `require-view-association`

**Default Severity:** `error` (configurable)

**Description:** Ensures every markdown file in your repository is associated with at least one CodebaseView.

**Impact:** When markdown files aren't associated with views, AI agents lack structured context for understanding the documentation.

**Example Violation:**
```
docs/API.md
    ✖ Markdown file "docs/API.md" is not associated with any CodebaseView
      rule: require-view-association
```

### 2. `orphaned-references`

**Default Severity:** `error` (configurable)

**Description:** Detects when codebase views reference files that don't exist.

**Impact:** AI agents will try to reference non-existent files, causing errors and confusion.

**Example Violation:**
```
views/architecture.json
    ✖ View "architecture" cell "Core" references non-existent file: src/deleted-file.ts
      rule: orphaned-references
```

### 3. `stale-context`

**Default Severity:** `warning` (configurable)

**Description:** Identifies when overview documentation hasn't been updated after the code files it references have changed. This rule checks the last Git modification date of the overview markdown file against all referenced files in the view.

**How it works:**
- For views with an `overviewPath`, compares the overview file's last modification against all referenced code files
- Reports how many days the overview is out of date relative to the most recently changed file
- Only checks views that have an overview file defined
- Uses Git history to determine modification dates

**Impact:** Outdated documentation can mislead AI agents about the current state of your codebase, causing them to use obsolete patterns or incorrect assumptions.

### 4. `document-organization`

**Default Severity:** `warning` (configurable)

**Description:** Ensures documentation files are properly organized in designated folders rather than scattered throughout the codebase.

**How it works:**
- Scans for all markdown files (`.md` and `.mdx`) in the repository
- Checks if documentation files are in approved locations:
  - Designated documentation folders (default: `docs`, `documentation`, `doc`)
  - Root directory for standard files (README, LICENSE, CONTRIBUTING, etc.)
  - Special directories like `.github`, `templates`, `examples`
- Reports violations when documentation is found outside approved locations

**Configuration Options:**
- `documentFolders`: Array of folder names where documentation should be stored (default: `['docs', 'documentation', 'doc']`)
- `rootExceptions`: Array of filenames allowed in the root directory (default: common files like README.md, LICENSE.md)
- `checkNested`: Whether to check parent directories for doc folders (default: `true`)

**Impact:** Disorganized documentation makes it harder for both humans and AI agents to find relevant information. Keeping docs in standard locations improves discoverability and maintainability.

**Example Violation:**
```
src/components/Button.md
    ⚠ Documentation file "src/components/Button.md" should be in a documentation folder (e.g., docs/, documentation/)
      rule: document-organization
```

## Configuration

### Rule Configuration in `.alexandriarc.json`

You can configure rule severity and enable/disable rules in your `.alexandriarc.json` file:

```json
{
  "$schema": "https://raw.githubusercontent.com/a24z-ai/alexandria/main/schema/alexandriarc.json",
  "version": "1.0.0",
  "context": {
    "useGitignore": true,
    "patterns": {
      "exclude": [".alexandria/**"]
    },
    "rules": [
      {
        "id": "require-view-association",
        "name": "Require View Association",
        "severity": "warning",  // Changed from error to warning
        "enabled": true
      },
      {
        "id": "orphaned-references",
        "name": "Orphaned References",
        "severity": "error",
        "enabled": true
      },
      {
        "id": "stale-context",
        "name": "Stale Context",
        "severity": "info",     // Changed from warning to info
        "enabled": false        // Disabled
      },
      {
        "id": "document-organization",
        "name": "Document Organization",
        "severity": "warning",
        "enabled": true,
        "options": {
          "documentFolders": ["docs", "documentation"],
          "rootExceptions": ["README.md", "LICENSE.md", "CONTRIBUTING.md"],
          "checkNested": true
        }
      }
    ]
  }
}
```

### Severity Levels

Rules can have three severity levels:

- **`error`** - Critical issues that should block commits (exit code 1)
- **`warning`** - Issues that should be fixed but don't block commits
- **`info`** - Informational messages for awareness

## Command Line Options

### Validation Commands

```bash
# Validate all views
alexandria validate-all

# Only show errors (not warnings)
alexandria validate-all --errors-only

# Show only views with issues
alexandria validate-all --issues-only

# Validate specific views
alexandria validate-all --views architecture-view setup-guide
```

### Lint Commands

```bash
# Run all lint rules
alexandria lint

# Only exit with error code on errors (not warnings)
alexandria lint --errors-only

# Output as JSON
alexandria lint --json

# Only show errors (quiet mode)
alexandria lint --quiet

# Enable specific rules
alexandria lint --enable require-view-association orphaned-references

# Disable specific rules
alexandria lint --disable stale-context
```

## Examples

### Example 1: Development Setup with Warnings

For active development where you want to be notified of issues but not blocked:

**.alexandriarc.json:**
```json
{
  "version": "1.0.0",
  "context": {
    "rules": [
      {
        "id": "require-view-association",
        "severity": "warning",
        "enabled": true
      },
      {
        "id": "orphaned-references",
        "severity": "warning",
        "enabled": true
      }
    ]
  }
}
```

**.husky/pre-commit:**
```bash
# Only fail on errors, not warnings
npx alexandria validate-all --errors-only
npx alexandria lint --errors-only
```

### Example 2: Strict Production Setup

For production or main branches where all issues should be resolved:

**.alexandriarc.json:**
```json
{
  "version": "1.0.0",
  "context": {
    "rules": [
      {
        "id": "require-view-association",
        "severity": "error",
        "enabled": true
      },
      {
        "id": "orphaned-references",
        "severity": "error",
        "enabled": true
      },
      {
        "id": "stale-context",
        "severity": "error",
        "enabled": true
      }
    ]
  }
}
```

**.husky/pre-commit:**
```bash
# Fail on any violation
npx alexandria validate-all
npx alexandria lint
```

### Example 3: Minimal Setup

For projects that only care about critical structural issues:

**.alexandriarc.json:**
```json
{
  "version": "1.0.0",
  "context": {
    "rules": [
      {
        "id": "require-view-association",
        "severity": "info",
        "enabled": false
      },
      {
        "id": "orphaned-references",
        "severity": "error",
        "enabled": true
      },
      {
        "id": "stale-context",
        "severity": "info",
        "enabled": false
      }
    ]
  }
}
```

### Example 4: CI/CD Pipeline

For automated checks in CI/CD:

```yaml
# .github/workflows/alexandria.yml
name: Alexandria Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Validate Alexandria views
        run: npx alexandria validate-all
      
      - name: Run Alexandria lint
        run: npx alexandria lint --json > lint-results.json
      
      - name: Upload lint results
        uses: actions/upload-artifact@v2
        with:
          name: lint-results
          path: lint-results.json
```

## Troubleshooting

### Common Issues

1. **"Alexandria validation failed" during commit**
   - Run `alexandria validate-all` to see detailed errors
   - Fix critical errors in your views
   - Or configure rules as warnings if appropriate

2. **"No Alexandria guidance in AGENTS.md"**
   - Run `alexandria agents --add` to add guidance
   - Or disable in init: `alexandria init --no-agents`

3. **Too many warnings cluttering output**
   - Use `--errors-only` flag to focus on critical issues
   - Or disable specific rules in `.alexandriarc.json`

4. **Hooks not running**
   - Check if husky is installed: `alexandria hooks --check`
   - Reinstall hooks: `alexandria hooks --remove && alexandria hooks --add`

5. **Default `npm test` placeholder interfering with hooks**
   - Alexandria automatically handles this when you run `alexandria hooks --add`
   - If your pre-commit only contains `npm test`, it will be replaced with Alexandria validation
   - Existing hooks with real content are preserved

### Getting Help

- Run `alexandria --help` for command overview
- Run `alexandria <command> --help` for specific command help
- Check `.alexandria/views/` for view structure issues
- Review `.alexandriarc.json` for configuration problems

## Best Practices

1. **Start with warnings** - Configure rules as warnings initially, then increase severity as your team adapts
2. **Use --errors-only in hooks** - Prevents minor issues from blocking critical commits
3. **Review warnings regularly** - Schedule time to address warnings before they accumulate
4. **Document exceptions** - If certain files shouldn't be associated with views, document why
5. **Customize per environment** - Use different configurations for development vs production branches