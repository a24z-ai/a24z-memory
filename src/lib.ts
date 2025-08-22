/**
 * a24z-memory library exports
 * 
 * This file exports the core functionality for use as a library,
 * allowing developers to build on top of a24z-memory without using MCP.
 */

// Core storage functionality
export {
  saveNote,
  getNotesForPath,
  getUsedTagsForPath,
  getSuggestedTagsForPath,
  getRepositoryGuidance,
  // Configuration management
  getRepositoryConfiguration,
  updateRepositoryConfiguration,
  getAllowedTags,
  addAllowedTag,
  removeAllowedTag,
  setEnforceAllowedTags,
  validateNoteAgainstConfig,
  // Note management
  getNoteById,
  deleteNoteById,
  checkStaleNotes,
  // Tag descriptions
  getTagDescriptions,
  saveTagDescription,
  deleteTagDescription,
  getTagsWithDescriptions,
  // Types
  type StoredNote,
  type NoteConfidence,
  type NoteType,
  type RepositoryConfiguration,
  type ValidationError,
  type StaleNote,
  type TagInfo
} from './core-mcp/store/notesStore';

// Note similarity and deduplication
export {
  calculateNoteSimilarity,
  findSimilarNotePairs,
  clusterSimilarNotes,
  isNoteStale,
  DEFAULT_THRESHOLDS,
  type NoteSimilarity,
  type SimilarityThresholds
} from './core-mcp/utils/noteSimilarity';

// Path utilities
export {
  normalizeRepositoryPath,
  findGitRoot,
  findProjectRoot,
  getRepositoryName
} from './core-mcp/utils/pathNormalization';

// Schema conversion utility
export { zodToJsonSchema } from './core-mcp/utils/zod-to-json-schema';

// Tool classes for direct use
export { RepositoryNoteTool } from './core-mcp/tools/RepositoryNoteTool';
export { AskA24zMemoryTool } from './core-mcp/tools/AskA24zMemoryTool';
export { GetRepositoryTagsTool } from './core-mcp/tools/GetRepositoryTagsTool';
export { GetRepositoryGuidanceTool } from './core-mcp/tools/GetRepositoryGuidanceTool';
export { CheckStaleNotesTool } from './core-mcp/tools/CheckStaleNotesTool';
export { GetNoteByIdTool } from './core-mcp/tools/GetNoteByIdTool';
export { FindSimilarNotesTool } from './core-mcp/tools/FindSimilarNotesTool';
export { MergeNotesTool } from './core-mcp/tools/MergeNotesTool';
export { DeleteNoteTool } from './core-mcp/tools/DeleteNoteTool';
export { ReviewDuplicatesTool } from './core-mcp/tools/ReviewDuplicatesTool';
export { BaseTool } from './core-mcp/tools/base-tool';

// Types
export type {
  McpTool,
  McpToolResult,
  McpResource
} from './core-mcp/types';

// MCP Server (for those who want to embed it)
export { McpServer } from './core-mcp/server/McpServer';

// Import the functions at the top for use in the class
import {
  saveNote as saveNoteFunc,
  getNotesForPath as getNotesForPathFunc,
  getUsedTagsForPath as getUsedTagsForPathFunc,
  getSuggestedTagsForPath as getSuggestedTagsForPathFunc,
  getRepositoryGuidance as getRepositoryGuidanceFunc,
  getRepositoryConfiguration as getRepositoryConfigurationFunc,
  updateRepositoryConfiguration as updateRepositoryConfigurationFunc,
  getAllowedTags as getAllowedTagsFunc,
  addAllowedTag as addAllowedTagFunc,
  removeAllowedTag as removeAllowedTagFunc,
  setEnforceAllowedTags as setEnforceAllowedTagsFunc,
  validateNoteAgainstConfig as validateNoteAgainstConfigFunc,
  getNoteById as getNoteByIdFunc,
  deleteNoteById as deleteNoteByIdFunc,
  checkStaleNotes as checkStaleNotesFunc,
  getTagDescriptions as getTagDescriptionsFunc,
  saveTagDescription as saveTagDescriptionFunc,
  deleteTagDescription as deleteTagDescriptionFunc,
  getTagsWithDescriptions as getTagsWithDescriptionsFunc,
  type StoredNote as StoredNoteType,
  type NoteConfidence as NoteConfidenceType,
  type NoteType as NoteTypeType,
  type RepositoryConfiguration as RepositoryConfigurationType,
  type ValidationError as ValidationErrorType,
  type StaleNote as StaleNoteType,
  type TagInfo as TagInfoType
} from './core-mcp/store/notesStore';

import {
  normalizeRepositoryPath as normalizeRepositoryPathFunc
} from './core-mcp/utils/pathNormalization';

/**
 * High-level API for easy use
 */
export class A24zMemory {
  private repositoryPath: string;

  constructor(repositoryPath?: string) {
    this.repositoryPath = repositoryPath || normalizeRepositoryPathFunc(process.cwd());
  }

  /**
   * Save a note to the repository
   */
  saveNote(params: {
    note: string;
    anchors: string[];
    tags: string[];
    confidence?: NoteConfidenceType;
    type?: NoteTypeType;
    metadata?: Record<string, any>;
  }): StoredNoteType {
    return saveNoteFunc({
      ...params,
      directoryPath: this.repositoryPath,
      confidence: params.confidence || 'medium',
      type: params.type || 'explanation',
      metadata: params.metadata || {}
    });
  }

  /**
   * Get notes for a specific path
   */
  getNotesForPath(
    targetPath: string,
    includeParentNotes = true,
    maxResults = 10
  ) {
    return getNotesForPathFunc(targetPath, includeParentNotes, maxResults);
  }

  /**
   * Get all used tags in the repository
   */
  getUsedTags(): string[] {
    return getUsedTagsForPathFunc(this.repositoryPath);
  }

  /**
   * Get suggested tags for a path
   */
  getSuggestedTags(targetPath: string) {
    return getSuggestedTagsForPathFunc(targetPath);
  }

  /**
   * Get repository guidance
   */
  getGuidance(): string | null {
    return getRepositoryGuidanceFunc(this.repositoryPath);
  }

  /**
   * Get the repository path
   */
  getRepositoryPath(): string {
    return this.repositoryPath;
  }

  /**
   * Get the repository configuration
   */
  getConfiguration(): RepositoryConfigurationType {
    return getRepositoryConfigurationFunc(this.repositoryPath);
  }

  /**
   * Update the repository configuration
   */
  updateConfiguration(config: {
    version?: number;
    limits?: Partial<RepositoryConfigurationType['limits']>;
    storage?: Partial<RepositoryConfigurationType['storage']>;
    tags?: Partial<RepositoryConfigurationType['tags']>;
  }): RepositoryConfigurationType {
    return updateRepositoryConfigurationFunc(this.repositoryPath, config);
  }

  /**
   * Get allowed tags configuration
   */
  getAllowedTags(): { enforced: boolean; tags: string[] } {
    return getAllowedTagsFunc(this.repositoryPath);
  }

  /**
   * Add a tag to the allowed tags list
   */
  addAllowedTag(tag: string): void {
    return addAllowedTagFunc(this.repositoryPath, tag);
  }

  /**
   * Remove a tag from the allowed tags list
   */
  removeAllowedTag(tag: string): boolean {
    return removeAllowedTagFunc(this.repositoryPath, tag);
  }


  /**
   * Enable or disable allowed tags enforcement
   */
  setEnforceAllowedTags(enforce: boolean): void {
    return setEnforceAllowedTagsFunc(this.repositoryPath, enforce);
  }

  /**
   * Validate a note against the repository configuration
   */
  validateNote(note: Omit<StoredNoteType, 'id' | 'timestamp'>): ValidationErrorType[] {
    return validateNoteAgainstConfigFunc(note, this.repositoryPath);
  }

  /**
   * Get a note by ID
   */
  getNoteById(noteId: string): StoredNoteType | null {
    return getNoteByIdFunc(this.repositoryPath, noteId);
  }

  /**
   * Delete a note by ID
   */
  deleteNoteById(noteId: string): boolean {
    return deleteNoteByIdFunc(this.repositoryPath, noteId);
  }

  /**
   * Check for notes with stale anchors
   */
  checkStaleNotes(): StaleNoteType[] {
    return checkStaleNotesFunc(this.repositoryPath);
  }

  /**
   * Get all tag descriptions
   */
  getTagDescriptions(): Record<string, string> {
    return getTagDescriptionsFunc(this.repositoryPath);
  }

  /**
   * Save or update a tag description
   */
  saveTagDescription(tag: string, description: string): void {
    return saveTagDescriptionFunc(this.repositoryPath, tag, description);
  }

  /**
   * Delete a tag description
   */
  deleteTagDescription(tag: string): boolean {
    return deleteTagDescriptionFunc(this.repositoryPath, tag);
  }

  /**
   * Get all tags with their descriptions
   */
  getTagsWithDescriptions(): TagInfoType[] {
    return getTagsWithDescriptionsFunc(this.repositoryPath);
  }
}

// Export a default instance for convenience
export const defaultMemory = new A24zMemory();
