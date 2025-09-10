Always start by asking a24z-memory mcp to ask questions about files.

## Alexandria

Alexandria is a unified context management system that helps AI assistants understand your project structure and documentation through structured codebase views.

### Key Commands

```bash
# List all codebase views in the repository
alexandria list

# Add a specific documentation file to the library
alexandria add-doc README.md

# Add all untracked documentation files at once
alexandria add-all-docs

# Validate a specific codebase view
alexandria validate <view-name>

# Validate all codebase views
alexandria validate-all

# Check for context quality issues
alexandria lint
```

### What Alexandria Provides

- **Codebase Views**: Structured representations stored in `.alexandria/views/` that contain:
  - Documentation content organized in a grid layout
  - File references to relevant source code files
  - Relationships between different parts of your codebase
- **Context Library**: Maintains important documents with explicit file references for AI understanding
- **Quality Validation**: Ensures all views and file references are valid and properly formatted

### Understanding Codebase Views

Each codebase view in `.alexandria/views/` contains:
- **Grouped File References**: Related source files grouped together (e.g., `files: ['src/auth/login.ts', 'src/auth/session.ts']`)
- **Documentation Links**: Connections between documentation and the code it describes
- **Contextual Relationships**: Explicit mappings of which files work together

When exploring a codebase with Alexandria, these views tell you which files are related and should be considered together.

### Working with Alexandria

1. **Check existing views**: Use `alexandria list` to see what documentation is already indexed
2. **Add new documentation**: Use `alexandria add-doc <file>` for important files that should be part of the context
3. **Bulk add documents**: Use `alexandria add-all-docs` to quickly add all untracked markdown files
4. **Validate changes**: Always run `alexandria validate-all` to ensure all file references point to existing files

### Pre-commit Integration

If the project has a pre-commit hook configured, `alexandria lint` will run automatically to check for:
- Orphaned references in codebase views
- Stale context that needs updating
- Invalid view structures

### Repository Views

For projects with GitHub integration, codebase views are automatically published to:
`https://a24z-ai.github.io/Alexandria/repo/?owner=<owner>&name=<repo>`
