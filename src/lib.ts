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
  RepositoryConfiguration,
  // CodebaseView types
  CodebaseView,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult,
} from './pure-core/types';

// Filesystem adapter for dependency injection
export { FileSystemAdapter } from './pure-core/abstractions/filesystem';
export { NodeFileSystemAdapter } from './node-adapters/NodeFileSystemAdapter';

// Primary API class
export { MemoryPalace } from './MemoryPalace';
