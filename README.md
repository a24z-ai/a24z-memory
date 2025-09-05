<img width="2816" height="1536" alt="Gemini_Generated_Image_rx8a19rx8a19rx8a (1)" src="https://github.com/user-attachments/assets/f892952e-5955-4513-9670-7e0a6f67b01d" />

# a24z-memory: Your Codebase's Living Memory

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=a24z-memory&config=eyJjb21tYW5kIjoibnB4IC15IGEyNHotbWVtb3J5In0%3D) [![Install in VS Code](https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22a24z-memory%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22a24z-memory%22%5D%7D)
[![Documentation](https://img.shields.io/badge/docs-a24z.ai-blue.svg)](https://docs.a24z.ai)

**One-click install for Cursor & VS Code** ↑ • Works with Claude Code, Windsurf, Gemini CLI & Jules

## The Problem We Solve

Every codebase accumulates tribal knowledge—those critical insights about why things work the way they do, what pitfalls to avoid, and which patterns to follow. But this knowledge gets lost in:

- 🧠 **Developers' heads** when they leave or forget
- 💬 **Slack threads** that disappear into history
- 📝 **PR comments** that nobody reads again
- 📚 **Documentation** that becomes stale the moment it's written

## Our Solution: Knowledge That Lives With Your Code

**a24z-memory** captures and preserves your team's hard-won insights by anchoring them directly to your code. Unlike traditional documentation that rots or embeddings that become stale, our knowledge stays fresh because it's connected to the actual files.

When your AI assistant needs context, it doesn't get outdated embeddings—it gets your team's accumulated wisdom plus the current state of your code.

## How It Works: The Memory Palace Approach

### 🏗️ Create Spatial Knowledge Maps

Transform your codebase into navigable **CodebaseViews**—grid-based memory palaces that organize files spatially:

```
CodebaseView: "Frontend Architecture"
→ Grid: 3×2 layout
→ Cell [0,0]: Components (src/components/*)  
→ Cell [0,1]: Services (src/services/*)
→ Cell [1,0]: Utils (src/utils/*)
→ Stored in: .a24z/views/frontend-architecture.json
```

### 🎯 Anchor Knowledge Spatially

When you discover something important, anchor it to specific view coordinates:

```
"Auth middleware breaks with null headers - always validate before parsing"
→ View: "Frontend Architecture"  
→ Cell: [0,1] (Services grid location)
→ Tagged as: authentication, middleware, validation
→ Anchored to: src/services/auth/middleware.ts
→ Stored in: .a24z/notes/ (synced via git)
```

### 🧠 Navigate Your Memory Palace

Your AI assistant uses spatial context for knowledge discovery:

```
You: "Why does our auth sometimes fail?"
AI: *Navigates to Services cell [0,1] in Frontend Architecture view*
AI: "Found spatial knowledge: Auth middleware breaks with null headers in the Services grid location. This is anchored to src/services/auth/middleware.ts where validation is needed before parsing."
```

### 🔄 Spatial Knowledge That Evolves

As your codebase grows, your memory palace adapts:

- **Spatial anchors** connect knowledge to grid coordinates AND file locations
- **Multiple views** provide different organizational perspectives  
- **Git tracks evolution** of both code and spatial organization
- **Cross-view navigation** links related knowledge across different memory palaces
- **Team contributions** build comprehensive spatial understanding

## The Spatial Knowledge Architecture

We use a clean **four-layer spatial architecture** that creates navigable memory palaces for your codebase:

```
🏗️  Views    → Spatial grid layouts organizing your codebase (CodebaseViews)
📝 Notes    → Your team's spatially-anchored insights and knowledge
🏷️  Tags     → Semantic categories for discovery (authentication, bugfix, pattern)
🔗 Anchors  → Direct connections to specific files and code locations
```

Plus **Git distribution** ensures both your code and spatial organization evolve together with your team.

This isn't just storage—it's a **living memory palace system** where knowledge has both semantic meaning and spatial location, making it intuitive to navigate and impossible to lose.

## Real-World Impact

### For Individual Developers

- **Never lose context** when switching between projects
- **Learn from past mistakes** without repeating them
- **Understand "why"** not just "what" in unfamiliar code

### For Teams

- **Onboard faster** with accumulated team knowledge
- **Share insights** automatically through git
- **Build institutional memory** that survives team changes

### For AI Assistants

- **Context-aware responses** based on real team knowledge
- **Avoid known pitfalls** documented by your team
- **Follow established patterns** specific to your codebase

## Getting Started

The convenience buttons above handle everything—just click to install. For manual setup or advanced configuration, see the [detailed installation guide](#detailed-installation) below.

---

## Learn More

📖 **[Complete Documentation](https://docs.a24z.ai)** - Comprehensive guides and API reference  
📚 **[Usage Guide](./USAGE_GUIDE.md)** - Quick reference and examples  
🔧 **[Advanced Configuration](#advanced-configuration)** - Customize for your workflow

---

## Detailed Installation

<details>
<summary><b>Manual Installation Steps</b></summary>

### Prerequisites

- Node.js 18+
- Git repository (for knowledge storage)
- MCP-compatible editor (Cursor, VS Code, Claude Code, etc.)

### Install Package

```bash
# Global installation (recommended)
npm install -g a24z-memory

# Or project-specific
npm install a24z-memory --save-dev

# Verify installation
npx a24z-memory --help
```

### Start the Server

```bash
# Keep this running in a terminal
npx a24z-memory

# Expected output:
# ✅ a24z-Memory MCP server started successfully
# 📁 MCP Server working directory: /path/to/cwd
```

### Configure Your Editor

**For Cursor/VS Code/Claude Code:**

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

**For other editors**, consult their MCP configuration documentation.

</details>

## Advanced Configuration

<details>
<summary><b>System Prompt for AI Assistants</b></summary>

Add this to your AI assistant's system prompt for optimal integration:

```markdown
When working on development tasks, you have access to a a24z-memory MCP server...

### Available Tools

#### discover_a24z_tools - Discover all available tools and capabilities

#### askA24zMemory - Search tribal knowledge and get contextual guidance

#### create_repository_note - Document insights and decisions

#### get_notes - Browse raw notes without AI processing

#### get_repository_tags - Manage note categorization

#### get_repository_types - Get available note types

#### get_repository_guidance - Get repository-specific guidelines

...

### Best Practices

1. Check existing knowledge before starting work
2. Use absolute paths starting with /
3. Document insights after solving problems
4. Read guidance token before creating notes
```

Full system prompt available in [USAGE_GUIDE.md](./USAGE_GUIDE.md).

</details>

## Troubleshooting

<details>
<summary><b>Common Issues and Solutions</b></summary>

### 🔍 Server Not Starting

```bash
npx a24z-memory
# Should show: "✅ a24z-Memory MCP server started successfully"
# If errors, check Node version: node --version (needs 18+)
```

### 🔍 AI Not Using Tools

1. Verify server is running in separate terminal
2. Check system prompt includes tool definitions
3. Test with: "What a24z-Memory tools are available?"

### 🔍 Path Errors

Always use absolute paths:

```bash
pwd  # Get current directory
# Use this path in your commands
```

### 🔍 Repository Errors

```bash
git status  # Verify you're in a git repo
git init    # Initialize if needed
```

### 🔍 Debug Mode

```bash
DEBUG=a24z-memory:* npx a24z-memory
```

For detailed troubleshooting, see the [complete checklist](./USAGE_GUIDE.md#complete-mcp-setup-checklist-for-llm-integration).

</details>

## Quick Demo

1. **Install with one click** using the buttons above
2. **Ask your AI**: "What a24z-Memory tools are available?"
3. **Start capturing**: Document your first insight about your code
4. **Experience the difference**: Watch your AI leverage accumulated knowledge

## Handoff Briefs: Seamless Knowledge Transfer

When transitioning work—whether switching projects, onboarding teammates, or handing off tasks—create a **handoff brief** that captures everything the next person needs to know:

### What Gets Included

- **Context & Current State**: Where things stand and what's been done
- **Code References**: Specific files with explanations of their role
- **Key Decisions**: Why certain approaches were taken
- **Next Steps**: What needs attention moving forward

### How It Works

```
You: "Create a handoff brief for the auth refactoring"
AI: *Generates comprehensive handoff document*
    - Overview of changes made
    - References to modified files with context
    - Outstanding tasks and considerations
    - Saved to .a24z/handoffs/ for sharing
```

Your teammate receives a complete picture—not just what changed, but **why** and **what's next**. The brief lives in your repository, traveling with the code it describes.

## Available Tools

Your AI assistant gains access to powerful knowledge management tools:

- **`askA24zMemory`** - Query tribal knowledge with semantic search
- **`create_repository_note`** - Document new insights and decisions
- **`get_notes`** - Browse existing knowledge
- **`get_repository_tags`** - Get available tags for categorization
- **`get_repository_types`** - Get available note types
- **`get_repository_guidance`** - Access team guidelines
- **`get_repository_note`** - Retrieve specific note by ID
- **`delete_repository_note`** - Remove outdated notes
- **`create_handoff_brief`** - Generate handoff documentation
- **`discover_a24z_tools`** - Explore all capabilities

## Why This Is Different

| Traditional Approach              | a24z-Memory                           |
| --------------------------------- | ------------------------------------- |
| Static documentation that rots    | Dynamic knowledge anchored to code    |
| Embeddings that become stale      | Fresh context read from current files |
| Knowledge in silos (Slack, wikis) | Knowledge in your repository          |
| Manual knowledge sharing          | Automatic distribution via git        |
| AI without context                | AI with your team's wisdom            |

## Programmatic Usage

```typescript
import { run } from 'a24z-memory';
run();
```

## Contributing

We welcome contributions! See our [contribution guidelines](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- 📧 [Email Support](mailto:support@a24z.ai)
- 🐛 [Report Issues](https://github.com/a24z-ai/a24z-memory/issues)
- 💬 [Join Discord](https://discord.gg/a24z-memory)

---

Built with ❤️ by the [a24z team](https://a24z.ai) to make every codebase smarter.
