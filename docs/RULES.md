# Alexandria Rules Documentation

## Overview

Alexandria's rule system helps you organize and validate your documentation and codebase views. These rules ensure that your documentation remains well-structured, up-to-date, and accessible to both human developers and AI agents.

## Table of Contents

- [Document Organization Rules](#document-organization-rules)
- [Document Validation Rules](#document-validation-rules)
- [Rule Configuration](#rule-configuration)
- [Severity Levels](#severity-levels)
- [Command Line Usage](#command-line-usage)
- [Configuration Examples](#configuration-examples)

## Document Organization Rules

### `document-organization`

**Purpose:** Ensures documentation files are properly organized in designated folders rather than scattered throughout the codebase.

**Default Severity:** `warning`

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

**How to Fix:**
- Move documentation files to a designated documentation folder
- Update any references to the moved files
- Consider creating a logical folder structure within your docs directory

### `filename-convention`

**Purpose:** Enforces consistent filename conventions for documentation files

**Default Severity:** `warning`

**How it works:**
- Scans documentation files (default: `.md`, `.mdx`) in the repository
- Validates filenames against specified naming conventions
- Supports multiple styles: `snake_case`, `kebab-case`, `camelCase`, `PascalCase`, `lowercase`, `UPPERCASE`
- Allows custom separators and case enforcement
- Can auto-fix violations by renaming files (when `autoFix: true`)

**Configuration Options:**
- `style`: Naming style to enforce (`kebab-case`, `snake_case`, `camelCase`, `PascalCase`, `lowercase`, `UPPERCASE`) (default: `kebab-case`)
- `separator`: Custom separator character (`_`, `-`, ` `, `.`) - overrides style
- `caseStyle`: Additional case enforcement (`lower`, `upper`, `mixed`)
- `extensions`: File extensions to check (default: `['.md', '.mdx']`)
- `exclude`: Glob patterns to exclude from checking
- `exceptions`: Exact filenames to allow as exceptions (default: common files like `README.md`)
- `documentFoldersOnly`: Only check files in documentation folders (default: `false`)
- `autoFix`: Enable auto-fix by renaming files (default: `false`)

**Impact:** Inconsistent filename conventions make it harder to locate and reference documentation, reducing maintainability and professional appearance.

**Example Violation:**
```
docs/api_reference.md
    ⚠ File "api_reference.md" should be named "api-reference.md" to match kebab-case convention
      rule: filename-convention
```

**How to Fix:**
- Rename files to match the specified convention
- Add files to the exceptions list if they should keep their current names
- Adjust the configuration to match your preferred naming style
- Enable `autoFix: true` for automatic renaming (use with caution)

**Configuration Examples:**

Strict kebab-case for documentation:
```json
{
  "id": "filename-convention",
  "severity": "error",
  "options": {
    "style": "kebab-case",
    "documentFoldersOnly": true,
    "exceptions": ["README.md", "API.md"]
  }
}
```

Snake case with uppercase:
```json
{
  "id": "filename-convention",
  "severity": "warning",
  "options": {
    "style": "snake_case",
    "caseStyle": "upper",
    "extensions": [".md", ".txt", ".doc"]
  }
}
```

Custom separator with auto-fix:
```json
{
  "id": "filename-convention",
  "severity": "warning",
  "options": {
    "separator": "_",
    "caseStyle": "lower",
    "autoFix": true,
    "exclude": ["legacy/**", "vendor/**"]
  }
}
```

## Document Validation Rules

### `require-references`

**Purpose:** Ensures every markdown file in your repository is associated with at least one CodebaseView.

**Default Severity:** `error`

**How it works:**
- Scans all markdown files in the repository
- Checks if each file is referenced by at least one Alexandria codebase view
- Reports files that exist but aren't part of any structured view

**Impact:** When markdown files aren't associated with views, AI agents lack structured context for understanding the documentation.

**Example Violation:**
```
docs/API.md
    ✖ Markdown file "docs/API.md" is not associated with any CodebaseView
      rule: require-references
```

**How to Fix:**
- Create a codebase view that includes the orphaned documentation
- Add the file to an existing relevant view
- If the file is truly standalone, consider whether it should be removed or integrated

### `orphaned-references`

**Purpose:** Detects when codebase views reference files that don't exist.

**Default Severity:** `error`

**How it works:**
- Examines all codebase view configurations
- Verifies that every referenced file actually exists in the repository
- Reports any broken references

**Impact:** AI agents will try to reference non-existent files, causing errors and confusion.

**Example Violation:**
```
views/architecture.json
    ✖ View "architecture" cell "Core" references non-existent file: src/deleted-file.ts
      rule: orphaned-references
```

**How to Fix:**
- Remove references to deleted files from your views
- Update file paths if files were moved
- Restore accidentally deleted files if they're still needed

### `stale-references`

**Purpose:** Identifies when overview documentation hasn't been updated after the code files it references have changed.

**Default Severity:** `warning`

**How it works:**
- For views with an `overviewPath`, compares the overview file's last modification against all referenced code files
- Reports how many days the overview is out of date relative to the most recently changed file
- Only checks views that have an overview file defined
- Uses Git history to determine modification dates

**Impact:** Outdated documentation can mislead AI agents about the current state of your codebase, causing them to use obsolete patterns or incorrect assumptions.

**Example Violation:**
```
docs/api-overview.md
    ⚠ Overview "docs/api-overview.md" is 5 days behind the latest changes in referenced files
      rule: stale-references
```

**How to Fix:**
- Review and update the overview documentation
- Check if recent code changes affect the documented patterns or architecture
- Consider setting up regular documentation review cycles

## Rule Configuration

Configure rules in your `.alexandriarc.json` file:

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
        "id": "document-organization",
        "name": "Document Organization",
        "severity": "warning",
        "enabled": true,
        "options": {
          "documentFolders": ["docs", "documentation", "guides"],
          "rootExceptions": ["README.md", "LICENSE.md", "CONTRIBUTING.md", "CHANGELOG.md"],
          "checkNested": true
        }
      },
      {
        "id": "filename-convention",
        "name": "Filename Convention",
        "severity": "warning",
        "enabled": true,
        "options": {
          "style": "kebab-case",
          "exceptions": ["README.md", "LICENSE.md", "CONTRIBUTING.md", "CHANGELOG.md"]
        }
      },
      {
        "id": "require-references",
        "name": "Require View Association",
        "severity": "error",
        "enabled": true
      },
      {
        "id": "orphaned-references",
        "name": "Orphaned References",
        "severity": "error",
        "enabled": true
      },
      {
        "id": "stale-references",
        "name": "Stale Context",
        "severity": "warning",
        "enabled": true
      }
    ]
  }
}
```

## Severity Levels

Rules can have three severity levels that affect both output display and exit codes:

- **`error`** - Critical issues that should block commits (exit code 1)
  - Use for structural problems that break functionality
  - Recommended for: `orphaned-references`, `require-references`

- **`warning`** - Issues that should be fixed but don't block commits
  - Use for quality improvements that don't break functionality
  - Recommended for: `document-organization`, `stale-references`

- **`info`** - Informational messages for awareness
  - Use for suggestions and non-critical observations
  - Good for gradual adoption of new practices

## Command Line Usage

### Basic Linting

```bash
# Run all enabled lint rules
alexandria lint

# Only exit with error code on errors (not warnings)
alexandria lint --errors-only

# Output results as JSON for programmatic processing
alexandria lint --json

# Only show errors (quiet mode)
alexandria lint --quiet
```

### Rule Selection

```bash
# Enable specific rules (others remain as configured)
alexandria lint --enable document-organization require-references

# Disable specific rules for this run
alexandria lint --disable stale-references

# Combine with other options
alexandria lint --enable document-organization --errors-only
```

### Integration with Validation

```bash
# Run both validation and linting
alexandria validate-all && alexandria lint

# Focus on critical issues only
alexandria validate-all --errors-only && alexandria lint --errors-only
```

## Configuration Examples

### Strict Documentation Organization

For teams that want well-organized documentation:

```json
{
  "rules": [
    {
      "id": "document-organization",
      "severity": "error",
      "enabled": true,
      "options": {
        "documentFolders": ["docs"],
        "rootExceptions": ["README.md"],
        "checkNested": false
      }
    }
  ]
}
```

### Lenient Development Setup

For active development with frequent changes:

```json
{
  "rules": [
    {
      "id": "document-organization",
      "severity": "info",
      "enabled": true
    },
    {
      "id": "stale-references",
      "severity": "info",
      "enabled": true
    },
    {
      "id": "require-references",
      "severity": "warning",
      "enabled": true
    }
  ]
}
```

### Production-Ready Setup

For mature projects with established documentation practices:

```json
{
  "rules": [
    {
      "id": "document-organization",
      "severity": "warning",
      "enabled": true,
      "options": {
        "documentFolders": ["docs", "guides", "wiki"],
        "checkNested": true
      }
    },
    {
      "id": "filename-convention",
      "severity": "warning",
      "enabled": true,
      "options": {
        "style": "kebab-case",
        "documentFoldersOnly": true,
        "exceptions": ["README.md", "LICENSE.md", "CONTRIBUTING.md", "CHANGELOG.md", "CODE_OF_CONDUCT.md"]
      }
    },
    {
      "id": "require-references",
      "severity": "error",
      "enabled": true
    },
    {
      "id": "orphaned-references",
      "severity": "error",
      "enabled": true
    },
    {
      "id": "stale-references",
      "severity": "warning",
      "enabled": true
    }
  ]
}
```

## Best Practices

### Document Organization
1. **Establish a clear structure** - Use consistent folder names like `docs/` or `documentation/`
2. **Group related content** - Create subdirectories for different types of documentation
3. **Keep root clean** - Only allow essential files like README.md in the repository root
4. **Use meaningful names** - Choose descriptive names for documentation files and folders

### Document Validation
1. **Regular maintenance** - Schedule periodic reviews to address stale context warnings
2. **View-first approach** - Create views for new documentation as you write it
3. **Clean up orphans** - Remove or update broken references promptly
4. **Incremental improvement** - Start with warnings and gradually increase severity

### Rule Management
1. **Start lenient** - Begin with `warning` or `info` severity while teams adapt
2. **Customize per environment** - Use stricter rules for main branches, lenient for development
3. **Document exceptions** - If certain files don't fit the rules, document why
4. **Team alignment** - Ensure all team members understand the organization principles