# AGENTS.md - a24z-Memory MCP Server

This document provides comprehensive guidance for AI coding agents working with the a24z-Memory MCP server project. It consolidates all essential information, best practices, and configuration details to help agents navigate, understand, and contribute effectively to this codebase.

## Project Overview

**a24z-Memory** is a Model Context Protocol (MCP) server that serves as a knowledge management system for storing and retrieving tribal knowledge about codebases. It allows developers to:

- Store important development insights, architectural decisions, and patterns
- Query existing knowledge using AI-powered semantic search
- Maintain institutional knowledge across teams and projects
- Integrate with AI coding assistants to provide contextual guidance

The project is built with TypeScript and provides both programmatic library access and a standalone CLI for MCP server functionality.

## Repository Structure

```
a24z-Memory/
├── src/
│   ├── cli.ts                    # Command-line interface and installation commands
│   ├── index.ts                  # Standalone MCP server entry point
│   ├── lib.ts                    # High-level API for library usage
│   ├── branding.ts               # Server branding and version info
│   ├── types.d.ts                # TypeScript declarations for external dependencies
│   ├── core-mcp/                 # Core MCP server implementation
│   │   ├── server/               # MCP server setup and request handling
│   │   │   ├── McpServer.ts      # Main server class
│   │   │   └── index.ts
│   │   ├── tools/                # Individual MCP tools
│   │   │   ├── AskA24zMemoryTool.ts      # Query knowledge base
│   │   │   ├── RepositoryNoteTool.ts      # Create knowledge notes
│   │   │   ├── GetRepositoryTagsTool.ts   # Tag management
│   │   │   ├── GetRepositoryGuidanceTool.ts # Repository guidance
│   │   │   ├── CopyGuidanceTemplateTool.ts # Template copying
│   │   │   ├── base-tool.ts               # Base tool class
│   │   │   └── index.ts
│   │   ├── store/                # Knowledge storage system
│   │   │   └── notesStore.ts     # Core storage logic
│   │   ├── types/                # TypeScript type definitions
│   │   │   ├── mcp-types.ts      # MCP-specific types
│   │   │   └── index.ts
│   │   └── utils/                # Utility functions
│   │       ├── pathNormalization.ts # Path handling utilities
│   │       └── zod-to-json-schema.ts # Schema conversion
├── templates/                    # Guidance templates
├── tests/                        # Test suites
├── dist/                        # Built output (generated)
└── *.md                         # Documentation files
```

## Development Commands

### Building and Running

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start MCP server in stdio mode
npx a24z-memory

# Install for Cursor
npx a24z-memory install-cursor

# Install for Claude
npx a24z-memory install-claude
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=tests/core-mcp/store/notesStore.test.ts
```

### Development Workflow

```bash
# Type checking
npx tsc --noEmit

# Lint code (if configured)
# Add your linting commands here

# Format code (if configured)
# Add your formatting commands here
```

## Code Style and Conventions

### TypeScript Standards

- **Strict mode**: Enabled with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- **Imports**: Use named imports with `import type` for type-only imports
- **Types**: Prefer interfaces for public APIs, avoid `any` type
- **Error handling**: Never use `@ts-expect-error` or `@ts-ignore` to suppress errors
- **Naming**: Use descriptive variable/function names with camelCase
- **Documentation**: Use JSDoc comments for TypeScript definitions

### Code Organization

- **File naming**: Use PascalCase for classes, camelCase for functions/variables
- **Directory structure**: Group related functionality in feature-based directories
- **Export strategy**: Use barrel exports (index.ts) for clean imports
- **Error handling**: Implement comprehensive error checking and type validation

### Formatting

- **Line length**: Maximum 100 characters
- **Indentation**: 2 spaces (not tabs)
- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Trailing commas**: Use in multi-line structures

## Architecture Overview

### Core Components

1. **MCP Server** (`McpServer.ts`): Main server class that manages tools and resources
2. **Tools**: Individual MCP tools for specific operations:
   - `AskA24zMemoryTool`: Query knowledge base with AI-powered search
   - `RepositoryNoteTool`: Create and store knowledge notes
   - `GetRepositoryTagsTool`: Manage note categorization tags
   - `GetRepositoryGuidanceTool`: Access repository-specific guidance
   - `CopyGuidanceTemplateTool`: Copy guidance templates
3. **Storage System** (`notesStore.ts`): File-based storage for notes and metadata
4. **Path Normalization** (`pathNormalization.ts`): Handle repository path detection and normalization

### Data Flow

1. **Tool Request** → MCP Server receives tool call request
2. **Validation** → BaseTool validates input parameters with Zod schemas
3. **Execution** → Specific tool executes business logic
4. **Storage** → Notes stored in `.a24z/repository-notes.json`
5. **Response** → Formatted result returned to client

### Storage Architecture

- **Repository-specific**: Each git repository has its own `.a24z/` directory
- **File-based**: JSON storage with versioning support
- **Normalized paths**: All paths stored relative to repository root
- **Metadata-rich**: Supports tags, confidence levels, note types, and custom metadata

## Testing Strategy

### Test Organization

- **Unit tests**: Located in `tests/core/` and `tests/core-mcp/`
- **Integration tests**: Located in `tests/integration/`
- **Debug tests**: Located in `tests/debug*.test.ts`

### Testing Frameworks

- **Jest**: Main testing framework
- **ts-jest**: TypeScript support for Jest
- **Test file patterns**: `*.test.ts` or `*.spec.ts`

### Testing Best Practices

- Write one test case at a time
- Use `expect(VALUE).toXyz(...)` instead of storing in variables
- Omit "should" from test names (e.g., `it("validates input")`)
- Mock external dependencies appropriately
- Test both success and error paths

## Security and Compliance

### Data Security

- **Local storage**: All data stored locally in `.a24z/` directories
- **No external transmission**: Knowledge stays within the repository
- **File permissions**: Standard filesystem permissions apply
- **Repository isolation**: Each repository maintains separate knowledge base

### Privacy Considerations

- **No telemetry**: No data collection or external reporting
- **Local-only**: All operations performed locally
- **User control**: Users maintain full control over their knowledge data

## Agent Guardrails

### What Agents Should Do

✅ **Always check existing notes** before starting work on any file/directory
✅ **Use `askA24zMemory`** when encountering unfamiliar patterns or complex decisions
✅ **Document learnings** after solving problems or making decisions with `create_repository_note`
✅ **Use specific queries** when asking for guidance - provide clear context
✅ **Check available tags** with `get_repository_tags` before creating notes
✅ **Follow repository guidance** from `.a24z/note-guidance.md` files

### What Agents Should NOT Do

❌ **Don't skip the knowledge check** - always query existing context first
❌ **Don't create notes without proper categorization** - use appropriate tags and types
❌ **Don't ignore repository-specific guidance** - follow established patterns
❌ **Don't use generic queries** - be specific about what guidance is needed
❌ **Don't bypass the MCP tools** - use the provided tools for all knowledge operations

## Extensibility Hooks

### Adding New Tools

1. Create new tool class extending `BaseTool`
2. Implement required `name`, `description`, and `schema` properties
3. Add tool to `McpServer.setupDefaultTools()` method
4. Export from `tools/index.ts`

### Custom Storage Backends

1. Implement storage interface matching `notesStore.ts` functions
2. Replace storage calls in tools with custom implementation
3. Ensure compatibility with existing data format

### Configuration Extensions

1. Add new configuration options to tool schemas
2. Update validation logic in tool implementations
3. Document new options in this AGENTS.md file

## Available MCP Tools

### `askA24zMemory`

Query the knowledge base for contextual guidance.

**Parameters:**
- `filePath`: Absolute path to relevant file or directory
- `query`: Specific question about the code
- `taskContext`: (Optional) Additional context about the task
- `filterTags`: (Optional) Filter by specific tags
- `filterTypes`: (Optional) Filter by note types

### `create_repository_note`

Store development insights and decisions.

**Parameters:**
- `note`: The insight or decision to document (Markdown format)
- `directoryPath`: Repository root path (absolute)
- `anchors`: File/directory paths this note relates to
- `tags`: Semantic tags for categorization
- `confidence`: (Optional) 'high', 'medium', or 'low'
- `type`: (Optional) 'decision', 'pattern', 'gotcha', or 'explanation'
- `metadata`: (Optional) Additional context

### `get_repository_tags`

Get available tags for categorizing notes.

**Parameters:**
- `path`: File or directory path
- `includeUsedTags`: (Optional) Include previously used tags
- `includeSuggestedTags`: (Optional) Include path-based tag suggestions
- `includeGuidance`: (Optional) Include repository guidance

### `get_repository_guidance`

Get repository-specific guidance for creating notes.

**Parameters:**
- `path`: Any path within the repository

### `copy_guidance_template`

Copy note guidance templates to repository.

**Parameters:**
- `path`: Repository path
- `template`: Template type ('default', 'react-typescript', 'nodejs-api', 'python-data-science')
- `overwrite`: (Optional) Whether to overwrite existing guidance

## Further Reading

- **[README.md](./README.md)**: Basic project overview and setup
- **[USAGE_GUIDE.md](./USAGE_GUIDE.md)**: AI agent integration instructions
- **[LIBRARY_USAGE.md](./LIBRARY_USAGE.md)**: Programmatic usage examples
- **[MCP Documentation](https://modelcontextprotocol.io/)**: Model Context Protocol specification
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)**: TypeScript language reference

## Migration Commands

If you have existing tool-specific configuration files, you can migrate them to this unified AGENTS.md format:

```bash
# Migrate from various tool-specific formats
mv .cursorrules AGENTS.md && ln -s AGENTS.md .cursorrules
mv .clinerules AGENTS.md && ln -s AGENTS.md .clinerules
mv CLAUDE.md AGENTS.md && ln -s AGENTS.md CLAUDE.md
mv .windsurfrules AGENTS.md && ln -s AGENTS.md .windsurfrules
```

---

*This AGENTS.md file was created to provide comprehensive guidance for AI agents working with the a24z-Memory MCP server. It consolidates project information, best practices, and tool usage instructions to ensure effective collaboration between AI agents and human developers.*
