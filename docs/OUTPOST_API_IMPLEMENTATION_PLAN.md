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

#### 2. Alexandria Outpost Manager
**Location**: `src/cli-alexandria/api/`

**Files to create**:
- `src/cli-alexandria/api/AlexandriaOutpostManager.ts`

**Features**:
- Uses existing `ProjectRegistryStore` from `projects-core`
- Transforms `AlexandriaEntry` to `AlexandriaRepository` format for API
- Loads views from filesystem when needed
- No duplicate registry - reuses existing infrastructure

**Implementation**:
```typescript
import { ProjectRegistryStore } from '../../projects-core/ProjectRegistryStore';
import { MemoryPalace } from '../../mcp-core/MemoryPalace';
import type { AlexandriaRepository } from '../../pure-core/types/repository';
import type { AlexandriaEntry } from '../../pure-core/types/repository';

export class AlexandriaOutpostManager {
  constructor(
    private readonly projectRegistry: ProjectRegistryStore,
    private readonly memoryPalace: MemoryPalace
  ) {}
  
  async getAllRepositories(): Promise<AlexandriaRepository[]> {
    // Get all registered projects from existing registry
    const entries = this.projectRegistry.listProjects();
    
    // Transform each to API format
    const repositories = await Promise.all(
      entries.map(entry => this.transformToRepository(entry))
    );
    
    return repositories.filter(repo => repo !== null);
  }
  
  async getRepository(name: string): Promise<AlexandriaRepository | null> {
    const entry = this.projectRegistry.getProject(name);
    if (!entry) return null;
    
    return this.transformToRepository(entry);
  }
  
  async registerRepository(name: string, path: string): Promise<AlexandriaRepository> {
    // Use existing registry's register method
    this.projectRegistry.registerProject(name, path);
    
    // Return the transformed repository
    const entry = this.projectRegistry.getProject(name);
    return this.transformToRepository(entry);
  }
  
  private async transformToRepository(entry: AlexandriaEntry): Promise<AlexandriaRepository> {
    // Use MemoryPalace to load views properly
    let views = entry.views || [];
    if (views.length === 0) {
      // Set the repository path for MemoryPalace
      this.memoryPalace.setRepositoryPath(entry.path);
      
      // Get views from CodebaseViewsStore
      const viewsStore = this.memoryPalace.getViewsStore();
      views = await viewsStore.getViews();
    }
    
    // Extract owner from remote URL or use 'local'
    const owner = this.extractOwner(entry.remoteUrl) || 'local';
    
    return {
      id: `${owner}/${entry.name}`,
      owner,
      name: entry.name,
      description: '', // Could be loaded from package.json or README
      stars: 0,
      hasViews: views.length > 0,
      viewCount: views.length,
      views,
      tags: [],
      metadata: {
        registeredAt: entry.registeredAt,
        path: entry.path
      }
    };
  }
  
  private extractOwner(remoteUrl?: string): string | null {
    if (!remoteUrl) return null;
    // Extract owner from git URL
    const match = remoteUrl.match(/github\.com[:/]([^/]+)/);
    return match ? match[1] : null;
  }
}
```

### Phase 3: API Endpoints

#### 3. List Repositories Endpoint
**Route**: `GET /api/alexandria/repos`

**Implementation**:
```typescript
router.get('/api/alexandria/repos', async (req, res) => {
  const repos = await outpostManager.getAllRepositories();
  res.json({
    repositories: repos,
    total: repos.length,
    lastUpdated: new Date().toISOString()
  });
});
```

#### 4. Get Repository Endpoint
**Route**: `GET /api/alexandria/repos/:name`

**Implementation**:
```typescript
router.get('/api/alexandria/repos/:name', async (req, res) => {
  const repo = await outpostManager.getRepository(req.params.name);
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
  const { name, path } = req.body;
  
  try {
    const repo = await outpostManager.registerRepository(name, path);
    res.json({
      success: true,
      repository: {
        ...repo,
        status: 'registered',
        message: 'Repository registered successfully'
      }
    });
  } catch (error) {
    res.status(400).json({
      error: { 
        code: 'REGISTRATION_FAILED', 
        message: error.message 
      }
    });
  }
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
- Use existing ProjectRegistryStore

```typescript
// In serve command
if (options.local) {
  // Create filesystem adapter
  const fsAdapter = new NodeFileSystemAdapter();
  
  // Use existing ProjectRegistryStore
  const projectRegistry = new ProjectRegistryStore(fsAdapter, os.homedir());
  
  // Create MemoryPalace for proper view loading
  const memoryPalace = new MemoryPalace(fsAdapter);
  
  // Create manager to handle outpost operations
  const outpostManager = new AlexandriaOutpostManager(
    projectRegistry,
    memoryPalace
  );
  
  const apiServer = new LocalAPIServer({
    port: apiPort,
    outpostManager
  });
  
  await apiServer.start();
  apiUrl = `http://localhost:${apiPort}`;
  
  console.log(`API server running at ${apiUrl}`);
  console.log(`Serving ${projectRegistry.listProjects().length} registered repositories`);
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
- [ ] AlexandriaOutpostManager using existing ProjectRegistryStore
- [ ] API endpoints implementation

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
- **ProjectRegistryStore** from `projects-core/` - The existing registry we'll use directly
- Existing Alexandria types from `pure-core/types/`
- FileSystemAdapter abstraction from `pure-core/abstractions/`
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