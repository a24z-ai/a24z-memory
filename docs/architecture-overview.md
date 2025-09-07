# Architecture Overview: Pure-Core, MCP, and MemoryPalace

This codebase view provides a high-level understanding of how the a24z-Memory system is architecturally divided into three main layers, each serving a distinct purpose in the overall system design.

## The Three Architectural Layers

### 🟢 Pure-Core (Top-Left)

**Platform-Agnostic Business Logic Layer**

The `pure-core` directory contains the fundamental business logic that is completely independent of any specific platform or runtime environment. This layer provides:

- **Abstractions**: Platform-agnostic interfaces (like `FileSystemAdapter`) that allow the system to work in any JavaScript environment
- **Stores**: Core data management classes (`AnchoredNotesStore`, `CodebaseViewsStore`, `A24zConfigurationStore`)
- **Types**: TypeScript type definitions and interfaces that define the system's data structures
- **Utils**: Pure utility functions for validation, guidance generation, and other core operations

**Key Principle**: This layer has zero dependencies on Node.js, browsers, or any specific runtime. It can run anywhere JavaScript runs.

### 🔵 MCP Layer (Top-Right)

**Model Context Protocol Server Layer**

The `mcp` directory implements the Model Context Protocol (MCP) server that enables AI agents to interact with the a24z-Memory system. This layer provides:

- **Server**: The main MCP server implementation that handles tool calls and resource requests
- **Tools**: Individual MCP tools that expose specific functionality (create notes, get notes, manage tags, etc.)
- **Types**: MCP-specific type definitions and schemas
- **Utils**: Helper functions for MCP operations

**Key Principle**: This layer acts as the "API surface" for AI agents, translating between MCP protocol messages and the pure-core business logic.

### 🟠 MemoryPalace (Bottom-Left)

**Central API Orchestrator**

The `MemoryPalace.ts` file contains the main API class that serves as the central orchestrator for all a24z-Memory operations. This class:

- **Unifies Access**: Provides a single, consistent interface for all memory operations
- **Validates Paths**: Handles repository path validation and security
- **Coordinates Stores**: Manages the interaction between different stores and components
- **Provides Migration Helpers**: Includes utility methods for working with different path formats

**Key Principle**: This is the "single source of truth" - all tools and external consumers should use this class rather than directly accessing stores.

## 🟣 Integration Layer (Bottom-Right)

**Platform-Specific Adaptations and Entry Points**

The integration layer contains platform-specific code and entry points:

- **Node Adapters**: Node.js-specific implementations of abstractions (like `NodeFileSystemAdapter`)
- **CLI**: Command-line interface for direct user interaction
- **Library Exports**: Main export points for the library (`index.ts`, `lib.ts`)
- **Type Definitions**: Additional type definitions and branding

**Key Principle**: This layer adapts the pure-core logic to specific platforms while keeping the core business logic platform-agnostic.

## Data Flow Architecture

```
AI Agent / CLI / Library Consumer
           │
           ▼
    ┌─────────────────┐
    │   MemoryPalace  │ ← Central API orchestrator
    │    (Main API)   │
    └─────────────────┘
           │
           ▼
    ┌─────────────────┐
    │      MCP        │ ← Protocol translation layer
    │    (Optional)   │
    └─────────────────┘
           │
           ▼
    ┌─────────────────┐
    │   Pure-Core     │ ← Platform-agnostic business logic
    │   (Core Logic)  │
    └─────────────────┘
           │
           ▼
    ┌─────────────────┐
    │ Node Adapters   │ ← Platform-specific implementations
    │   (File System) │
    └─────────────────┘
```

## Key Design Principles

1. **Separation of Concerns**: Each layer has a single, well-defined responsibility
2. **Platform Independence**: Core business logic works anywhere JavaScript runs
3. **Single API Surface**: All operations go through the MemoryPalace class
4. **Dependency Injection**: Platform-specific code is injected as abstractions
5. **Type Safety**: Strong TypeScript typing throughout all layers

## Benefits of This Architecture

- **Testability**: Pure functions and dependency injection make testing straightforward
- **Portability**: Core logic can be reused across different platforms
- **Maintainability**: Clear separation makes changes easier to implement
- **Extensibility**: New platforms can be supported by implementing abstractions
- **AI Integration**: MCP layer provides clean AI agent integration

This architectural approach ensures that a24z-Memory remains flexible, maintainable, and adaptable to future requirements while providing a robust foundation for AI-assisted development workflows.
