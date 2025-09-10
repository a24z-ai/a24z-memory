# Alexandria Hooks Documentation

## Overview

Alexandria provides a flexible pre-commit hook system that automatically validates your codebase and documentation before each commit. This ensures consistency and prevents critical issues from entering your repository.

## Table of Contents

- [Installation](#installation)
- [Hook Management](#hook-management)
- [What Hooks Do](#what-hooks-do)
- [Configuration](#configuration)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Installation

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

## Hook Management

### Adding Hooks

The `alexandria hooks --add` command:
- Installs husky if not present
- Creates or updates the `.husky/pre-commit` file
- Handles existing hooks intelligently:
  - Replaces placeholder `npm test` commands
  - Preserves existing meaningful commands
  - Appends Alexandria validation to existing setups

### Removing Hooks

The `alexandria hooks --remove` command:
- Removes Alexandria validation from pre-commit hooks
- Preserves other commands in the hook file
- Does not uninstall husky itself

### Checking Status

Use `alexandria hooks --check` to verify:
- If husky is installed
- If pre-commit hooks exist
- If Alexandria validation is configured

## What Hooks Do

When enabled, pre-commit hooks will:

1. **Validate all Alexandria views** - Ensures all codebase views are structurally valid
2. **Run lint checks** - Checks for documentation quality issues using Alexandria's rules

By default, hooks only fail on **errors**, not warnings. This allows you to commit with minor issues while preventing critical problems.

## Configuration

### Hook Behavior

Configure hook strictness in your `.husky/pre-commit` file:

```bash
# Fail only on critical errors (recommended for development)
npx alexandria validate-all --errors-only
npx alexandria lint --errors-only

# Fail on any violation (strict mode for production)
npx alexandria validate-all
npx alexandria lint

# Show only views with issues
npx alexandria validate-all --issues-only

# Validate specific views only
npx alexandria validate-all --views architecture-view setup-guide
```

### Integration with CI/CD

For automated checks in CI/CD pipelines:

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

## Examples

### Development Setup

For active development where you want notifications but not blocks:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Only fail on errors, not warnings
npx alexandria validate-all --errors-only
npx alexandria lint --errors-only
```

### Strict Production Setup

For main branches where all issues should be resolved:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Fail on any violation
npx alexandria validate-all
npx alexandria lint
```

### Mixed Environment

Different commands for different scenarios:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run existing tests first
npm test

# Then validate Alexandria
if [ "$CI" = "true" ]; then
  # Strict mode in CI
  npx alexandria validate-all
  npx alexandria lint
else
  # Lenient mode for local development
  npx alexandria validate-all --errors-only
  npx alexandria lint --errors-only
fi
```

## Troubleshooting

### Common Issues

1. **"Alexandria validation failed" during commit**
   - Run `alexandria validate-all` to see detailed errors
   - Fix critical errors in your views
   - Or use `--errors-only` flag for less strict validation

2. **Hooks not running**
   - Check if husky is installed: `alexandria hooks --check`
   - Reinstall hooks: `alexandria hooks --remove && alexandria hooks --add`
   - Verify `.husky/pre-commit` file exists and is executable

3. **Default `npm test` placeholder interfering**
   - Alexandria automatically handles this when you run `alexandria hooks --add`
   - The placeholder is replaced with Alexandria validation
   - Existing meaningful hooks are preserved

4. **Permission issues**
   - Ensure `.husky/pre-commit` is executable: `chmod +x .husky/pre-commit`
   - Check that husky is properly installed in your project

### Getting Help

- Run `alexandria hooks --help` for command-specific help
- Check hook file contents: `cat .husky/pre-commit`
- Test hooks manually: `npx alexandria validate-all`
- Review Alexandria configuration in `.alexandriarc.json`

## Best Practices

1. **Start lenient** - Use `--errors-only` initially while your team adapts
2. **Test locally** - Run validation commands manually before relying on hooks
3. **Document exceptions** - If certain validations shouldn't apply, document why
4. **Regular maintenance** - Periodically review and update hook configurations
5. **Team alignment** - Ensure all team members understand the validation rules
6. **Gradual adoption** - Introduce stricter validation over time as code quality improves