# a24z Memory MCP Server

Bundle for Cursor, Windsurf, Claude Code, Gemini CLI, and Jules.

## Install

```bash
npm i -g a24z-memory
```

## Run

```bash
a24z-memory start
```

Environment:

- `MCP_BRIDGE_HOST` (default: `localhost`)
- `MCP_BRIDGE_PORT` (default: `3042`)

## One-click installs

Cursor:

```bash
a24z-memory install-cursor
```

Claude:

```bash
a24z-memory install-claude
```

## Manual integration

Cursor (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"],
      "env": { "MCP_BRIDGE_HOST": "localhost", "MCP_BRIDGE_PORT": "3042" }
    }
  }
}
```

Windsurf (Settings → Cascade → Manage Plugins → VIEW RAW CONFIG):

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"],
      "env": { "MCP_BRIDGE_HOST": "localhost", "MCP_BRIDGE_PORT": "3042" }
    }
  }
}
```

Claude Code/Desktop (`~/.claude.json` or `~/.config/claude/config.json`):

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"],
      "env": { "MCP_BRIDGE_HOST": "localhost", "MCP_BRIDGE_PORT": "3042" }
    }
  }
}
```

Gemini CLI (`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"],
      "env": { "MCP_BRIDGE_HOST": "localhost", "MCP_BRIDGE_PORT": "3042" }
    }
  }
}
```

Jules: Refer to Jules MCP configuration; define a server named `a24z-memory` with the same `command`, `args`, and `env`.

## Programmatic use

```ts
import { run } from "a24z-memory";
run();
```
