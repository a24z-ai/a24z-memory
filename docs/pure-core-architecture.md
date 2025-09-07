# Pure-Core Architecture: Platform-Agnostic Foundation

This codebase view provides a detailed breakdown of the `pure-core` directory, which forms the platform-agnostic foundation of the a24z-Memory system. The pure-core layer contains all business logic that can run in any JavaScript environment without platform-specific dependencies.

## The Six Core Components

### 🟢 Abstractions (Top-Left)

**Platform-Agnostic Interfaces**

The `abstractions` directory defines the contracts that allow pure-core to work with any platform:

- **FileSystemAdapter**: Interface for file system operations (read, write, directory operations)
- **Path Operations**: Cross-platform path manipulation utilities
- **Repository Operations**: Git repository detection and management

**Key Principle**: Zero platform dependencies - these interfaces can be implemented for Node.js, browsers, Deno, Bun, or any JavaScript runtime.

### 🔵 Stores (Top-Middle)

**Data Management Layer**

The `stores` directory contains the core data management classes:

- **AnchoredNotesStore**: Manages note storage, retrieval, and validation
- **CodebaseViewsStore**: Handles codebase view configurations and layouts
- **A24zConfigurationStore**: Manages repository-level configuration settings

**Key Principle**: All data operations go through these stores, ensuring consistent data management and validation.

### 🟠 Types (Top-Right)

**TypeScript Type System**

The `types` directory defines the complete type system:

- **Path Validation Types**: Branded types for secure path handling
- **CodebaseView Types**: Grid layout and visualization types
- **Note Types**: Data structures for notes, anchors, and metadata
- **Configuration Types**: System configuration and limits

**Key Principle**: Strong typing ensures runtime safety and provides excellent developer experience.

### 🟣 Utils (Bottom-Left)

**Pure Utility Functions**

The `utils` directory contains platform-independent utility functions:

- **GuidanceGenerator**: Creates default guidance content and configuration
- **Validation**: Pure validation functions for data integrity
- **Path Utilities**: Cross-platform path manipulation helpers

**Key Principle**: All utilities are pure functions with no side effects, making them easily testable and reusable.

### 🟤 Config (Bottom-Middle)

**Default Configuration**

The `config` directory provides system defaults:

- **Default Repository Config**: Base configuration for new repositories
- **System Limits**: Default limits for notes, tags, and storage
- **Feature Flags**: Default settings for optional features

**Key Principle**: Sensible defaults that can be overridden per repository.

### 🔘 Integration (Bottom-Right)

**Cross-Component Coordination**

This represents how all pure-core components work together:

- **Dependency Injection**: FileSystemAdapter injected into all stores
- **Type Safety**: All components use the shared type system
- **Configuration Management**: Centralized config shared across stores
- **Validation Pipeline**: Consistent validation across all operations

## Data Flow in Pure-Core

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Abstractions  │───▶│     Stores      │───▶│   Validation    │
│ (FileSystem)    │    │ (Data Access)   │    │   Pipeline      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Types       │    │     Utils       │    │     Config      │
│ (Type Safety)   │    │ (Pure Functions)│    │ (Defaults)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Architectural Principles

### 1. **Platform Independence**

- No Node.js, browser, or runtime-specific code
- All platform dependencies abstracted behind interfaces
- Can run in any JavaScript environment

### 2. **Dependency Injection**

- FileSystemAdapter injected into all stores
- Allows different implementations for different platforms
- Clean separation between business logic and I/O

### 3. **Strong Typing**

- Branded types for path validation
- Comprehensive interfaces for all data structures
- Type-driven development ensures correctness

### 4. **Pure Functions**

- Utility functions have no side effects
- Easy to test and reason about
- Composable and reusable

### 5. **Configuration Management**

- Centralized configuration store
- Repository-specific overrides
- Sensible defaults with customization options

## Benefits of This Architecture

- **Testability**: Pure functions and dependency injection make testing straightforward
- **Portability**: Core logic works across different JavaScript runtimes
- **Maintainability**: Clear separation of concerns and strong typing
- **Extensibility**: New platforms supported by implementing abstractions
- **Reliability**: Comprehensive validation and error handling

## Integration with Higher Layers

The pure-core layer serves as the foundation for:

- **MemoryPalace**: Uses pure-core stores through dependency injection
- **MCP Server**: Translates MCP protocol calls to pure-core operations
- **CLI/Node Adapters**: Provide platform-specific implementations of abstractions

This architecture ensures that the core business logic remains clean, testable, and portable while higher layers handle platform-specific concerns and protocol translations.
