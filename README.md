# a24z Memory MCP Server

Bundle for Cursor, Windsurf, Claude Code, Gemini CLI, VS Code, and Jules.

## Automated Setup

For some editors, you can run the following commands for a one-click install:

**Cursor:**

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=a24z-memory&config=eyJjb21tYW5kIjoibnB4IC15IGEyNHotbWVtb3J5In0%3D)


## Manual Integration

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": [
        "-y",
        "a24z-memory"
      ]
    }
  }
}
```

### Jules
Refer to Jules MCP configuration; define a server named `a24z-memory` with the same `command`, `args`, and `env`.

## Usage with AI Agents

To effectively use the `a24z-Memory` tools with your AI agent, you need to configure your IDE or terminal to use a specific set of rules. These rules define the available tools and provide best practices for their use.

For detailed instructions on how to set this up, please refer to the **[AI Agent Integration Guide](./USAGE_GUIDE.md)**.


## Programmatic use

```ts
import { run } from "a24z-memory";
run();
```
