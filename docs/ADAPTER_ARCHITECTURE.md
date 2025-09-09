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

### Data Models - ProjectEntry Class Hierarchy

The ProjectEntry follows an object-oriented class hierarchy, similar to how a book can exist in different forms (physical copy, library catalog entry, or both).

#### Base Class

```typescript
/**
 * Base ProjectEntry - like a book's core identity
 * Contains information that all projects have regardless of source
 */
export abstract class ProjectEntry {
  // Core identity - like ISBN for a book
  public readonly id: string;
  public readonly name: string;
  public readonly remoteUrl?: string;
  
  // Common metadata
  public readonly registeredAt: Date;
  public readonly lastUpdated: Date;
  
  // Abstract properties that children must implement
  abstract readonly source: 'local' | 'remote' | 'merged';
  abstract readonly isAvailable: boolean;
  
  // Abstract methods
  abstract getMetadata(): ProjectMetadata;
  abstract canEdit(): boolean;
  abstract canSync(): boolean;
  abstract toJSON(): Record<string, any>;
  
  // Common methods
  isSameProject(other: ProjectEntry): boolean;
  protected generateId(): string;
}
```

#### Local Project Entry

```typescript
/**
 * LocalProjectEntry - A project on your local machine
 * Like having a physical copy of a book on your shelf
 */
export class LocalProjectEntry extends ProjectEntry {
  readonly source = 'local' as const;
  readonly path: string;
  
  // Local-specific metadata
  private localMetadata: {
    hasWorkingChanges: boolean;
    lastLocalScan: Date;
    localBranch: string;
    localViews: CodebaseViewSummary[];
    diskSize?: number;
  };
  
  // Local-specific methods
  openInEditor(): void;
  scanForViews(): CodebaseViewSummary[];
  getWorkingChanges(): string[];
}
```

#### Remote Project Entry

```typescript
/**
 * RemoteProjectEntry - A project on GitHub/GitLab
 * Like a book in a library catalog that you can order
 */
export class RemoteProjectEntry extends ProjectEntry {
  readonly source = 'remote' as const;
  readonly owner: string;
  readonly repo: string;
  
  // Remote-specific metadata
  private remoteMetadata: {
    stars: number;
    forks: number;
    openIssues: number;
    lastCommit?: Date;
    defaultBranch: string;
    visibility: 'public' | 'private';
    language?: string;
    topics?: string[];
    description?: string;
  };
  
  // Remote-specific methods
  getCloneUrl(): string;
  fetchLatestMetadata(): Promise<void>;
  openInBrowser(): void;
}
```

#### Merged Project Entry

```typescript
/**
 * MergedProjectEntry - A project that exists both locally and remotely
 * Like having both a physical copy and knowing it's available at the library
 */
export class MergedProjectEntry extends ProjectEntry {
  readonly source = 'merged' as const;
  private local: LocalProjectEntry;
  private remote: RemoteProjectEntry;
  private primarySource: 'local' | 'remote';
  
  // Merged-specific methods
  getSyncStatus(): 'synced' | 'local-ahead' | 'remote-ahead' | 'diverged';
  syncWithRemote(): Promise<void>;
  getConflicts(): Array<{ field: string; local: any; remote: any }>;
}
```

#### Metadata Types

```typescript
export interface ProjectMetadata {
  type: 'local' | 'remote' | 'merged';
  [key: string]: any;
}

export interface LocalProjectMetadata extends ProjectMetadata {
  type: 'local';
  path: string;
  hasWorkingChanges: boolean;
  lastLocalScan: Date;
  localBranch: string;
  localViews: CodebaseViewSummary[];
  diskSize?: number;
  canEdit: boolean;
  canSync: boolean;
}

export interface RemoteProjectMetadata extends ProjectMetadata {
  type: 'remote';
  owner: string;
  repo: string;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  visibility: 'public' | 'private';
  language?: string;
  topics?: string[];
  description?: string;
  canClone: boolean;
  canView: boolean;
}

export interface MergedProjectMetadata extends ProjectMetadata {
  type: 'merged';
  local: LocalProjectMetadata;
  remote: RemoteProjectMetadata;
  primarySource: 'local' | 'remote';
  syncStatus: 'synced' | 'local-ahead' | 'remote-ahead' | 'diverged';
}

export interface ProjectFilters {
  hasViews?: boolean;
  language?: string;
  topics?: string[];
  searchTerm?: string;
  source?: 'local' | 'remote' | 'merged';
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

Combines multiple adapters, intelligently merging results when the same project exists in multiple sources.

**Use Case**: Applications that need both local and remote data with deduplication

```typescript
const adapter = new HybridAdapter(
  new LocalFileAdapter(fs, homeDir),
  new GitHubAdapter({ token }),
  new DefaultMergeStrategy() // Optional custom merge strategy
);
```

The HybridAdapter handles project deduplication by:
1. Using git remote URLs as unique identifiers
2. Creating `MergedProjectEntry` instances when projects exist in both sources
3. Preserving source information for filtering and display
4. Allowing configurable merge strategies for conflict resolution

## Usage Examples

### Working with ProjectEntry Classes

```typescript
// Create different types of entries
const localProject = new LocalProjectEntry({
  name: 'my-project',
  path: '/Users/me/projects/my-project',
  remoteUrl: 'https://github.com/me/my-project'
});

const remoteProject = new RemoteProjectEntry({
  owner: 'facebook',
  repo: 'react',
  remoteMetadata: { stars: 220000, forks: 45000 }
});

// Check if two entries represent the same project
if (localProject.isSameProject(remoteProject)) {
  // Create a merged entry
  const merged = new MergedProjectEntry(localProject, remoteProject);
  
  // Check sync status
  const status = merged.getSyncStatus(); // 'synced' | 'local-ahead' | etc.
  
  // Access type-safe metadata
  const metadata = merged.getMetadata();
  console.log(`Local views: ${metadata.local.localViews.length}`);
  console.log(`GitHub stars: ${metadata.remote.stars}`);
}
```

### Alexandria CLI (Local-Only)

```typescript
import { createProjectAdapter } from 'a24z-memory';

// Uses local filesystem exclusively
const adapter = createProjectAdapter('local', {
  fs: new NodeFileSystemAdapter(),
  homeDir: os.homedir()
});

// Returns LocalProjectEntry instances
const projects = await adapter.listProjects();

// Transform to Alexandria's format
const repositories = projects.map(p => {
  const metadata = p.getMetadata();
  return {
    id: p.id,
    name: p.name,
    path: metadata.type === 'local' ? metadata.path : undefined,
    hasViews: metadata.type === 'local' && metadata.localViews.length > 0,
    canEdit: p.canEdit()
  };
});
```

### Alexandria Web (Remote-Only)

```typescript
import { createProjectAdapter } from 'a24z-memory';

// Uses GitHub API exclusively
const adapter = createProjectAdapter('github', {
  token: process.env.GITHUB_TOKEN
});

// Returns RemoteProjectEntry instances
const projects = await adapter.listProjects();

// Display with remote-specific features
const repositories = projects.map(p => {
  const metadata = p.getMetadata();
  return {
    id: p.id,
    name: p.name,
    owner: metadata.type === 'remote' ? metadata.owner : undefined,
    stars: metadata.type === 'remote' ? metadata.stars : 0,
    canClone: p.canSync(),
    viewUrl: `https://github.com/${metadata.owner}/${metadata.repo}`
  };
});
```

### Hybrid Usage (Local + Remote)

```typescript
import { createProjectAdapter } from 'a24z-memory';

// Uses both local and remote sources
const adapter = createProjectAdapter('hybrid', {
  local: { fs: new NodeFileSystemAdapter(), homeDir: os.homedir() },
  github: { token: process.env.GITHUB_TOKEN }
});

// Returns mixed LocalProjectEntry, RemoteProjectEntry, and MergedProjectEntry instances
const projects = await adapter.listProjects();

// Filter by source type
const localOnly = projects.filter(p => p.source === 'local');
const remoteOnly = projects.filter(p => p.source === 'remote');
const synced = projects.filter(p => p.source === 'merged');

// Display with source indicators
projects.forEach(p => {
  if (p.source === 'merged') {
    const meta = p.getMetadata() as MergedProjectMetadata;
    console.log(`${p.name} (${meta.syncStatus})`);
    console.log(`  Local: ${meta.local.path}`);
    console.log(`  Remote: ${meta.remote.owner}/${meta.remote.repo}`);
  }
});
```

### Memory Palace CLI

```typescript
import { createProjectAdapter } from 'a24z-memory';

// Uses the same adapter interface
const adapter = createProjectAdapter('local', {
  fs: new NodeFileSystemAdapter(),
  homeDir: process.env.HOME
});

// Register command creates LocalProjectEntry
await adapter.registerProject(name, path, remoteUrl);

// List command returns ProjectEntry instances
const projects = await adapter.listProjects();

// Access type-safe methods
projects.forEach(p => {
  if (p.canEdit()) {
    console.log(`✏️  ${p.name} (editable)`);
  }
  if (p.canSync()) {
    console.log(`🔄 ${p.name} (syncable)`);
  }
});
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

## Key Design Decisions

### Project Identity and Deduplication

The architecture uses git remote URLs as the primary identifier for projects, enabling:
- Automatic deduplication when the same project exists locally and remotely
- Consistent identity across different sources
- Smart merging of metadata from multiple sources

### Class Hierarchy vs Interface Pattern

We chose a class hierarchy for ProjectEntry because:
- **Encapsulation**: Each source type manages its own specific behavior
- **Type Safety**: Compile-time guarantees about available properties and methods
- **Polymorphism**: Can treat all entries uniformly when needed
- **Rich Behavior**: Each class can have source-specific methods (e.g., `openInEditor()` for local)

### Merge Strategy Pattern

The HybridAdapter uses configurable merge strategies to:
- Allow consumers to define how conflicts are resolved
- Support different merging behaviors for different use cases
- Maintain flexibility without complicating the core API

## Benefits

1. **Separation of Concerns**: Storage logic separated from consumption logic
2. **Flexibility**: Consumers choose their data access strategy
3. **Extensibility**: Easy to add new data sources
4. **Testability**: Mock adapters for unit testing
5. **Consistency**: Single interface for all data access
6. **Type Safety**: Class hierarchy provides compile-time guarantees
7. **Future-Proof**: Can add new methods without breaking existing consumers
8. **Source Awareness**: Always know where data came from and its capabilities

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Define `ProjectEntry` base class
- [ ] Implement `LocalProjectEntry` class
- [ ] Implement `RemoteProjectEntry` class
- [ ] Implement `MergedProjectEntry` class
- [ ] Define metadata interfaces (`LocalProjectMetadata`, `RemoteProjectMetadata`, `MergedProjectMetadata`)

### Phase 2: Adapter Implementation
- [ ] Define `ProjectDataAdapter` interface
- [ ] Implement `LocalFileAdapter` (refactor from `ProjectRegistryStore`)
- [ ] Implement `GitHubAdapter` for remote data
- [ ] Implement `HybridAdapter` with merge strategies
- [ ] Create `DefaultMergeStrategy` class
- [ ] Create factory function `createProjectAdapter`

### Phase 3: Integration
- [ ] Update CLI commands to use adapters
- [ ] Create Alexandria adapter implementation
- [ ] Document migration path for existing code
- [ ] Add comprehensive adapter tests
- [ ] Add ProjectEntry class tests

### Phase 4: Publishing
- [ ] Publish types separately for TypeScript consumers
- [ ] Create `@a24z/alexandria-cli` package
- [ ] Document adapter usage patterns
- [ ] Create example implementations

## Questions to Address

1. **Async vs Sync Operations**: Should all operations be async for consistency?
2. **Error Handling**: How should adapters handle and report errors?
3. **Caching Strategy**: Should adapters implement their own caching?
4. **Event System**: Should adapters emit events for changes?
5. **Permissions**: How do we handle read-only vs read-write adapters?
6. **Adapter Discovery**: Should we support plugin-based adapter discovery?