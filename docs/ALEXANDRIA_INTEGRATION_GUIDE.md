# Alexandria Integration & Continuous Documentation Guide

## Overview

Alexandria provides multiple integration points to ensure your codebase documentation stays current and violations are caught early. This guide covers all integration options, from simple pre-commit hooks to comprehensive CI/CD pipelines.

## Quick Integration Status Check

To quickly assess your current Alexandria integration level:

### Manual Checks
```bash
# Check for pre-commit hooks
ls -la .husky/pre-commit

# Check for GitHub Actions
ls -la .github/workflows/alexandria.yml

# Check for Alexandria configuration
ls -la .alexandriarc.json

# Check for lint-staged configuration
grep "lint-staged" package.json

# Check for memory storage
ls -la .a24z/
```

### Alexandria Adoption Assessment (Current Tools)
```bash
# Step 1: Check how many views you have
npx alexandria list

# Step 2: Validate all views are properly formatted
npx alexandria validate-all

# Step 3: Check for context quality issues
npx alexandria lint

# Step 4: Find undocumented markdown files
npx alexandria list-untracked-docs

# Step 5: Check project registration status
npx alexandria projects
```

**Adoption Level Indicators:**
- **Basic**: Has `.a24z/` directory with 1-2 views
- **Intermediate**: 5+ validated views, no lint errors
- **Advanced**: 10+ views, all docs tracked, CI/CD integrated
- **Expert**: Custom configurations, team guidelines, Agents.md

## Integration Levels

### Level 1: Basic Setup (5 minutes)

Initialize Alexandria in your project:

```bash
npx -y a24z-memory init
```

This creates:
- `.alexandriarc.json` - Configuration file
- `.a24z/` directory - Memory storage for notes and views
- Local registry entry in `~/.alexandria/projects.json`

### Level 2: Pre-commit Hooks (10 minutes)

#### Current Implementation

The repository uses Husky with lint-staged for pre-commit validation:

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "src/**/*.{ts,js}": [
      "eslint --fix",
      "prettier --write"
    ],
    "tests/**/*.{ts,js}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
echo "Running type checking..."
npm run typecheck

echo "Running lint-staged..."
npx lint-staged

echo "Testing MCP server build..."
npm run test:mcp

echo "Running tests..."
npm test
```

#### Future Alexandria-Specific Hooks

Coming soon - dedicated Alexandria linting in pre-commit:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "alexandria lint --max-warnings 0"
    }
  }
}
```

### Level 3: GitHub Actions Integration (15 minutes)

#### Automatic Documentation Registry

The `.github/workflows/alexandria.yml` workflow provides:

1. **Automatic Registration**: Updates Alexandria registry when views change
2. **PR Comments**: Notifies about documentation status
3. **Branch Awareness**: Handles default and feature branches correctly
4. **View Counting**: Tracks number of codebase views

```yaml
name: Update Alexandria Documentation

on:
  pull_request:
    paths:
      - '.a24z/views/**'
  push:
    branches:
      - main
    paths:
      - '.a24z/views/**'

jobs:
  register-alexandria:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Register with Alexandria
        run: |
          # Automatically registers/updates your documentation
          # at https://a24z-ai.github.io/alexandria
```

### Level 4: Full CI/CD Integration (Coming Soon)

Future comprehensive integration:

```yaml
# .github/workflows/context-quality.yml
name: Context Quality Check
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: alexandria/action@v1
        with:
          config: .alexandriarc.json
          fail-on-error: true
```

## What Happens When Violations Occur

### During Development

1. **Editor Integration** (planned):
   - Real-time validation in VS Code
   - Inline warnings for missing documentation
   - Quick-fix suggestions

2. **Pre-commit Stage**:
   - **Current**: Blocks commit if tests/linting fails
   - **Future**: `alexandria lint` will check:
     - Undocumented critical paths
     - Orphaned documentation
     - Missing anchors in notes
     - Exceeding warning thresholds

### In CI/CD Pipeline

1. **Pull Request Checks**:
   - GitHub Action validates codebase views
   - Posts status comment on PR
   - Blocks merge if critical violations exist

2. **Main Branch Protection**:
   - Automatically updates Alexandria registry
   - Syncs documentation to global registry
   - Tracks documentation coverage metrics

## Configuration Options

### Basic Configuration (.alexandriarc.json)

```json
{
  "$schema": "https://raw.githubusercontent.com/a24z-ai/alexandria/main/schema/alexandriarc.json",
  "version": "1.0.0",
  "context": {
    "useGitignore": true,
    "patterns": {
      "exclude": [".a24z/**", ".alexandria/**"]
    }
  },
  "rules": {
    "require-documentation": {
      "level": "error",
      "paths": ["src/core/**", "src/api/**"]
    },
    "max-warnings": 10
  }
}
```

### Memory Configuration (.a24z/configuration.json)

```json
{
  "version": 1,
  "limits": {
    "noteMaxLength": 10000,
    "maxTagsPerNote": 10
  },
  "tags": {
    "enforceAllowedTags": true
  }
}
```

## Integration Best Practices

### 1. Start Simple
- Begin with `npx -y a24z-memory init`
- Add notes as you work: `alexandria save "insight" --anchor file.ts`
- Let the system grow organically

### 2. Progressive Enhancement
- **Week 1**: Capture insights with simple notes
- **Week 2**: Create first CodebaseView
- **Week 3**: Add pre-commit hooks
- **Month 1**: Full CI/CD integration

### 3. Team Adoption Strategy
- Start with opt-in for early adopters
- Share success stories in team meetings
- Gradually increase enforcement levels
- Make it part of onboarding process

### 4. Alexandria Usage Instructions for AI Agents (Agents.md)

#### Purpose
Create an `Agents.md` file that teaches AI agents how to use Alexandria effectively in your codebase:

```markdown
# Alexandria Usage Guide for AI Agents

## Available Alexandria Tools

When working in this codebase, you have access to Alexandria for documentation management:

### Reading Documentation
- Use `npx alexandria list` to see all available codebase views
- Use `npx alexandria validate <view-name>` to check a view's validity
- CodebaseViews are in `.a24z/views/` directory

### Creating Documentation
- Use `npx alexandria save <note>` to capture insights
- Use `npx alexandria add-doc <file.md>` to add documentation to the library
- Always anchor notes to specific files with `--anchor <file>`

### Best Practices
1. Before making changes, check for existing notes: `npx alexandria list`
2. After significant changes, document decisions: `npx alexandria save "why we did X" --anchor file.ts`
3. Keep CodebaseViews updated when file structure changes
4. Use appropriate tags: bug, feature, architecture, performance

## Project-Specific Alexandria Configuration

[Document any custom Alexandria setup for this project]
- Custom tags we use: [list them]
- Important CodebaseViews to reference: [list key views]
- Documentation standards: [any specific requirements]
```

#### Implementation
1. **Create Agents.md in your repository root**:
   ```bash
   cat > Agents.md << 'EOF'
   # Alexandria Usage Guide for AI Agents
   
   This codebase uses Alexandria for documentation. As an AI agent, you should:
   
   1. Check existing documentation: `npx alexandria list`
   2. Add documentation: `npx alexandria add-doc <file.md>`
   3. Validate views: `npx alexandria validate-all`
   EOF
   ```

2. **Add to your AI agent's context**:
   - Include Agents.md in your project root
   - Reference it in `.cursorrules` or similar AI config files
   - Ensure agents read it when starting work

3. **Keep it updated with**:
   - Your team's Alexandria workflow
   - Common commands agents should use
   - Project-specific documentation patterns
   - Links to key CodebaseViews

#### What to Include in Agents.md
- **Alexandria CLI commands** relevant to your workflow
- **Location of views**: `.a24z/views/` directory structure
- **Documentation standards**: How your team uses Alexandria
- **Key views to reference**: Important CodebaseViews for context
- **Common workflows**: Step-by-step Alexandria usage patterns

### 5. Violation Response Strategy

#### For New Code
- Require documentation before merge
- Use PR comments for gentle reminders
- Provide templates and examples

#### For Legacy Code
- Set baseline with current state
- Document as you touch files
- Gradual improvement over sprints
- Track coverage metrics

## Monitoring Integration Health

### Command-Line Tools

#### Currently Available Commands

```bash
# List all codebase views and their status
npx alexandria list

# Validate all views for schema compliance
npx alexandria validate-all

# Lint for context quality issues
npx alexandria lint

# Find documentation not in any CodebaseView
npx alexandria list-untracked-docs

# Manage project registry
npx alexandria projects
```

#### Coming Soon (Planned)

These important commands are in development to provide comprehensive adoption metrics:

```bash
# Check documentation coverage (COMING SOON)
alexandria coverage
# Will show: % of files documented, coverage by directory, heat map

# Show comprehensive integration status (COMING SOON)
alexandria status  
# Will show: hooks installed, CI/CD setup, view count, note count, team adoption metrics
```

**Note**: Until these commands are available, use the combination of `list`, `validate-all`, and `lint` to assess your Alexandria adoption level.

### Metrics to Track

1. **Documentation Coverage**: % of critical paths documented
2. **Note Quality**: Average confidence levels
3. **Update Frequency**: How often docs are updated
4. **Team Participation**: Number of contributors
5. **AI Utilization**: How often AI agents use the context

## Troubleshooting Common Issues

### Pre-commit Hook Failures

```bash
# Skip hooks temporarily (use sparingly)
git commit --no-verify

# Fix and retry
alexandria lint --fix
git add -A
git commit
```

### GitHub Action Failures

Check the action logs for:
- Network connectivity to Alexandria registry
- Valid JSON in codebase views
- Correct branch permissions

### Missing Documentation Warnings

```bash
# Find what needs documentation
alexandria lint --verbose

# Auto-generate basic documentation
alexandria scaffold --path src/

# Add specific note
alexandria save "Explanation" --anchor src/file.ts --type explanation
```

## Future Roadmap

### Short Term (Next Month)
- `alexandria status` command for comprehensive adoption metrics
- `alexandria coverage` command for documentation coverage analysis
- `alexandria lint --fix` capability for auto-fixing issues
- VS Code extension with inline warnings
- Watch mode for development

### Medium Term (Next Quarter)
- Enterprise config presets
- Metrics dashboard
- Advanced pre-commit hooks
- IDE plugins for JetBrains, Vim

### Long Term (Next Year)
- AI-powered documentation suggestions
- Automatic PR documentation generation
- Cross-repository knowledge graph
- Team knowledge analytics

## Getting Help

- **Documentation**: https://a24z-ai.github.io/alexandria
- **Issues**: https://github.com/a24z-ai/a24z-memory/issues
- **Discord**: Coming soon
- **Email**: support@a24z.ai

## Quick Reference

| Integration Type | Setup Time | Enforcement Level | Best For |
|-----------------|------------|-------------------|----------|
| Basic Init | 5 min | None | Personal projects |
| Pre-commit | 10 min | Local | Small teams |
| GitHub Actions | 15 min | PR/Push | Open source |
| Full CI/CD | 30 min | Strict | Enterprise |

---

**Ready to integrate?** Start with `npx -y a24z-memory init` and grow from there. Alexandria is designed to provide value at every integration level, from simple notes to comprehensive documentation systems.