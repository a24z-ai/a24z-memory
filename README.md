<img width="2816" height="1536" alt="Gemini_Generated_Image_rx8a19rx8a19rx8a (1)" src="https://github.com/user-attachments/assets/f892952e-5955-4513-9670-7e0a6f67b01d" />

# Alexandria - Development Agent Orchestration Platform

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=a24z-memory&config=eyJjb21tYW5kIjoibnB4IC15IGEyNHotbWVtb3J5In0%3D) [![Install in VS Code](https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22a24z-memory%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22a24z-memory%22%5D%7D)
[![npm version](https://badge.fury.io/js/a24z-memory.svg)](https://www.npmjs.com/package/a24z-memory)
[![Documentation](https://img.shields.io/badge/docs-a24z.ai-blue.svg)](https://docs.a24z.ai)

**One-click install for Cursor & VS Code** ↑ • Works with Claude Code, Windsurf, Gemini CLI & Jules

## The Multi-Agent Collaboration Revolution

Modern development teams use multiple AI agents, but these agents work in isolation. Alexandria changes everything by creating a **unified context layer** that enables true multi-agent orchestration, helping development teams achieve **10x velocity improvements**.

### The Problem: Agent Isolation

- 🤖 **Cursor** doesn't know what Copilot suggested
- 🧠 **Claude** can't see your team's architectural decisions  
- 🔧 **Custom agents** lack context from other tools
- 📝 **Documentation** becomes stale the moment it's written

### The Solution: Unified Agent Orchestration

Alexandria provides a **shared knowledge graph** that all agents can access and contribute to:

- ✅ **Universal Compatibility** - Works with all major AI development tools
- 🔄 **Real-time Sync** - Keep all agents aligned with shared context
- 📊 **Codebase Views** - Spatial knowledge maps for better understanding
- 🎯 **Quality Control** - Maintain consistency across all agents

## Quick Start - One Click Install

The convenience buttons above handle everything—just click to install. For manual setup:

```bash
# Initialize Alexandria in your project
npx -y a24z-memory init

# Start the MCP server
npx a24z-memory

# Create your first codebase view
npx alexandria from-doc README.md --name overview
```

## How It Works: The Memory Palace Architecture

### 🏗️ Create Spatial Knowledge Maps

Transform your codebase into navigable **CodebaseViews**—grid-based memory palaces that organize knowledge spatially:

```
CodebaseView: "Frontend Architecture"
→ Grid: 3×2 layout
→ Cell [0,0]: Components (src/components/*)  
→ Cell [0,1]: Services (src/services/*)
→ Cell [1,0]: Utils (src/utils/*)
→ Stored in: .a24z/views/frontend-architecture.json
```

### 🎯 Anchor Knowledge Across Agents

When any agent discovers something important, it's preserved for all:

```
Cursor: "Found auth middleware issue with null headers"
→ Saved to shared knowledge graph
→ Available to Claude, Copilot, and all other agents
→ Tagged: authentication, middleware, validation
→ Anchored to: src/services/auth/middleware.ts
```

### 🧠 Orchestrated Agent Collaboration

Your agents work together seamlessly:

```
You: "Build a new authentication system"
Cursor: *Checks knowledge graph for auth patterns*
Copilot: *Sees Cursor's implementation approach*
Claude: *Reviews and suggests improvements based on team patterns*
Result: Consistent, high-quality code following your standards
```

## Real-World Impact: 10x Development Velocity

### 🚀 Rapid Feature Development
Multiple agents collaborate in parallel:
- Cursor handles UI components
- Copilot manages backend logic
- Claude reviews and refactors
- All sharing context in real-time

### 📖 Living Documentation
Documentation that evolves automatically:
- Updated by agent discoveries
- Validated on every commit
- Always current with your code

### 🧠 Institutional Memory
Preserve team knowledge permanently:
- Architectural decisions
- Bug fixes and solutions
- Implementation patterns
- Available to all future agents

### 🔄 Seamless Agent Handoffs
Switch between tools without losing context:
- Start in Cursor
- Continue in Claude
- Review with Copilot
- Deploy with custom agents

## Core Features

### Universal Agent Compatibility
- **Cursor IDE** - Full integration via MCP
- **VS Code** - Native extension support
- **Claude** - MCP server included
- **GitHub Copilot** - Context sharing
- **Custom Agents** - SDK available

### Codebase Views System
```bash
# List all views
npx alexandria list

# Create from documentation
npx alexandria from-doc <doc-file> --name <view-name>

# Validate views
npx alexandria validate <view-name>

# Track documentation
npx alexandria list-untracked-docs
```

### Knowledge Management Tools
Your AI assistants gain powerful capabilities:
- **`askA24zMemory`** - Query shared knowledge
- **`create_repository_note`** - Document insights
- **`get_repository_guidance`** - Access team patterns
- **`create_handoff_brief`** - Generate handoff docs
- **`discover_a24z_tools`** - Explore all capabilities

## Installation & Setup

### Prerequisites
- Node.js 18+
- Git repository
- MCP-compatible editor

### Basic Setup (5 minutes)
```bash
# Install and initialize
npx -y a24z-memory init

# This creates:
# - .alexandriarc.json (configuration)
# - .a24z/ directory (local storage)
# - Project registration
```

### Add Pre-commit Hooks (10 minutes)
```bash
# Install dependencies
npm install --save-dev husky lint-staged
npx husky init

# Add to package.json
{
  "lint-staged": {
    "*.md": "npx alexandria validate",
    "*.{ts,tsx,js,jsx}": "npx alexandria check-coverage"
  }
}
```

### GitHub Actions Integration (15 minutes)
```bash
# Install workflow
npx alexandria install-workflow

# Enables:
# - Automatic registry updates
# - PR documentation status
# - Coverage reports
```

## Configuration

Create `.alexandriarc.json` in your project root:

```json
{
  "version": "1.0.0",
  "project": {
    "name": "your-project",
    "description": "Multi-agent orchestrated development"
  },
  "views": {
    "default": "overview",
    "autoGenerate": true
  },
  "agents": {
    "syncInterval": 5000,
    "sharedContext": true
  },
  "lint": {
    "enabled": true,
    "rules": {
      "require-descriptions": true,
      "validate-links": true
    }
  }
}
```

## Pricing & Plans

| Plan | Price | Features |
|------|-------|----------|
| **Community** | Free | 2 agents, local storage, basic views |
| **Professional** | $29/month | Unlimited agents, cloud sync, advanced views |
| **Team** | $99/seat/month | Collaboration, shared knowledge, analytics |
| **Enterprise** | $149/seat/month | Custom deployment, SSO, priority support |

### Additional Services
- **Alexandria Cloud**: $20/seat/month - Cloud storage and sync
- **Training & Certification**: $500-$2,000 - Team onboarding
- **Marketplace**: 30% revenue share on custom agents

## Architecture

```
src/
├── core/           # Core orchestration engine
│   ├── store/      # Knowledge graph storage
│   ├── views/      # Codebase view engine
│   └── sync/       # Agent synchronization
├── agents/         # Agent integrations
│   ├── mcp/        # MCP server
│   ├── cursor/     # Cursor integration
│   └── copilot/    # Copilot integration
├── cli/            # CLI commands
└── ui/             # Web interface
```

## Why Alexandria Is Different

| Traditional Approach | Alexandria |
|---------------------|------------|
| Agents work in isolation | Agents collaborate seamlessly |
| Static documentation | Living knowledge graph |
| Manual context sharing | Automatic synchronization |
| Inconsistent patterns | Enforced team standards |
| Lost tribal knowledge | Permanent institutional memory |

## Roadmap

### Q1 2025
- [ ] VS Code marketplace release
- [ ] JetBrains plugin
- [ ] Real-time collaboration dashboard
- [ ] Advanced analytics

### Q2 2025
- [ ] Cross-repository knowledge graph
- [ ] AI agent marketplace
- [ ] Custom agent SDK v2
- [ ] Enterprise SSO

## Support & Community

- 📖 **[Complete Documentation](https://docs.a24z.ai)**
- 💬 **[Discord Community](https://discord.gg/a24z-memory)**
- 🐛 **[GitHub Issues](https://github.com/a24z-ai/a24z-memory/issues)**
- 📧 **[Enterprise Support](mailto:support@a24z.ai)**

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Clone repository
git clone https://github.com/a24z-ai/a24z-memory.git

# Install dependencies
npm install

# Run tests
npm test

# Build project
npm run build
```

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Alexandria** - Orchestrating the future of AI-assisted development.

Built with ❤️ by the [a24z team](https://a24z.ai) to achieve 10x development velocity.