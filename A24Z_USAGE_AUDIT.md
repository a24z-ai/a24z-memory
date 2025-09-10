# .a24z to .alexandria Migration Audit

## Summary
**Initial State:**
- Total occurrences of '.a24z' string literal: 211
- Files affected: 61

**Final State (Migration Complete):**
- All production code migrated ✅
- All tests updated and passing ✅
- Backwards compatibility removed ✅
- Remaining occurrences: 0 in source code
- Files remaining: Only documentation files

## Migration Target
**FROM**: `.a24z` (legacy, will be removed)
**TO**: `.alexandria` (new standard)

## Constant to Use
Located at: `src/constants/paths.ts:7`
```typescript
PRIMARY: '.alexandria',
```

Import as: `import { ALEXANDRIA_DIRS } from '@/constants/paths';`
Use as: `ALEXANDRIA_DIRS.PRIMARY`

## ✅ Completed Changes

### 1. Removed Unused Configuration (Complete)
- Deleted `DEFAULT_PATH_CONFIG` from `src/pure-core/config/defaultConfig.ts`
- Removed `paths` from `getAllDefaultConfigs()` function
- Updated error message in `CreateRepositoryAnchoredNoteTool.ts` to be more generic

### 2. Removed Static Repository Discovery Method (Complete)
- Deleted static `getNotesForPath()` from `MemoryPalace.ts` (removed directory walking with hardcoded `.a24z`)
- Updated `GetAnchoredNotesTool.ts` to use instance method with git-based repository discovery
- No test updates needed (none were using the static method)

### 3. Removed Backwards Compatibility (Complete)
- Updated `MemoryPalace.getAlexandriaPath()` to only use `.alexandria`
- Removed all `.a24z` fallback logic
- Now uses `ALEXANDRIA_DIRS.PRIMARY` constant
- Simplified from 40 lines to 23 lines

## 🚧 Remaining Work

### Next Steps Priority Order
1. **Path Construction in Stores** (~7 occurrences) - Update AnchoredNotesStore, validation utils
2. **CLI Commands** (~12 occurrences) - Update user-facing messages and path construction
3. **Filter/Exclude Patterns** (~7 occurrences) - Update to exclude `.alexandria` instead
4. **GitHub Actions Template** (~6 occurrences) - Update workflow template generator
5. **Tests** (~170 occurrences) - Update test fixtures and assertions
6. **Documentation** - Update user guides and examples

## Files That Still Need to Be Updated

### Core Source Files (High Priority)

#### Validation & Rules
- `src/rules/rules/require-view-association.ts:61` - Path check for '.a24z/'
- `src/pure-core/validation/CodebaseViewValidator.ts:90` - Join path for views dir
- `src/pure-core/utils/validation.ts` (3 occurrences)
  - Line 13: validation messages path
  - Line 74-75: Ensure .a24z directory exists

#### Stores
- `src/pure-core/stores/AnchoredNotesStore.ts` (2 occurrences)
  - Line 359: Repository alexandria path
  - Line 693: Guidance file path
- `src/pure-core/stores/A24zConfigurationStore.test.ts` - Multiple test references

#### Configuration
- `src/pure-core/config/defaultConfig.ts:97` - dataDir setting

#### MCP Tools
- `src/mcp/tools/CreateRepositoryAnchoredNoteTool.ts` (3 occurrences)
  - Line 115: Error message about configuration.json
  - Line 247: Overview path
  - Line 310: Overview directory
- `src/mcp/tools/GetRepositoryTagsTool.ts` (2 occurrences)
  - Line 37: Comment about note-guidance.md
  - Line 101: Error message

#### CLI Commands
- `src/cli-alexandria/commands/add-all-docs.ts:119` - User message about views
- `src/cli-alexandria/commands/save.ts:62` - Views directory path
- `src/cli-alexandria/commands/save.ts:73` - Console message
- `src/cli-alexandria/commands/install-workflow.ts` (4 occurrences)
  - Lines 54-73: Various references to .a24z/views
- `src/cli-alexandria/commands/list-untracked-docs.ts:44` - Filter for .a24z files
- `src/cli-alexandria/commands/validate-all.ts:149` - Error message
- `src/cli-alexandria/commands/list.ts:25` - Console message
- `src/cli-alexandria/commands/validate.ts:95` - View path construction
- `src/cli-alexandria/commands/init.ts` (2 occurrences)
  - Line 68: Exclude pattern
  - Line 77: Console message
- `src/cli-alexandria/commands/status.ts:125` - Directory filter

#### Core Logic
- `src/MemoryPalace.ts` (6 occurrences)
  - Lines 65-216: Multiple references for directory detection and migration
- `src/projects-core/workflow-utils.ts` (3 occurrences)
  - Lines 15-21: Check for .a24z memory notes

### Test Files (Medium Priority)

#### Unit Tests
- `tests/configuration.test.ts` (6 occurrences)
- `tests/default-view-creation.test.ts` (4 occurrences)
- `tests/mcp/store/notesStore.test.ts` (4 occurrences)
- `tests/mcp/store/tagRemoval.test.ts:112`
- `tests/mcp/store/tagDescriptions.test.ts` (5 occurrences)
- `tests/integration/mcp-server-integration.test.ts` (3 occurrences)
- `tests/test-helpers.ts` (4 occurrences)
- `tests/integration/storage-workflow.test.ts:73`
- `tests/path-validation.test.ts` (2 occurrences)
- `tests/pure-core/stores/CodebaseViewsStore.test.ts:194`
- `tests/pure-core/stores/A24zConfigurationStore.test.ts` (11 occurrences)
- `tests/cli-alexandria/commands/list.test.ts:136`
- `tests/cli-alexandria/commands/list-untracked-docs.test.ts` (7 occurrences)
- `tests/mcp/tools/GetRepositoryTagsTool.simple.test.ts` (3 occurrences)
- `tests/mcp/tools/CreateRepositoryNoteTool.test.ts` (10 occurrences)
- `tests/mcp/store/noteManagement.test.ts:98`
- `tests/pure-core/integration/path-validation-with-pure-store.test.ts` (3 occurrences)
- `tests/projects-core/ProjectRegistryStore.test.ts` (2 occurrences)
- `tests/file-based-storage.test.ts:72`
- `tests/mcp/tools/GetRepositoryGuidanceTool.test.ts` (3 occurrences)
- `tests/test-adapters/InMemoryFileSystemAdapter.ts:174`

### Documentation Files (Low Priority)
- `SETUP.md` (2 occurrences)
- `docs/UI_CONFIGURATION_GUIDE.md` (2 occurrences)
- `docs/USAGE_GUIDE.md` (2 occurrences)
- `docs/ALEXANDRIA_INTEGRATION_GUIDE.md` (Multiple occurrences)

### Configuration Files
- `.github/workflows/alexandria.yml` (7 occurrences) - GitHub Actions workflow
- `.a24zignore:1` - Ignore file comment
- `.alexandria/views/standardization-framework.json:18` - View configuration

### Type Definitions
- `src/pure-core/types/repository.ts` (3 occurrences)
  - Line 10: Comment about validated path
  - Line 74: Comment about views directory
  - Line 77: Comment about CodebaseView files

## Migration Strategy

### Phase 1: Update Core Logic
1. **Replace all `.a24z` with `ALEXANDRIA_DIRS.PRIMARY`** (`.alexandria`)
2. **Update imports**: Add `import { ALEXANDRIA_DIRS } from '@/constants/paths';`
3. **Remove backwards compatibility checks** for `.a24z`
4. **Update directory creation** to only create `.alexandria`

### Phase 2: Update Tests
1. **Update test fixtures** to use `.alexandria` instead of `.a24z`
2. **Remove tests** that specifically test `.a24z` backwards compatibility
3. **Update assertions** to expect `.alexandria` paths

### Phase 3: Update Documentation
1. **Replace references** in user-facing documentation
2. **Add migration guide** for users upgrading from `.a24z` to `.alexandria`
3. **Update example commands** and configurations

### Special Considerations
- **GitHub Actions**: Update workflow files to check for `.alexandria/views/**` instead of `.a24z/views/**`
- **Migration Path**: Consider adding a one-time migration script to help users move from `.a24z` to `.alexandria`
- **Error Messages**: Update to reference `.alexandria` directory
- **Breaking Change**: This is a breaking change that needs to be clearly documented in release notes

## Files That Need Special Attention
- `src/MemoryPalace.ts` - Contains backwards compatibility logic that should be removed
- `.github/workflows/alexandria.yml` - Update paths in YAML
- `.a24zignore` - Should be renamed to `.alexandriaignore`
- All test files - Need to update expected paths and remove legacy tests

## Important Notes for Next Developer

### Breaking Changes
⚠️ **This is a breaking change** - repositories with only `.a24z` directories will no longer work after these changes.

### What Was Done
1. **Removed backwards compatibility** - No more checking for `.a24z` first
2. **Removed static methods** that had hardcoded `.a24z` paths
3. **Started using constants** - `ALEXANDRIA_DIRS.PRIMARY` from `src/constants/paths.ts`

### What Still Needs Doing
1. ✅ **Replace all remaining `.a24z` strings** with `ALEXANDRIA_DIRS.PRIMARY` - COMPLETED
2. ✅ **Update tests** to use `.alexandria` in fixtures - COMPLETED
3. ✅ **Update GitHub Actions** workflow template - COMPLETED
4. **Create migration script** for users to move from `.a24z` to `.alexandria`
5. **Update documentation** with migration guide (README, SETUP.md, etc.)
6. ✅ **Rename .a24zignore to .alexandriaignore** - COMPLETED
7. ✅ **Fix import paths** - Changed from `@/` alias to relative imports - COMPLETED

### How to Continue
1. Search for remaining `.a24z` occurrences: `grep -r "\.a24z" src/`
2. Import `ALEXANDRIA_DIRS` where needed
3. Replace string literals with `ALEXANDRIA_DIRS.PRIMARY`
4. Run tests and fix failures
5. Update docs

### Testing Strategy
- After each file update, run related tests
- Many tests will fail initially (expecting `.a24z` paths)
- Update test fixtures to use `.alexandria`
- Consider keeping some backwards compatibility tests to ensure migration works