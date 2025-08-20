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
  getCommonTags,
  getSuggestedTagsForPath,
  getRepositoryGuidance,
  type StoredNote,
  type NoteConfidence,
  type NoteType
} from './core-mcp/store/notesStore';

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
export { CopyGuidanceTemplateTool } from './core-mcp/tools/CopyGuidanceTemplateTool';
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
  type StoredNote as StoredNoteType,
  type NoteConfidence as NoteConfidenceType,
  type NoteType as NoteTypeType
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
}

// Export a default instance for convenience
export const defaultMemory = new A24zMemory();