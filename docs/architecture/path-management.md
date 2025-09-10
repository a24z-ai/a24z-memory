# Path Management Architecture

## Overview

The a24z-Memory system uses a centralized path management architecture that ensures type safety, reduces redundancy, and provides a clear migration path from legacy storage locations. This document explains the key architectural decisions made during the refactoring of path management across the codebase.

## Key Design Principles

### 1. Single Source of Truth

The `MemoryPalace` class serves as the single source of truth for all path validation and resolution. This centralization ensures:

- Consistent validation logic across the entire codebase
- Clear ownership of path-related responsibilities
- Simplified testing and maintenance

### 2. Validate Once, Trust Everywhere

We use TypeScript's branded types to create compile-time guarantees about path validation:

```typescript
// Branded types that carry validation proof
export type ValidatedRepositoryPath = string & { __repositoryPath: true };
export type ValidatedAlexandriaPath = string & { __alexandriaPath: true };
export type ValidatedRelativePath = string & { __relativePath: true };
```

Once a path is validated and branded, downstream consumers can trust it without re-validation. This eliminates redundant validation code and improves performance.

### 3. Dependency Injection for File System Operations

All file system operations go through the `FileSystemAdapter` abstraction, which is injected into components that need it. This enables:

- Platform-agnostic code that works in browser, Node.js, and VS Code environments
- Easy testing with mock file systems
- Consistent error handling across different platforms

## Architecture Components

### MemoryPalace

The central API that manages all memory operations. Key responsibilities:

- **Path Validation**: Validates repository paths once at construction time
- **Alexandria Directory Resolution**: Determines whether to use `.alexandria` or legacy `.a24z`
- **Store Creation**: Creates and manages store instances with pre-validated paths
- **Public API**: Provides a clean interface for tools and CLI commands

```typescript
class MemoryPalace {
  // Static methods for path operations
  static validateRepositoryPath(fs: FileSystemAdapter, path: string): ValidatedRepositoryPath
  static getAlexandriaPath(repositoryPath: ValidatedRepositoryPath, fs: FileSystemAdapter): ValidatedAlexandriaPath
  static validateRelativePath(repositoryPath: ValidatedRepositoryPath, targetPath: string, fs: FileSystemAdapter): ValidatedRelativePath
  
  // Instance created with validated paths
  constructor(repositoryRoot: string, fileSystem: FileSystemAdapter)
}
```

### Stores

Storage components that handle specific data types. They receive pre-validated paths from MemoryPalace:

- **AnchoredNotesStore**: Manages notes anchored to files
- **CodebaseViewsStore**: Manages codebase view configurations
- **A24zConfigurationStore**: Manages repository configuration

```typescript
// Stores receive pre-validated paths, no re-validation needed
class AnchoredNotesStore {
  constructor(fileSystemAdapter: FileSystemAdapter, alexandriaPath: ValidatedAlexandriaPath)
}
```

### MCP Tools

Model Context Protocol tools that expose functionality to AI assistants. They use MemoryPalace instead of creating stores directly:

```typescript
// Tools create MemoryPalace instances, not stores
const palace = new MemoryPalace(parsed.directoryPath, this.fs);
const saved = palace.saveNote({...});
```

## Migration Strategy

### Supporting Both .alexandria and .a24z

The system supports a gradual migration from the legacy `.a24z` directory to the new `.alexandria` standard:

1. **Check for existing directories** in order of preference:
   - If `.a24z` exists, continue using it (backward compatibility)
   - If `.alexandria` exists, use it
   - If neither exists, create `.alexandria` (new standard)

2. **Future migration path**:
   - Eventually add migration logic to move from `.a24z` to `.alexandria`
   - Maintain backward compatibility during transition period
   - Remove legacy support in a major version update

### Path Resolution Logic

```typescript
static getAlexandriaPath(repositoryPath: ValidatedRepositoryPath, fs: FileSystemAdapter): ValidatedAlexandriaPath {
  const alexandriaPath = fs.join(repositoryPath, '.alexandria');
  const legacyPath = fs.join(repositoryPath, '.a24z');
  
  // Prefer legacy if it exists (backward compatibility)
  if (fs.exists(legacyPath)) {
    return legacyPath as ValidatedAlexandriaPath;
  }
  
  // Use new standard if it exists
  if (fs.exists(alexandriaPath)) {
    return alexandriaPath as ValidatedAlexandriaPath;
  }
  
  // Create new standard for fresh installations
  fs.createDir(alexandriaPath);
  return alexandriaPath as ValidatedAlexandriaPath;
}
```

## Benefits of This Architecture

### 1. Type Safety

Branded types prevent accidental use of unvalidated paths:

```typescript
// This won't compile - type error!
const store = new AnchoredNotesStore(fs, "/some/random/path");

// This works - path is validated and branded
const validPath = MemoryPalace.getAlexandriaPath(validatedRepo, fs);
const store = new AnchoredNotesStore(fs, validPath);
```

### 2. Performance

- Validation happens once at the entry point
- No redundant file system checks in stores
- Cleaner, more focused store implementations

### 3. Maintainability

- Clear separation of concerns
- Single location for path-related logic
- Easy to update migration strategy
- Simplified testing

### 4. Flexibility

- Easy to add new path types or validation rules
- Platform-agnostic through FileSystemAdapter
- Gradual migration without breaking changes

## Implementation Guidelines

### For New Features

1. Always use MemoryPalace for path operations
2. Never hardcode `.a24z` or `.alexandria` paths
3. Trust branded types - don't re-validate
4. Use dependency injection for FileSystemAdapter

### For Testing

1. Mock FileSystemAdapter for unit tests
2. Test path validation logic only in MemoryPalace tests
3. Use pre-validated paths in store tests
4. Test migration scenarios explicitly

### For Tools and CLI Commands

1. Create MemoryPalace instances at the entry point
2. Pass MemoryPalace or its methods to sub-components
3. Handle validation errors at the user-facing layer
4. Provide clear error messages for path issues

## Future Considerations

### Potential Enhancements

1. **Automatic Migration**: Add user-prompted migration from `.a24z` to `.alexandria`
2. **Path Caching**: Cache validated paths for frequently accessed repositories
3. **Multi-Repository Support**: Extend to handle operations across multiple repositories
4. **Remote Repository Support**: Add support for remote repository operations

### Breaking Changes to Avoid

1. Never change the branded type definitions
2. Maintain backward compatibility for `.a24z` during transition
3. Keep FileSystemAdapter interface stable
4. Preserve MemoryPalace public API

## Conclusion

This centralized path management architecture provides a robust foundation for the a24z-Memory system. By validating paths once and using branded types throughout, we achieve both type safety and performance while maintaining flexibility for future enhancements.

The architecture supports gradual migration from legacy storage locations and provides clear patterns for extending the system with new features. Most importantly, it reduces complexity by consolidating path-related logic in a single, well-tested location.