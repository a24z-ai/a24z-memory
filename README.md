# a24z-Memory MCP Server

A Model Context Protocol (MCP) server for managing repository-anchored notes and context management.

## Installation

```bash
npm install -g a24z-memory
```

## Usage

### As an MCP Server in Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["-y", "a24z-memory"]
    }
  }
}
```

### Available MCP Tools

The MCP server provides tools for:
- Creating and managing repository-anchored notes
- Managing tags and guidance
- Retrieving stale notes that need updating
- Getting repository-specific context and guidance
- Managing codebase views

## Documentation

- [MCP Design](docs/PRINCIPAL_MCP_DESIGN.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Tool Workflows](docs/tool-workflows/README.md)
- [Usage Guide](docs/USAGE_GUIDE.md)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Test MCP server build
npm run test:mcp
```

## License

Apache License

---

Built with ❤️ by the [a24z team](https://a24z.ai)