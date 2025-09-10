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

#### 2. Repository Discovery Service
**Location**: `src/cli-alexandria/api/services/`

**Files to create**:
- `src/cli-alexandria/api/services/discovery.ts` - File system scanning
- `src/cli-alexandria/api/services/cache.ts` - Caching layer

**Functionality**:
- Scan configured directories for `.alexandria` folders
- Parse `views.json` and individual view files
- Map to `AlexandriaRepository` type structure
- Implement file system watcher for updates

### Phase 2: Data Layer

#### 3. Repository Registry Store
**Location**: `src/cli-alexandria/api/stores/`

**Files to create**:
- `src/cli-alexandria/api/stores/RepositoryRegistry.ts`

**Features**:
- In-memory store for discovered repositories
- Periodic background scanning
- Cache invalidation on file changes
- Query methods for filtering/searching

**Interface**:
```typescript
interface RepositoryRegistry {
  getAllRepositories(): AlexandriaRepository[];
  getRepository(owner: string, name: string): AlexandriaRepository | null;
  registerRepository(path: string): Promise<AlexandriaRepository>;
  refreshCache(): Promise<void>;
}
```

### Phase 3: API Endpoints

#### 4. List Repositories Endpoint
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

#### 5. Get Repository Endpoint
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

#### 6. Register Repository Endpoint
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

#### 7. Raw Content Endpoint
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

#### 8. Outpost Command Integration
**Modify**: `src/cli-alexandria/commands/outpost.ts`

**Changes**:
- Add `--local` flag to serve local API
- Start both UI server and API server
- Configure UI to use local API endpoint

```typescript
// In serve command
if (options.local) {
  const apiServer = new LocalAPIServer({
    port: apiPort,
    registryPaths: options.paths || getDefaultPaths()
  });
  await apiServer.start();
  apiUrl = `http://localhost:${apiPort}`;
}
```

#### 9. Configuration Support
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

#### 10. Caching Implementation
**Features**:
- In-memory cache with TTL
- File system watcher for invalidation
- Lazy loading of view details
- Background refresh

#### 11. Performance Optimizations
- Parallel directory scanning
- Debounced file watchers
- Streaming for large files
- Response compression

### Phase 6: Testing & Documentation

#### 12. Test Suite
**Location**: `tests/cli-alexandria/api/`

**Test Coverage**:
- Unit tests for discovery service
- Integration tests for API endpoints
- Mock file system for testing
- Error handling scenarios

#### 13. Documentation Updates
- API usage examples
- Configuration guide
- Troubleshooting section
- Performance tuning tips

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
- [ ] Repository discovery service
- [ ] Basic registry store

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
- Existing Alexandria types
- MemoryPalace stores
- FileSystemAdapter abstraction

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