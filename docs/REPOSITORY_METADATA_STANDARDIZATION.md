# Repository Metadata Standardization

## Overview

The a24z ecosystem manages repository information across multiple projects - from local project registries to GitHub metadata to Alexandria's codebase view collections. This document describes the standardized type system introduced to unify repository metadata across all a24z projects.

## The Problem

Previously, each project in the ecosystem had its own repository metadata types:

- **a24z-Memory**: `ProjectEntry` - minimal local project tracking
- **code-city-landing**: `AlexandriaRepository` - flat structure with GitHub + Alexandria fields
- **alexandria**: `Repository` - nested structure with metadata object

This fragmentation led to:
- Inconsistent data structures between projects
- Difficulty passing repository data between services
- Duplicated type definitions
- Potential for data loss or transformation errors

## The Solution: Unified Type Hierarchy

We've introduced a three-level type hierarchy that serves all use cases:

### 1. GithubRepository

Pure GitHub metadata from the GitHub API:

```typescript
interface GithubRepository {
  id: string;                // owner/name format
  owner: string;
  name: string;
  description?: string;
  stars: number;
  primaryLanguage?: string;
  topics?: string[];
  license?: string;
  lastCommit?: string;
  defaultBranch?: string;
  isPublic?: boolean;
  lastUpdated: string;
}
```

Located in: `/src/pure-core/types/repository.ts`

### 2. AlexandriaRepository

Repository with optional GitHub metadata and Alexandria-specific fields:

```typescript
interface AlexandriaRepository {
  name: string;
  remoteUrl?: string;
  registeredAt: string;
  github?: GithubRepository;  // Optional GitHub metadata
  hasViews: boolean;
  viewCount: number;
  views: CodebaseViewSummary[]; // Required array of view summaries
  lastChecked?: string;
}
```

This type is used for:
- Remote repositories in code-city-landing's S3 storage
- Repository listings in alexandria UI
- Any repository that may or may not have local presence

### 3. AlexandriaEntry

Local project registry entry extending AlexandriaRepository:

```typescript
interface AlexandriaEntry extends AlexandriaRepository {
  path: ValidatedRepositoryPath;  // Required local path
}
```

This replaces the old `ProjectEntry` and is used in:
- `/src/projects-core/ProjectRegistryStore.ts` - local project registry
- `/src/projects-core/types.ts` - registry data structures

## Migration Path

### For a24z-Memory

The migration is complete:
- `ProjectEntry` has been replaced with `AlexandriaEntry`
- `ProjectRegistryStore` now uses `AlexandriaEntry`
- New entries automatically get Alexandria fields initialized

### For code-city-landing

To adopt the new types:

1. Import types from a24z-memory:
```typescript
import { GithubRepository, AlexandriaRepository } from 'a24z-memory';
```

2. Update `/src/lib/s3-alexandria-store.ts`:
- Replace local `AlexandriaRepository` interface with imported type
- Ensure field mappings are correct

3. Update `/src/lib/github-alexandria.ts`:
- Map `GitHubRepoInfo` to `GithubRepository`
- Return `AlexandriaRepository` from methods

### For alexandria

To adopt the new types:

1. Import from a24z-memory:
```typescript
import { AlexandriaRepository } from 'a24z-memory';
```

2. Update `/src/lib/alexandria-api.ts`:
- Replace `Repository` interface with `AlexandriaRepository`
- Access GitHub fields via `repository.github.*` instead of `repository.metadata.*`

## Benefits of Standardization

### Type Safety
- Single source of truth for repository types
- TypeScript ensures compatibility across projects
- Compile-time checking prevents data structure mismatches

### Maintainability
- Changes to repository structure only need to happen in one place
- Clear separation between GitHub metadata and Alexandria features
- Extensible hierarchy for future needs

### Interoperability
- Projects can share repository data without transformation
- Consistent JSON structure in storage and APIs
- Clear contract between services

## Implementation Details

### Field Decisions

**Why `views` is required in AlexandriaRepository:**
- Alexandria's primary purpose is managing codebase views
- Empty array is valid for repositories without views
- Prevents null checking throughout the codebase

**Why `github` is optional:**
- Not all repositories have GitHub metadata (private/local repos)
- Allows gradual population of GitHub data
- Supports offline/disconnected scenarios

**Why path is only in AlexandriaEntry:**
- Remote repositories don't have local paths
- Clear distinction between local and remote repos
- Prevents confusion about path availability

### Storage Implications

The new types maintain backward compatibility with existing storage:
- JSON structure remains the same
- Field names unchanged
- Only the TypeScript types are unified

## Usage Examples

### Creating a Local Project Entry

```typescript
import { AlexandriaEntry } from 'a24z-memory';

const entry: AlexandriaEntry = {
  name: 'my-project',
  path: validatedPath,
  remoteUrl: 'https://github.com/user/my-project',
  registeredAt: new Date().toISOString(),
  github: undefined,  // Will be populated later
  hasViews: false,
  viewCount: 0,
  views: [],
};
```

### Working with GitHub Metadata

```typescript
import { GithubRepository, AlexandriaRepository } from 'a24z-memory';

// Fetch from GitHub API
const githubData: GithubRepository = await fetchGitHubMetadata(owner, name);

// Create Alexandria repository
const repo: AlexandriaRepository = {
  name: githubData.name,
  remoteUrl: `https://github.com/${githubData.owner}/${githubData.name}`,
  registeredAt: new Date().toISOString(),
  github: githubData,
  hasViews: viewCount > 0,
  viewCount,
  views: await fetchViews(),
};
```

### Type Guards

```typescript
function isLocalEntry(repo: AlexandriaRepository): repo is AlexandriaEntry {
  return 'path' in repo && repo.path !== undefined;
}

function hasGitHubMetadata(repo: AlexandriaRepository): boolean {
  return repo.github !== undefined;
}
```

## Future Considerations

### Potential Enhancements

1. **Repository Statistics**: Add download counts, contributor counts
2. **Quality Metrics**: Documentation coverage, test coverage
3. **Activity Tracking**: Last activity, commit frequency
4. **Relationships**: Dependencies, related repositories

### Versioning Strategy

If breaking changes are needed:
1. Create new version interfaces (`AlexandriaRepositoryV2`)
2. Provide migration utilities
3. Support both versions during transition
4. Deprecate old version with clear timeline

## Related Files

- Type definitions: `/src/pure-core/types/repository.ts`
- Local registry: `/src/projects-core/ProjectRegistryStore.ts`
- Type exports: `/src/index.ts`
- Registry types: `/src/projects-core/types.ts`

## Conclusion

The standardized repository metadata types provide a solid foundation for the a24z ecosystem's growth. By unifying how we represent repositories across projects, we enable better interoperability, maintain type safety, and reduce complexity in our codebase.