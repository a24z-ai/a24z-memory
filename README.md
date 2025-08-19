# a24z Memory MCP Server

Bundle for Cursor, Windsurf, Claude Code, Gemini CLI, VS Code, and Jules.

## Install

```bash
npm i -g a24z-memory
```

## Run

```bash
a24z-memory start
```

## Automated Setup

For some editors, you can run the following commands for a one-click install:

**Cursor:**
```bash
a24z-memory install-cursor
```
<a href="https://cursor.sh/docs/extensions#mcp-servers"><img src="https://cursor.so/assets/images/badges/set_up_in_cursor.svg" alt="Set up in Cursor" /></a>

**Claude:**
```bash
a24z-memory install-claude
```

## Manual Integration

### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"]
    }
  }
}
```

### VS Code (`settings.json`)

Add this to your user or workspace `settings.json`:
```json
{
  "mcp.servers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"]
    }
  }
}
```

### Windsurf (Settings → Cascade → Manage Plugins → VIEW RAW CONFIG)

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"]
    }
  }
}
```

### Claude Code/Desktop (`~/.claude.json` or `~/.config/claude/config.json`)

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"]
    }
  }
}
```

### Gemini CLI (`~/.gemini/settings.json`)

```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["a24z-memory"]
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
