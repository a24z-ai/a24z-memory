# a24z-Memory Adapter Architecture

## Overview

The a24z-Memory adapter architecture provides a pluggable interface for project data storage and retrieval. This allows different consumers (Alexandria UI, CLI tools, third-party applications) to choose or implement their own data access strategies while leveraging the core a24z-Memory data model.

## Core Concepts

### The Boundary

The adapter pattern defines a clear boundary between:
- **What we maintain**: Core data models, interfaces, and default implementations
- **What consumers control**: Retrieval strategies, data sources, and custom implementations

```
┌─────────────────────────────────────────────────────────┐
│                    a24z-Memory Core                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ProjectDataAdapter Interface (Contract)          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────┐ ┌──────────────┐ ┌─────────────┐   │
│  │LocalFileAdapter│ │GitHubAdapter │ │HybridAdapter│   │
│  └───────────────┘ └──────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↑
                    Implements/Uses
                            ↑
┌─────────────────────────────────────────────────────────┐
│                        Consumers                         │
│  ┌──────────────┐ ┌─────────────┐ ┌─────────────────┐  │
│  │Alexandria CLI│ │memory-palace│ │Custom Tools     │  │
│  └──────────────┘ └─────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Interface Definition

### ProjectDataAdapter

The core interface that all adapters must implement:

```typescript
export interface ProjectDataAdapter {
  // Storage operations
  registerProject(name: string, path: string, remoteUrl?: string): Promise<void>;
  updateProject(name: string, updates: Partial<ProjectEntry>): Promise<void>;
  removeProject(name: string): Promise<boolean>;
  
  // Retrieval operations
  listProjects(): Promise<ProjectEntry[]>;
  getProject(name: string): Promise<ProjectEntry | undefined>;
  searchProjects(query: string, filters?: ProjectFilters): Promise<ProjectEntry[]>;
  
  // View operations
  getProjectViews(projectPath: string): Promise<CodebaseViewSummary[]>;
  getViewContent(projectPath: string, viewPath: string): Promise<string>;
  
  // Metadata operations
  getProjectMetadata(projectPath: string): Promise<ProjectMetadata>;
  refreshProjectMetadata(projectPath: string): Promise<ProjectMetadata>;
}
```

### Data Models

```typescript
export interface ProjectEntry {
  name: string;
  path: string;
  remoteUrl?: string;
  registeredAt: string;
  metadata?: ProjectMetadata;
}

export interface ProjectMetadata {
  primaryLanguage?: string;
  topics?: string[];
  license?: string;
  lastCommit?: string;
  defaultBranch?: string;
  hasAlexandriaWorkflow?: boolean;
  hasMemoryNotes?: boolean;
  viewCount?: number;
}

export interface ProjectFilters {
  hasViews?: boolean;
  language?: string;
  topics?: string[];
  searchTerm?: string;
}
```

## Built-in Adapters

### LocalFileAdapter

Reads from and writes to the local filesystem (`~/.a24z-memory/projects.json`).

**Use Case**: Local development, CLI tools, offline access

```typescript
const adapter = new LocalFileAdapter(
  fileSystemAdapter,
  homeDirectory
);
```

### GitHubAdapter

Fetches project data from GitHub API.

**Use Case**: Cloud-based tools, public project discovery

```typescript
const adapter = new GitHubAdapter({
  token: 'github_token',
  organization: 'optional-org'
});
```

### HybridAdapter

Combines multiple adapters, merging their results.

**Use Case**: Applications that need both local and remote data

```typescript
const adapter = new HybridAdapter(
  new LocalFileAdapter(fs, homeDir),
  new GitHubAdapter({ token })
);
```

## Usage Examples

### Alexandria CLI (Local-Only)

```typescript
import { createProjectAdapter } from 'a24z-memory';

// Uses local filesystem exclusively
const adapter = createProjectAdapter('local', {
  fs: new NodeFileSystemAdapter(),
  homeDir: os.homedir()
});

// Transform to Alexandria's format
const projects = await adapter.listProjects();
const repositories = projects.map(p => ({
  id: p.name,
  name: p.name,
  path: p.path,
  hasViews: p.metadata?.viewCount > 0
}));
```

### Alexandria Web (Remote-Only)

```typescript
import { createProjectAdapter } from 'a24z-memory';

// Uses GitHub API exclusively
const adapter = createProjectAdapter('github', {
  token: process.env.GITHUB_TOKEN
});

const projects = await adapter.listProjects();
```

### Memory Palace CLI

```typescript
import { createProjectAdapter } from 'a24z-memory';

// Uses the same adapter interface
const adapter = createProjectAdapter('local', {
  fs: new NodeFileSystemAdapter(),
  homeDir: process.env.HOME
});

// Register command
await adapter.registerProject(name, path, remoteUrl);

// List command
const projects = await adapter.listProjects();
```

## Creating Custom Adapters

Implement the `ProjectDataAdapter` interface to create custom data sources:

```typescript
import { ProjectDataAdapter, ProjectEntry } from 'a24z-memory';

export class DatabaseAdapter implements ProjectDataAdapter {
  constructor(private db: Database) {}
  
  async listProjects(): Promise<ProjectEntry[]> {
    const rows = await this.db.query('SELECT * FROM projects');
    return rows.map(row => ({
      name: row.name,
      path: row.path,
      remoteUrl: row.remote_url,
      registeredAt: row.created_at
    }));
  }
  
  async registerProject(name: string, path: string, remoteUrl?: string) {
    await this.db.insert('projects', {
      name,
      path,
      remote_url: remoteUrl,
      created_at: new Date().toISOString()
    });
  }
  
  // ... implement other required methods
}
```

## Factory Pattern

Use the factory function for convenient adapter creation:

```typescript
import { createProjectAdapter } from 'a24z-memory';

// Built-in adapters
const localAdapter = createProjectAdapter('local', options);
const githubAdapter = createProjectAdapter('github', options);
const hybridAdapter = createProjectAdapter('hybrid', options);

// Custom adapter registration
registerAdapterType('database', DatabaseAdapter);
const dbAdapter = createProjectAdapter('database', { db: myDatabase });
```

## Migration Path

### Current Implementation
```typescript
// Direct use of ProjectRegistryStore
const registry = new ProjectRegistryStore(fsAdapter, homeDir);
const projects = registry.listProjects();
```

### New Implementation
```typescript
// Using adapter pattern
const adapter = createProjectAdapter('local', { fs: fsAdapter, homeDir });
const projects = await adapter.listProjects();
```

## Benefits

1. **Separation of Concerns**: Storage logic separated from consumption logic
2. **Flexibility**: Consumers choose their data access strategy
3. **Extensibility**: Easy to add new data sources
4. **Testability**: Mock adapters for unit testing
5. **Consistency**: Single interface for all data access
6. **Future-Proof**: Can add new methods without breaking existing consumers

## Implementation Checklist

- [ ] Define `ProjectDataAdapter` interface
- [ ] Implement `LocalFileAdapter` (refactor from `ProjectRegistryStore`)
- [ ] Implement `GitHubAdapter` for remote data
- [ ] Implement `HybridAdapter` for combined sources
- [ ] Create factory function `createProjectAdapter`
- [ ] Update CLI commands to use adapters
- [ ] Document migration path for existing code
- [ ] Add adapter tests
- [ ] Publish types separately for TypeScript consumers

## Questions to Address

1. **Async vs Sync Operations**: Should all operations be async for consistency?
2. **Error Handling**: How should adapters handle and report errors?
3. **Caching Strategy**: Should adapters implement their own caching?
4. **Event System**: Should adapters emit events for changes?
5. **Permissions**: How do we handle read-only vs read-write adapters?
6. **Adapter Discovery**: Should we support plugin-based adapter discovery?