# a24z-Memory MCP Server Note Guidelines

## Project Overview

This is an MCP (Model Context Protocol) server that provides repository-specific memory and note-taking capabilities. The project is relatively small and focused, so notes should emphasize how components connect and interact.

## Preferred Note Types

### 🔌 MCP Integration Points

- Document how tools connect to the MCP server
- Explain the flow from tool execution to response
- Note any MCP protocol quirks or requirements discovered
- **Tags**: `mcp`, `integration`, `protocol`

### 🏗️ Architecture Connections

- How the store, tools, and server components interact
- Data flow between components (especially through `notesStore.ts`)
- Schema conversion pipeline (Zod → JSON Schema → MCP)
- **Tags**: `architecture`, `data-flow`, `components`

### 🛠️ Tool Implementation Patterns

- Common patterns used across tools (BaseTool inheritance)
- How tool validation and execution works
- Schema definition best practices discovered
- **Tags**: `tools`, `pattern`, `validation`

### 🗄️ Storage Decisions

- Why `.a24z` directory structure was chosen
- Repository isolation strategy and path normalization
- File format choices (JSON for notes, MD for guidance)
- **Tags**: `storage`, `decision`, `file-structure`

### 🐛 MCP Development Gotchas

- Issues with Zod schema descriptions not propagating
- Testing challenges with file system operations
- Path normalization edge cases
- **Tags**: `gotcha`, `testing`, `debugging`

## Key Areas to Document

### Core Components

- **`/src/core-mcp/store/`** - How notes are stored and retrieved
- **`/src/core-mcp/tools/`** - Tool implementation and schema patterns
- **`/src/core-mcp/server/`** - MCP server setup and handler registration
- **`/src/core-mcp/utils/`** - Critical utilities like schema conversion

### Critical Files

- **`notesStore.ts`** - Central storage logic, path handling
- **`BaseTool.ts`** - Tool pattern all others inherit from
- **`zod-to-json-schema.ts`** - Schema conversion (tricky with descriptions!)
- **`pathNormalization.ts`** - Repository root detection logic

## Preferred Tags

### Technical

- `mcp`, `tools`, `storage`, `schema`
- `validation`, `testing`, `file-operations`
- `path-handling`, `repository-isolation`

### Development Process

- `pattern`, `decision`, `gotcha`
- `integration`, `data-flow`, `architecture`

## Note Quality Guidelines

### For This Small Codebase

- **Focus on connections**: How does X talk to Y?
- **Document "why" decisions**: Why `.a24z`? Why JSON for storage?
- **Capture MCP specifics**: Protocol requirements, schema needs
- **Include test insights**: What was hard to test and why?
- **Link related components**: Reference connected files

### Example Note Structure

```markdown
## Tool Schema Description Propagation

The MCP server needs parameter descriptions in the JSON schema for tools to be user-friendly. Originally, descriptions added via `.describe()` in Zod weren't showing up in the final schema.

**Problem**: `zod-to-json-schema.ts` was stripping descriptions from nested schemas (optional/default wrappers).

**Solution**: Modified the converter to preserve the full schema object when processing, allowing descriptions on `ZodDefault` and `ZodOptional` wrappers to propagate through.

**Files involved**:

- `src/core-mcp/utils/zod-to-json-schema.ts` - Schema converter
- `src/core-mcp/tools/base-tool.ts` - Uses converter via `inputSchema` getter
- All tool files that define schemas with descriptions

**Tags**: mcp, schema, gotcha, tools
```

## Testing Notes

When documenting tests:

- Note any file system mocking challenges
- Document test data setup patterns
- Explain why certain tests use `handler` vs `execute`
- Include insights about MCP server testing approaches

## Future Considerations

Document ideas for:

- Additional tool types that might be needed
- Storage scalability considerations
- MCP protocol features we could leverage
- Integration patterns with other MCP servers
