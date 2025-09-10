# Alexandria Outpost API Implementation Plan

## Overview
This plan outlines the implementation of the local API server to support the Alexandria Outpost UI. The server will provide endpoints for discovering, listing, and serving Alexandria repositories from the local filesystem.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Alexandria Outpost UI                  │
│                    (Frontend - Astro)                    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP API
┌────────────────────────▼────────────────────────────────┐
│                  Local API Server                        │
│                  ┌──────────────┐                       │
│                  │   Express    │                       │
│                  └──────┬───────┘                       │
│        ┌────────────────┼────────────────┐              │
│        ▼                ▼                ▼              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐           │
│  │ Registry │   │  Views   │   │   Raw    │           │
│  │  Store   │   │  Store   │   │  Files   │           │
│  └──────────┘   └──────────┘   └──────────┘           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Local Filesystem  │
              │  ~/.alexandria/     │
              │  ~/repos/           │
              └─────────────────────┘
```

## Implementation Steps

### Phase 1: Core Infrastructure

#### 1. Create Local API Server Module
**Location**: `src/cli-alexandria/api/`

**Files to create**:
- `src/cli-alexandria/api/server.ts` - Main Express server
- `src/cli-alexandria/api/routes/index.ts` - Route definitions
- `src/cli-alexandria/api/middleware/cors.ts` - CORS configuration
- `src/cli-alexandria/api/middleware/error.ts` - Error handling

**Key Dependencies**:
```json
{
  "express": "^5.0.0",
  "cors": "^2.8.5"
}
```

### Phase 2: Data Layer

#### 2. Repository Registry Store
**Location**: `src/cli-alexandria/api/stores/`

**Files to create**:
- `src/cli-alexandria/api/stores/RepositoryRegistry.ts`
- `src/cli-alexandria/api/services/cache.ts` - Caching layer

**Features**:
- In-memory store for registered repositories
- Simple repository registration via paths
- Query methods for filtering/searching
- Uses FileSystemAdapter for abstraction (like MemoryPalace)
- Can leverage existing MemoryPalace functionality for enhanced context

**Interface**:
```typescript
interface RepositoryRegistry {
  constructor(fsAdapter: FileSystemAdapter, memoryPalace?: MemoryPalace);
  getAllRepositories(): AlexandriaRepository[];
  getRepository(owner: string, name: string): AlexandriaRepository | null;
  registerRepository(path: string): Promise<AlexandriaRepository>;
  // Leverage MemoryPalace for repository notes/context when available
  getRepositoryNotes(owner: string, name: string): Promise<RepositoryNote[]>;
}
```

**FileSystem Adapter Pattern**:
```typescript
class RepositoryRegistry {
  private repositories: Map<string, AlexandriaRepository> = new Map();
  
  constructor(
    private readonly fsAdapter: FileSystemAdapter,
    private readonly memoryPalace?: MemoryPalace
  ) {
    // Use the same filesystem abstraction as MemoryPalace
    // Enables testing with InMemoryFileSystemAdapter
    // Production uses NodeFileSystemAdapter
  }
  
  async getAllRepositories(): AlexandriaRepository[] {
    return Array.from(this.repositories.values());
  }
  
  async getRepository(owner: string, name: string): AlexandriaRepository | null {
    return this.repositories.get(`${owner}/${name}`) || null;
  }
  
  async registerRepository(path: string): Promise<AlexandriaRepository> {
    const repository = await this.loadRepository(path);
    if (repository) {
      this.repositories.set(`${repository.owner}/${repository.name}`, repository);
      return repository;
    }
    throw new Error(`Could not load repository from ${path}`);
  }
  
  private async loadRepository(repoPath: string): Promise<AlexandriaRepository | null> {
    const alexandriaPath = join(repoPath, '.alexandria');
    
    // Check if .alexandria directory exists
    if (!this.fsAdapter.exists(alexandriaPath)) {
      return null;
    }
    
    // Load views from the views.json file
    const viewsPath = join(alexandriaPath, 'views.json');
    let views: CodebaseViewSummary[] = [];
    
    if (this.fsAdapter.exists(viewsPath)) {
      const content = this.fsAdapter.readFile(viewsPath);
      const viewsData = JSON.parse(content);
      views = viewsData.views || [];
    }
    
    // Extract owner and name from path
    const pathParts = repoPath.split('/');
    const name = pathParts[pathParts.length - 1];
    const owner = pathParts[pathParts.length - 2] || 'local';
    
    // Map to AlexandriaRepository structure
    return {
      id: `${owner}/${name}`,
      owner,
      name,
      description: '',
      stars: 0,
      hasViews: views.length > 0,
      viewCount: views.length,
      views,
      tags: [],
      metadata: {}
    };
  }
  
  async getRepositoryNotes(owner: string, name: string): Promise<any[]> {
    // If MemoryPalace is available, use it for notes
    if (this.memoryPalace) {
      // MemoryPalace would have its own method to get notes
      // This is just a placeholder for when that's implemented
      return [];
    }
    return [];
  }
}
```

### Phase 3: API Endpoints

#### 3. List Repositories Endpoint
**Route**: `GET /api/alexandria/repos`

**Implementation**:
```typescript
router.get('/api/alexandria/repos', async (req, res) => {
  const repos = await registry.getAllRepositories();
  res.json({
    repositories: repos,
    total: repos.length,
    lastUpdated: new Date().toISOString()
  });
});
```

#### 4. Get Repository Endpoint
**Route**: `GET /api/alexandria/repos/:owner/:name`

**Implementation**:
```typescript
router.get('/api/alexandria/repos/:owner/:name', async (req, res) => {
  const repo = await registry.getRepository(req.params.owner, req.params.name);
  if (!repo) {
    return res.status(404).json({ 
      error: { code: 'REPO_NOT_FOUND', message: 'Repository not found' }
    });
  }
  res.json(repo);
});
```

#### 5. Register Repository Endpoint
**Route**: `POST /api/alexandria/repos`

**Implementation**:
```typescript
router.post('/api/alexandria/repos', async (req, res) => {
  const { owner, name, path } = req.body;
  const repo = await registry.registerRepository(path);
  res.json({
    success: true,
    repository: {
      ...repo,
      status: 'registered',
      message: 'Repository registered successfully'
    }
  });
});
```

#### 6. Raw Content Endpoint
**Route**: `GET /raw/:owner/:repo/:branch/*`

**Implementation**:
```typescript
router.get('/raw/:owner/:repo/:branch/*', (req, res) => {
  const filePath = resolveLocalPath(req.params);
  if (!existsSync(filePath)) {
    return res.status(404).json({
      error: { code: 'FILE_NOT_FOUND', message: 'File not found' }
    });
  }
  res.sendFile(filePath);
});
```

### Phase 4: Integration

#### 7. Outpost Command Integration
**Modify**: `src/cli-alexandria/commands/outpost.ts`

**Changes**:
- Add `--local` flag to serve local API
- Start both UI server and API server
- Configure UI to use local API endpoint
- Initialize with FileSystemAdapter and optional MemoryPalace

```typescript
// In serve command
if (options.local) {
  // Create filesystem adapter (can be swapped for testing)
  const fsAdapter = new NodeFileSystemAdapter();
  
  // Optionally create MemoryPalace for enhanced functionality
  let memoryPalace: MemoryPalace | undefined;
  if (options.useMemoryPalace) {
    memoryPalace = new MemoryPalace(fsAdapter);
  }
  
  // Create registry with adapter pattern
  const registry = new RepositoryRegistry(fsAdapter, memoryPalace);
  
  const apiServer = new LocalAPIServer({
    port: apiPort,
    registry,
    registryPaths: options.paths || getDefaultPaths()
  });
  
  await apiServer.start();
  apiUrl = `http://localhost:${apiPort}`;
}
```

#### 8. Configuration Support
**Location**: `src/cli-alexandria/api/config.ts`

**Features**:
- Load from `~/.alexandria/outpost.config.json`
- Support environment variables
- Default configuration values

**Schema**:
```typescript
interface OutpostConfig {
  registryPaths: string[];
  port: number;
  scanInterval: number;
  enableCache: boolean;
  corsOrigins: string[];
}
```

### Phase 5: Optimization

#### 9. Caching Implementation
**Features**:
- In-memory cache with TTL
- File system watcher for invalidation
- Lazy loading of view details
- Background refresh

#### 10. Performance Optimizations
- Parallel directory scanning
- Debounced file watchers
- Streaming for large files
- Response compression

### Phase 6: Testing & Documentation

#### 11. Test Suite
**Location**: `tests/cli-alexandria/api/`

**Test Coverage**:
- Unit tests for discovery service
- Integration tests for API endpoints
- Mock file system for testing
- Error handling scenarios
- Test with InMemoryFileSystemAdapter for isolation

**Testing with FileSystemAdapter**:
```typescript
describe('RepositoryRegistry', () => {
  it('should discover repositories using adapter', async () => {
    // Use InMemoryFileSystemAdapter for testing
    const fsAdapter = new InMemoryFileSystemAdapter();
    
    // Set up test data in memory
    fsAdapter.writeFile('/repos/test-repo/.alexandria/views.json', JSON.stringify({
      views: [{ id: 'test-view', name: 'Test View' }]
    }));
    
    // Create registry with test adapter
    const registry = new RepositoryRegistry(fsAdapter);
    await registry.discoverRepositories(['/repos']);
    
    const repos = registry.getAllRepositories();
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('test-repo');
  });
  
  it('should integrate with MemoryPalace when provided', async () => {
    const fsAdapter = new InMemoryFileSystemAdapter();
    const memoryPalace = new MemoryPalace(fsAdapter);
    
    // Add test note
    await memoryPalace.addNote('test-repo', 'Test note', ['test.ts']);
    
    const registry = new RepositoryRegistry(fsAdapter, memoryPalace);
    const notes = await registry.getRepositoryNotes('owner', 'test-repo');
    
    expect(notes).toHaveLength(1);
    expect(notes[0].note).toBe('Test note');
  });
});
```

#### 12. Documentation Updates
- API usage examples
- Configuration guide
- Troubleshooting section
- Performance tuning tips

## Architecture Benefits

### FileSystemAdapter Pattern Advantages

1. **Testability**: 
   - Use `InMemoryFileSystemAdapter` for unit tests
   - No need for temporary files or filesystem mocking
   - Fast, isolated test execution

2. **Flexibility**:
   - Swap implementations without changing business logic
   - Support for different storage backends in future
   - Easy to add caching layers

3. **Code Reuse**:
   - Leverage existing MemoryPalace functionality
   - Use proven stores like `CodebaseViewsStore` and `AnchoredNotesStore`
   - Consistent patterns across the codebase

4. **Enhanced Features**:
   - When MemoryPalace is provided, get repository notes and context
   - Ability to cross-reference with existing knowledge base
   - Richer API responses with contextual information

## Technical Considerations

### File Path Resolution
```typescript
function resolveRepositoryPath(owner: string, name: string): string {
  // Search in configured registry paths
  for (const basePath of config.registryPaths) {
    const repoPath = join(basePath, owner, name);
    if (existsSync(join(repoPath, '.alexandria'))) {
      return repoPath;
    }
  }
  return null;
}
```

### Type Imports
```typescript
import type { 
  AlexandriaRepository,
  AlexandriaRepositoryRegistry 
} from '../../pure-core/types/repository';
import type { CodebaseViewSummary } from '../../pure-core/types/summary';
```

### Error Handling
```typescript
class APIError extends Error {
  constructor(public code: string, message: string, public status = 500) {
    super(message);
  }
}

// Middleware
app.use((err, req, res, next) => {
  if (err instanceof APIError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message }
    });
  } else {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    });
  }
});
```

## Implementation Timeline

### Week 1
- [ ] Core server infrastructure
- [ ] Repository registry store with built-in discovery
- [ ] Basic caching layer

### Week 2
- [ ] API endpoints implementation
- [ ] Error handling and CORS
- [ ] Outpost command integration

### Week 3
- [ ] Caching and optimization
- [ ] Testing suite
- [ ] Documentation

## Success Criteria

1. **Functional Requirements**
   - All 4 API endpoints working
   - Repository discovery from filesystem
   - Raw file serving capability
   - CORS support for local development

2. **Performance Requirements**
   - < 100ms response time for list endpoint
   - < 50ms response time for cached queries
   - Support for 100+ repositories

3. **Quality Requirements**
   - 80% test coverage
   - Comprehensive error handling
   - Clear documentation

## Dependencies

### NPM Packages
```json
{
  "express": "^5.0.0",
  "cors": "^2.8.5",
  "compression": "^1.7.4",
  "chokidar": "^3.5.3"
}
```

### Internal Dependencies
- Existing Alexandria types from `pure-core/types/`
- FileSystemAdapter abstraction from `pure-core/adapters/`
- MemoryPalace and its stores:
  - `CodebaseViewsStore` for view management
  - `AnchoredNotesStore` for repository notes
  - `A24zConfigurationStore` for configuration
- NodeFileSystemAdapter for production
- InMemoryFileSystemAdapter for testing

## Risk Mitigation

1. **File System Performance**
   - Risk: Slow scanning with many repositories
   - Mitigation: Implement caching and background scanning

2. **Memory Usage**
   - Risk: Large cache size with many views
   - Mitigation: Implement LRU cache with size limits

3. **Security**
   - Risk: Path traversal attacks
   - Mitigation: Validate and sanitize all file paths

## Next Steps

1. Review and approve implementation plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Create feature branch for development
5. Regular progress updates and code reviews