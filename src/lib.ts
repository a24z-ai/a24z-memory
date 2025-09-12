/**
 * a24z-memory library exports
 *
 * This file exports the essential functionality for use as a library.
 * Use MemoryPalace as the primary API for all note operations.
 */

// Essential types from pure-core
export type {
  // Core note types
  StoredAnchoredNote,
  AnchoredNoteWithPath,
  MemoryPalaceConfiguration,

  // Path validation types
  ValidatedRepositoryPath,
  ValidatedRelativePath,

  // CodebaseView types
  CodebaseView,
  CodebaseViewCell,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult,
  FileListValidationResult,
} from './pure-core/types';

// Repository and Alexandria types
export type {
  ValidatedAlexandriaPath,
  AlexandriaRepository,
  AlexandriaEntry,
  AlexandriaRepositoryRegistry,
  GithubRepository,
} from './pure-core/types/repository';

// CodebaseView summary types
export type { CodebaseViewSummary } from './pure-core/types/summary';
export {
  extractCodebaseViewSummary,
  extractCodebaseViewSummaries,
} from './pure-core/types/summary';

// Validation types
export type { 
  ValidationResult as CodebaseValidationResult,
  ValidationIssue 
} from './pure-core/validation/CodebaseViewValidator';

// Config types
export type { ValidationResult as ConfigValidationResult } from './config/types';

// Filesystem adapter for dependency injection
export type { FileSystemAdapter } from './pure-core/abstractions/filesystem';
export { NodeFileSystemAdapter } from './node-adapters/NodeFileSystemAdapter';

// Primary API classes
export { MemoryPalace } from './MemoryPalace';
export { AlexandriaOutpostManager } from './cli-alexandria/api/AlexandriaOutpostManager';

// Project management
export { ProjectRegistryStore } from './projects-core/ProjectRegistryStore';

// CLI utilities (for alexandria-cli package)
export { LibraryRulesEngine } from './rules';
export { OverviewPathAutoFix } from './pure-core/autofixes/OverviewPathAutoFix';
export { generateViewIdFromName } from './pure-core/stores/CodebaseViewsStore';
export { ConfigValidator } from './config/validator';

// Constants
export { ALEXANDRIA_DIRS } from './constants/paths';
export { CONFIG_FILENAME } from './config/schema';

// Project utilities
export { getGitRemoteUrl } from './projects-core/utils';
export { hasAlexandriaWorkflow, hasMemoryNotes } from './projects-core/workflow-utils';
