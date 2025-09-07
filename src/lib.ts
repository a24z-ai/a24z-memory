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

// Filesystem adapter for dependency injection
export type { FileSystemAdapter } from './pure-core/abstractions/filesystem';
export { NodeFileSystemAdapter } from './node-adapters/NodeFileSystemAdapter';

// Primary API class
export { MemoryPalace } from './MemoryPalace';
