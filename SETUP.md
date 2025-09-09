# Alexandria Setup - Get Started in Minutes

Alexandria makes it incredibly easy to add intelligent memory to your codebase. With just two simple commands, you'll have a complete system that helps AI assistants understand your project's context and structure.

## Why Setup Is So Simple

Alexandria is designed for **zero-friction adoption**. Unlike complex documentation systems that require extensive configuration, Alexandria works with your existing workflow:

- **No new file formats** - Uses standard JSON and Markdown
- **Git-native** - Everything is tracked alongside your code
- **IDE-agnostic** - Works with any editor or AI assistant
- **Incremental adoption** - Start small, grow as needed

## Step 1: Initialize Alexandria

```bash
npx -y a24z-memory init
```

This single command (implemented in `src/cli-alexandria/commands/init.ts`):
- Creates a minimal `.alexandriarc.json` configuration using the schema from `src/config/schema.ts`
- Registers your project in the global Alexandria registry via `src/projects-core/ProjectRegistryStore.ts`
- Sets up automatic .gitignore pattern usage through the config system in `src/config/`
- Offers to install GitHub Actions workflow (optional)

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
2. **Week 2**: Create your first CodebaseView with `alexandria from-doc` 
3. **Week 3**: Set up automated linting in CI with `alexandria lint`
4. **Month 1**: Team members discover searchable institutional knowledge

The beauty of Alexandria is that each step is optional and valuable on its own. You're not committing to a complex system - you're adding simple tools that compound over time.

---

**Ready to start?** Run `npx -y a24z-memory init` in your project directory.