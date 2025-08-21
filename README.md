
<img width="2816" height="1536" alt="Gemini_Generated_Image_rx8a19rx8a19rx8a (1)" src="https://github.com/user-attachments/assets/7c7da37d-edad-4049-8b59-16e2e0c0c953" />

# a24z-memory: Layered Knowledge Architecture

A retrieval-oriented memory system that prevents knowledge staleness through anchor-based context.

## The Knowledge Stack

**Tag Layer** - Semantic categories for discovery (`bug`, `pattern`, `decision`)  
**Note Layer** - Insights and explanations  
**Anchor Layer** - Connections to actual code locations  
**Git Layer** - Distribution + evolution history of team understanding

This stack means knowledge stays organized (tags), meaningful (notes), current (anchors), and shared (git). Plus git history shows how insights accumulated over time - you can see not just what the team knows, but how they learned it.

### Knowledge Creation

When you discover something important:

```mermaid
flowchart LR
    K1[Discover Issue] --> K2[Tag: gotcha]
    K2 --> K3[Note: Auth breaks with null headers]
    K3 --> K4[Anchor: src/auth/middleware.ts]
    K4 --> K5[Git: Commit & Share]
```

### Knowledge Retrieval  

When you need to understand something:

```mermaid
flowchart LR
    R1[Ask: Auth problems?] --> R2[Find gotcha tags]
    R2 --> R3[Load relevant notes]
    R3 --> R4[Read anchored files]
    R4 --> R5[Fresh context + insights]
```

### Why This Works

Unlike traditional RAG that embeds content and hopes it stays relevant, we anchor knowledge to code locations:

- **Notes point to code** via file/directory anchors, not embedded content
- **Context stays fresh** because we read the current state of your files  
- **Knowledge doesn't rot** - anchors ensure notes remain relevant to actual code
- **Retrieval-first design** - optimized for finding the right context, not storing it

MCP Server Bundle for Cursor, Windsurf, Claude Code, Gemini CLI, VS Code, and Jules.

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
