# Alexandria Setup Guide

## Quick Start

```bash
# Install globally to get the alexandria command
npm install -g a24z-memory

# Initialize Alexandria in your project (interactive setup)
alexandria init
```

## What Happens During `alexandria init`

The initialization process will guide you through several optional setup steps. Each one is designed to enhance your Alexandria experience, but all are optional.

### 1. Core Configuration (Always Created)

Creates `.alexandriarc.json` with minimal, sensible defaults:

```json
{
  "$schema": "https://raw.githubusercontent.com/a24z-ai/alexandria/main/schema/alexandriarc.json",
  "version": "1.0.0",
  "context": {
    "useGitignore": true,
    "patterns": {
      "exclude": [".a24z/**", ".alexandria/**"]
    }
  }
}
```

**What this does**: Sets up Alexandria to respect your `.gitignore` patterns and excludes its own directories from analysis.

### 2. Global Project Registry (Automatic)

Registers your project in `~/.alexandria/projects.json` for easy discovery across your system.

**What this does**: Allows you to list all Alexandria-enabled projects with `alexandria projects` command.

### 3. AI Assistant Guidance (Optional)

**Question**: "Would you like to add Alexandria guidance to AGENTS.md?"

**What this does**: 
- Creates or updates `AGENTS.md` with instructions for AI assistants
- Helps Claude, Copilot, and other AI tools understand Alexandria commands
- Improves AI assistance quality when working with your codebase

**Skip if**: You don't use AI assistants or prefer to manage AGENTS.md manually

### 4. Pre-commit Hooks (Optional)

**Question**: "Would you like to set up husky pre-commit hooks?"

**What this does**:
- Installs husky if not present
- Adds Alexandria validation to your pre-commit workflow
- Runs `alexandria validate-all --errors-only` before each commit
- Runs `alexandria lint --errors-only` to check documentation quality

**Skip if**: You already have complex git hooks or prefer manual validation

### 5. GitHub Action Workflow (Optional)

**Question**: "Would you like to install the GitHub Action workflow?"

**What this does**:
- Creates `.github/workflows/alexandria.yml`
- Auto-registers your project when pushed to GitHub
- Enables documentation visibility at https://a24z-ai.github.io/Alexandria/
- Runs Alexandria validation in CI/CD pipeline

**Skip if**: You don't use GitHub Actions or have your own CI/CD setup

## Non-Interactive Setup

You can skip specific setup steps using command-line flags:

```bash
# Skip all optional features
alexandria init --no-agents --no-hooks --no-workflow

# Skip only specific features
alexandria init --no-hooks  # Skip husky setup
alexandria init --no-agents # Skip AGENTS.md
alexandria init --no-workflow # Skip GitHub Action
```

## Manual Setup Options

If you prefer manual setup or need to add features later:

```bash
# Add AI assistant guidance later
alexandria agents --add

# Set up hooks after initial setup  
alexandria hooks --add

# Install GitHub workflow separately
alexandria install-workflow
```

## After Setup: Start Using Alexandria

That's it! Alexandria is ready to use. You can immediately:

```bash
# Lint your codebase for context quality (using the rules engine in src/rules/)
npx alexandria lint

# List available views (via src/cli-alexandria/commands/list.ts)
npx alexandria list

# Create your first memory note (using MemoryPalace API in src/MemoryPalace.ts)
npx alexandria save "Important insight about auth flow" --anchor src/auth.ts
```

## What Happens During Setup

Behind the scenes, Alexandria creates a clean, minimal structure (managed by the core stores in `src/pure-core/stores/`):

```
your-project/
├── .alexandriarc.json          # Minimal config (schema: src/config/types.ts)
└── .a24z/                      # Memory storage (CodebaseViewsStore, AnchoredNotesStore)
    ├── views/                  # CodebaseViews (spatial organization)
    └── notes/                  # Anchored notes (contextual insights)

~/.alexandria/                  # Global registry (ProjectRegistryStore)
└── projects.json               # Known projects
```

## Why This Architecture Works

### Distributed by Design
Every team member gets the full memory system with their git clone. No servers, no databases, no deployment complexity.

### Git-Tracked Evolution
Your codebase memory evolves alongside your code. Branches, merges, and history work exactly as expected.

### AI-Optimized Structure
The spatial memory palace approach gives AI assistants the context they need to understand not just *what* your code does, but *why* it works that way.

### Incremental Value
Start with simple notes. Add views when you need spatial organization. Each step provides immediate value without requiring a complete system overhaul.

## Next Steps

After setup, most teams follow this natural progression:

1. **Week 1**: Use `alexandria save` to capture key insights as you work
2. **Week 2**: Create your first CodebaseView with `alexandria add-doc` 
3. **Week 3**: Set up automated linting in CI with `alexandria lint`
4. **Month 1**: Team members discover searchable institutional knowledge

The beauty of Alexandria is that each step is optional and valuable on its own. You're not committing to a complex system - you're adding simple tools that compound over time.

---

**Ready to start?** Run `npm install -g a24z-memory` then `alexandria init` in your project directory.