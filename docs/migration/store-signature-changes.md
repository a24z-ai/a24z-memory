# Store Method Signature Migration Guide

## Overview

As part of the path management refactoring, several store method signatures have been updated to remove unnecessary `repositoryRootPath` parameters. This document outlines the changes and how to update tests accordingly.

## Key Principle

Methods that only access data within the alexandria directory (`.alexandria` or `.a24z`) no longer need the repository root path parameter. Methods that perform repository analysis or work with files outside the alexandria directory still require it.

## Changed Method Signatures

### A24zConfigurationStore

All methods now operate without repository path parameters since configuration is stored in the alexandria directory:

```typescript
// Before
getConfiguration(repositoryRootPath: ValidatedRepositoryPath): MemoryPalaceConfiguration
updateConfiguration(repositoryRootPath: ValidatedRepositoryPath, updates: Partial<MemoryPalaceConfiguration>): MemoryPalaceConfiguration
resetConfiguration(repositoryRootPath: ValidatedRepositoryPath): MemoryPalaceConfiguration
hasCustomConfiguration(repositoryRootPath: ValidatedRepositoryPath): boolean
deleteConfiguration(repositoryRootPath: ValidatedRepositoryPath): boolean
getAllowedTags(repositoryRootPath: ValidatedRepositoryPath): { enforced: boolean; tags: string[] }
setEnforceAllowedTags(repositoryRootPath: ValidatedRepositoryPath, enforce: boolean): void
isTagEnforcementEnabled(repositoryRootPath: ValidatedRepositoryPath): boolean

// After
getConfiguration(): MemoryPalaceConfiguration
updateConfiguration(updates: Partial<MemoryPalaceConfiguration>): MemoryPalaceConfiguration
resetConfiguration(): MemoryPalaceConfiguration
hasCustomConfiguration(): boolean
deleteConfiguration(): boolean
getAllowedTags(): { enforced: boolean; tags: string[] }
setEnforceAllowedTags(enforce: boolean): void
isTagEnforcementEnabled(): boolean
```

### AnchoredNotesStore

Methods that only access tag descriptions or configuration no longer need repository path:

```typescript
// Before
getConfiguration(repositoryRootPath: ValidatedRepositoryPath): MemoryPalaceConfiguration
getTagDescriptions(repositoryRootPath: ValidatedRepositoryPath): Record<string, string>
saveTagDescription(repositoryRootPath: ValidatedRepositoryPath, tag: string, description: string): void
deleteTagDescription(repositoryRootPath: ValidatedRepositoryPath, tag: string): boolean
getTagsWithDescriptions(repositoryRootPath: ValidatedRepositoryPath): TagInfo[]
getAllowedTags(repositoryPath: ValidatedRepositoryPath): { enforced: boolean; tags: string[] }

// After
getConfiguration(): MemoryPalaceConfiguration
getTagDescriptions(): Record<string, string>
saveTagDescription(tag: string, description: string): void
deleteTagDescription(tag: string): boolean
getTagsWithDescriptions(): TagInfo[]
getAllowedTags(): { enforced: boolean; tags: string[] }
```

Methods that still require repository path (for analysis):
- `getNotesForPath(repositoryRoot, relativePath, includeParentNotes)`
- `getNoteById(repositoryRootPath, noteId)`
- `deleteNoteById(repositoryRootPath, noteId)`
- `checkStaleAnchoredNotes(repositoryRootPath)`
- `replaceTagInNotes(repositoryRootPath, oldTag, newTag)`
- `removeTagFromNotes(repositoryRootPath, tag)`
- `getUsedTagsForPath(targetPath)`
- `getRepositoryGuidance(repositoryPath)`

### CodebaseViewsStore

Methods simplified (parameter names remain for consistency but could be removed in future):
- Removed unused `getViewsDirectory` and `ensureViewsDirectory` parameters

## Test Migration Steps

### 1. Update Store Creation

Stores now require `ValidatedAlexandriaPath` in constructor:

```typescript
// Before
const store = new AnchoredNotesStore(fs);

// After
const alexandriaPath = MemoryPalace.getAlexandriaPath(validatedRepoPath, fs);
const store = new AnchoredNotesStore(fs, alexandriaPath);
```

### 2. Update Method Calls

Remove repository path from configuration and tag methods:

```typescript
// Before
const config = store.getConfiguration(repoPath);
store.saveTagDescription(repoPath, 'feature', 'A new feature');

// After
const config = store.getConfiguration();
store.saveTagDescription('feature', 'A new feature');
```

### 3. Keep Repository Path for Analysis Methods

Methods that analyze repository content still need the path:

```typescript
// Still requires repository path
const notes = store.getNotesForPath(repoPath, relativePath, true);
const staleNotes = store.checkStaleAnchoredNotes(repoPath);
```

## Why These Changes?

1. **Reduced Redundancy**: Stores are initialized with alexandria path, no need to pass repository path for internal operations
2. **Clearer Intent**: Methods that need repository path are those that perform cross-repository analysis
3. **Type Safety**: Using `ValidatedAlexandriaPath` ensures paths are validated once at construction
4. **Performance**: Eliminates redundant path validation and construction

## Common Test Failures and Fixes

### Error: "Expected 0 arguments, but got 1"
**Cause**: Calling a method with repository path that no longer needs it
**Fix**: Remove the repository path argument

### Error: "Expected 1 arguments, but got 2"  
**Cause**: Configuration update methods changed signature
**Fix**: Remove repository path, keep only the updates object

### Error: "Cannot find alexandria path"
**Cause**: Store not initialized with alexandria path
**Fix**: Use `MemoryPalace.getAlexandriaPath()` when creating store

## Next Steps

1. Run tests to identify failures: `npm test`
2. Update test files according to the patterns above
3. Ensure all tests pass before merging
4. Consider future refactoring to make store methods consistently instance-based