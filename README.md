<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/55678688-7739-46d1-8e9f-66b4fc9efb3d" />

**Context Managment for your whole suite:** CLI for AI agents • VS Code for developers • Alexandria web for teams






## For Your Agent
- `npm install -g a24z-memory` to download the alexandria cli
- run `alexandria init` To Configure Your Project
## For Your Developer
[![Install in VS Code](https://img.shields.io/badge/Install%20in%20VS%20Code-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%7B%22name%22%3A%22a24z-memory%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22a24z-memory%22%5D%7D)

https://github.com/user-attachments/assets/8bf7b277-c6e9-4fbf-8fc8-10857d5bdac7


## For Your Team


https://github.com/user-attachments/assets/89892c54-8b26-4cdb-ac17-12299c1e97a6


[![npm version](https://badge.fury.io/js/a24z-memory.svg)](https://www.npmjs.com/package/a24z-memory)
[![Documentation](https://img.shields.io/badge/docs-a24z.ai-blue.svg)](https://a24z-ai.github.io/Alexandria)

## One Platform, Three Experiences

Alexandria provides persistent memory infrastructure that enhances how AI agents, developers, and teams work with codebases.

### 🤖 For AI Agents: CLI + MCP Server
**Give your AI agents perfect memory**
- Install once, works with Claude, Cursor, Windsurf, and any MCP-compatible tool
- Agents remember context across sessions and share knowledge
- No more re-explaining your codebase every conversation
- `npx -y a24z-memory` to get started

### 👨‍💻 For Developers: VS Code Extension
**Your intelligent coding companion**
- Native VS Code integration with context-aware suggestions
- Visual codebase navigation and understanding
- Smart documentation that updates as you code
- Install from VS Code marketplace (coming Q1 2025)

### 👥 For Teams: Alexandria Website
**Your team's collective intelligence hub**
- Web-based dashboard for entire engineering organization
- Track agent usage, knowledge evolution, and team patterns
- Manage codebase views and documentation standards
- Enterprise features for governance and compliance

## The Problem We Solve

**Without Alexandria:**
- 🔄 Repeat yourself to every AI agent
- 📝 Documentation goes stale immediately
- 🧠 Lose context between sessions
- 🤝 No knowledge sharing between tools

**With Alexandria:**
- ✅ Persistent memory across all sessions
- 📊 Living documentation that evolves
- 🔗 Shared context between all tools
- 🚀 10x faster development velocity

## Quick Start

### 🤖 For AI Agents (CLI + MCP)
```bash
# One-command setup
npx -y a24z-memory init

# Your agents now have persistent memory!
# Works with Claude, Cursor, Windsurf, etc.
```

### 👨‍💻 For Developers (VS Code)
```bash
# Coming Q1 2025
# Install from VS Code marketplace
# Or use the CLI version now
npx -y a24z-memory init
```

### 👥 For Teams (Web Dashboard)
```bash
# Initialize team workspace
npx alexandria init --team

# Access dashboard at https://app.a24z.ai
# Or self-host with Enterprise plan
```

## How It Works

### Memory Palace Architecture

Alexandria creates a persistent knowledge layer that sits between your code and your tools:

```
┌─────────────────────────────────────┐
│         Your Codebase               │
├─────────────────────────────────────┤
│     Alexandria Memory Layer         │
│  • Codebase Views (spatial maps)    │
│  • Knowledge Graph (connections)    │
│  • Context Store (decisions)        │
├─────────────────────────────────────┤
│   CLI/MCP  │  VS Code  │   Web      │
│  (Agents)  │  (Devs)   │  (Teams)   │
└─────────────────────────────────────┘
```

### Real Example: Authentication Refactor

**Without Alexandria:**
```
Day 1: Explain auth system to Claude → implements feature
Day 2: Explain auth system to Cursor → different approach
Day 3: Explain auth system to new dev → inconsistent patterns
Result: Three different implementations, technical debt
```

**With Alexandria:**
```
Day 1: Claude learns auth system → saves to memory
Day 2: Cursor reads memory → consistent implementation
Day 3: New dev uses VS Code → sees all context
Result: Consistent, maintainable code
```

## Features by User Type

### 🤖 AI Agent Features (CLI + MCP)

**Available Now:**
- `create_repository_note` - Save important discoveries
- `get_repository_guidance` - Access team patterns
- `askA24zMemory` - Query the knowledge graph
- `create_codebase_view` - Build spatial maps
- `validate_documentation` - Ensure accuracy

**Benefits:**
- No more context repetition
- Consistent implementations
- Shared knowledge between sessions
- Works with any MCP-compatible tool

### 👨‍💻 Developer Features (VS Code Extension)

**Coming Q1 2025:**
- Visual codebase navigation
- Inline documentation hints
- Smart code suggestions based on team patterns
- Automatic documentation updates
- Context-aware refactoring

**Benefits:**
- Understand any codebase instantly
- Follow team patterns automatically
- Never lose important context
- Seamless integration with daily workflow

### 👥 Team Features (Alexandria Website)

**Available Now:**
- Web dashboard at app.a24z.ai
- Agent usage analytics
- Knowledge graph visualization
- Documentation health metrics
- Team pattern library

**Benefits:**
- See how your team uses AI
- Track knowledge evolution
- Maintain consistency at scale
- Enterprise governance and compliance

## Use Cases

### For AI Agent Users
**"I'm tired of explaining my codebase to Claude every time"**
- Install Alexandria MCP server once
- Claude remembers everything between sessions
- Share context with Cursor, Windsurf, and other tools
- Build complex features without re-explaining

### For Individual Developers
**"I want to understand this codebase faster"**
- VS Code extension shows visual code maps
- See architectural decisions inline
- Get context-aware suggestions
- Navigate complex codebases effortlessly

### For Engineering Teams
**"We need consistency across our AI usage"**
- Track how different team members use AI
- Ensure consistent patterns and practices
- Build institutional knowledge that persists
- Onboard new developers 10x faster

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

## Pricing

### 🤖 AI Agent Users
| Plan | Price | Best For |
|------|-------|----------|
| **Free** | $0 | Individual developers, open source |
| **Pro** | $29/month | Power users, multiple projects |
| **Team** | $99/seat/month | Small teams, shared context |

### 👨‍💻 VS Code Extension
| Plan | Price | Features |
|------|-------|----------|
| **Community** | Free | Basic navigation, local storage |
| **Professional** | $19/month | Advanced visualizations, cloud sync |

### 👥 Alexandria Platform
| Plan | Price | Includes |
|------|-------|----------|
| **Startup** | $299/month | 10 seats, basic analytics |
| **Growth** | $999/month | 50 seats, advanced features |
| **Enterprise** | Custom | Unlimited seats, SSO, compliance |

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
