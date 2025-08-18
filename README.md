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
