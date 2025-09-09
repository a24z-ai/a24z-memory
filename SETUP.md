# Alexandria Setup - Install 

```bash
npx -y a24z-memory init
```

## Step 1: Install Artifacts 

### Creates .alexandriarc.json

- Simple configuration with gitignore-based file discovery enabled by default

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

### Registers your project in the local registry
- `~/.alexandria/projects.json`

### Optional Global Registry with Github Action
- If you choose the github workflow install, you will be able to see you documentation on https://a24z-ai.github.io/Alexandria/ 

## Step 2: Start Using

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

**Ready to start?** Run `npx -y a24z-memory init` in your project directory.