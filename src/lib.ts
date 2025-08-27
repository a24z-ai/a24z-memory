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
  getNotesForPathWithLimit,
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
  // Review functionality
  getUnreviewedNotes,
  markNoteReviewed,
  markAllNotesReviewed,
  // Tag descriptions
  getTagDescriptions,
  saveTagDescription,
  deleteTagDescription,
  getTagsWithDescriptions,
  removeTagFromNotes,
  // Type descriptions
  getTypeDescriptions,
  saveTypeDescription,
  deleteTypeDescription,
  getTypesWithDescriptions,
  getAllowedTypes as getAllowedTypesFunc,
  addAllowedType as addAllowedTypeFunc,
  removeAllowedType as removeAllowedTypeFunc,
  setEnforceAllowedTypes as setEnforceAllowedTypesFunc,
  // Types
  type StoredNote,
  type NoteConfidence,
  type NoteType,
  type RepositoryConfiguration,
  type ValidationError,
  type StaleNote,
  type TagInfo,
  type TypeInfo,
  type NotesResult,
  type TokenLimitInfo,
} from './core-mcp/store/notesStore';

// Validation messages and utilities
export {
  ValidationMessageFormatter,
  ValidationMessageData,
  ValidationMessageOverrides,
  TypedValidationError,
  DEFAULT_VALIDATION_MESSAGES,
  loadValidationMessages,
  saveValidationMessages,
  getValidationMessagesPath,
} from './core-mcp/validation/messages';

// Token counting utilities
export {
  countNoteTokens,
  countNotesTokens,
  filterNotesByTokenLimit,
  isWithinTokenLimit,
  getTokenLimitInfo as getTokenLimitInfoFunc,
  type LimitType,
} from './core-mcp/utils/tokenCounter';

// Note similarity and deduplication
export {
  calculateNoteSimilarity,
  findSimilarNotePairs,
  clusterSimilarNotes,
  isNoteStale,
  DEFAULT_THRESHOLDS,
  type NoteSimilarity,
  type SimilarityThresholds,
} from './core-mcp/utils/noteSimilarity';

// Path utilities
export {
  normalizeRepositoryPath,
  findGitRoot,
  findProjectRoot,
  getRepositoryName,
} from './core-mcp/utils/pathNormalization';

// Schema conversion utility
export { zodToJsonSchema } from './core-mcp/utils/zod-to-json-schema';

// Tool classes for direct use
export { RepositoryNoteTool } from './core-mcp/tools/RepositoryNoteTool';
export { AskA24zMemoryTool, type AskMemoryResponse } from './core-mcp/tools/AskA24zMemoryTool';
export { GetRepositoryTagsTool } from './core-mcp/tools/GetRepositoryTagsTool';
export { GetRepositoryGuidanceTool } from './core-mcp/tools/GetRepositoryGuidanceTool';
export { CheckStaleNotesTool } from './core-mcp/tools/CheckStaleNotesTool';
export { GetNoteByIdTool } from './core-mcp/tools/GetNoteByIdTool';
export { FindSimilarNotesTool } from './core-mcp/tools/FindSimilarNotesTool';
export { MergeNotesTool } from './core-mcp/tools/MergeNotesTool';
export { DeleteNoteTool } from './core-mcp/tools/DeleteNoteTool';
export { ReviewDuplicatesTool } from './core-mcp/tools/ReviewDuplicatesTool';
export { ConfigureLLMTool } from './core-mcp/tools/ConfigureLLMTool';
export { BaseTool } from './core-mcp/tools/base-tool';

// LLM Service exports
export {
  LLMService,
  type LLMConfig,
  type LLMContext,
  type LLMResponse,
} from './core-mcp/services/llm-service';

// API Key Manager
export { ApiKeyManager, type StoredApiKey } from './core-mcp/services/api-key-manager';

// Guidance Token Manager
export {
  GuidanceTokenManager,
  type TokenPayload,
  type TokenResult,
} from './core-mcp/services/guidance-token-manager';

// LLM Configurator
export {
  McpLLMConfigurator,
  SUPPORTED_PROVIDERS,
  type LLMProviderConfig,
} from './core-mcp/services/mcp-llm-configurator';

// Types
export type { McpTool, McpToolResult, McpResource } from './core-mcp/types';

// MCP Server (for those who want to embed it)
export { McpServer } from './core-mcp/server/McpServer';

// Import the functions at the top for use in the class
import {
  saveNote as saveNoteFunc,
  getNotesForPath as getNotesForPathFunc,
  getNotesForPathWithLimit as getNotesForPathWithLimitFunc,
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
  removeTagFromNotes as removeTagFromNotesFunc,
  getUnreviewedNotes as getUnreviewedNotesFunc,
  markNoteReviewed as markNoteReviewedFunc,
  markAllNotesReviewed as markAllNotesReviewedFunc,
  type StoredNote as StoredNoteType,
  type NoteConfidence as NoteConfidenceType,
  type NoteType as NoteTypeType,
  type RepositoryConfiguration as RepositoryConfigurationType,
  type ValidationError as ValidationErrorType,
  type StaleNote as StaleNoteType,
  type TagInfo as TagInfoType,
  type NotesResult,
} from './core-mcp/store/notesStore';

import { normalizeRepositoryPath as normalizeRepositoryPathFunc } from './core-mcp/utils/pathNormalization';

import { AskA24zMemoryTool, type AskMemoryResponse } from './core-mcp/tools/AskA24zMemoryTool';
import { LLMService, type LLMConfig } from './core-mcp/services/llm-service';
import {
  ValidationMessageFormatter as ValidationMessageFormatterImport,
  ValidationMessageData as ValidationMessageDataImport,
  ValidationMessageOverrides as ValidationMessageOverridesImport,
  DEFAULT_VALIDATION_MESSAGES as DEFAULT_VALIDATION_MESSAGES_IMPORT,
  saveValidationMessages as saveValidationMessagesImport,
  loadValidationMessages as loadValidationMessagesImport,
  getValidationMessagesPath as getValidationMessagesPathImport,
} from './core-mcp/validation/messages';

/**
 * High-level API for easy use
 */
export class A24zMemory {
  private repositoryPath: string;
  private llmConfig?: LLMConfig;
  private askTool?: AskA24zMemoryTool;
  private llmService?: LLMService;

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
      metadata: params.metadata || {},
    });
  }

  /**
   * Get all notes for a specific path without limits
   */
  getNotesForPath(targetPath: string, includeParentNotes = true) {
    return getNotesForPathFunc(targetPath, includeParentNotes);
  }

  /**
   * Get notes for a specific path with limits
   */
  getNotesForPathWithLimit(
    targetPath: string,
    includeParentNotes: boolean,
    limitType: 'count' | 'tokens',
    limit: number
  ): NotesResult {
    return getNotesForPathWithLimitFunc(targetPath, includeParentNotes, limitType, limit);
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
  removeAllowedTag(tag: string, removeFromNotes: boolean = true): boolean {
    return removeAllowedTagFunc(this.repositoryPath, tag, removeFromNotes);
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
  deleteTagDescription(tag: string, removeFromNotes: boolean = false): boolean {
    return deleteTagDescriptionFunc(this.repositoryPath, tag, removeFromNotes);
  }

  /**
   * Remove a tag from all notes in the repository
   */
  removeTagFromNotes(tag: string): number {
    return removeTagFromNotesFunc(this.repositoryPath, tag);
  }

  /**
   * Get all tags with their descriptions
   */
  getTagsWithDescriptions(): TagInfoType[] {
    return getTagsWithDescriptionsFunc(this.repositoryPath);
  }

  /**
   * Get all unreviewed notes for a path
   */
  getUnreviewedNotes(directoryPath?: string): StoredNoteType[] {
    return getUnreviewedNotesFunc(this.repositoryPath, directoryPath);
  }

  /**
   * Mark a note as reviewed
   */
  markNoteReviewed(noteId: string): boolean {
    return markNoteReviewedFunc(this.repositoryPath, noteId);
  }

  /**
   * Mark all notes as reviewed for a path
   */
  markAllNotesReviewed(directoryPath?: string): number {
    return markAllNotesReviewedFunc(this.repositoryPath, directoryPath);
  }

  /**
   * Ask the a24z memory system a question with enhanced metadata
   */
  async askMemory(params: {
    filePath: string;
    query: string;
    taskContext?: string;
    filterTags?: string[];
    filterTypes?: Array<'decision' | 'pattern' | 'gotcha' | 'explanation'>;
    options?: {
      includeFileContents?: boolean;
      maxNotes?: number;
      llmConfig?: LLMConfig;
    };
  }): Promise<AskMemoryResponse> {
    // Create or reuse the ask tool with the appropriate LLM config
    const llmConfig = params.options?.llmConfig || this.llmConfig;

    // Recreate the tool if LLM config changed
    if (!this.askTool || llmConfig !== this.llmConfig) {
      this.askTool = new AskA24zMemoryTool(llmConfig);
    }

    // If includeFileContents is specified, update the config
    if (params.options?.includeFileContents !== undefined && llmConfig) {
      const updatedConfig = {
        ...llmConfig,
        includeFileContents: params.options.includeFileContents,
      };
      this.askTool = new AskA24zMemoryTool(updatedConfig);
    }

    // Execute with metadata
    const result = await this.askTool.executeWithMetadata({
      filePath: params.filePath,
      query: params.query,
      taskContext: params.taskContext,
      filterTags: params.filterTags,
      filterTypes: params.filterTypes,
    });

    return result;
  }

  /**
   * Configure LLM settings for this instance
   */
  configureLLM(config: LLMConfig): void {
    this.llmConfig = config;
    this.llmService = new LLMService(config);
    this.askTool = new AskA24zMemoryTool(config);
  }

  /**
   * Check if LLM service is available
   */
  async isLLMAvailable(): Promise<boolean> {
    if (!this.llmService) {
      // Try to load default config and check
      const config = await LLMService.loadConfig();
      if (!config || config.provider === 'none') {
        return false;
      }
      this.llmService = new LLMService(config);
    }

    // Check if the service is reachable
    if (this.llmConfig?.provider === 'ollama') {
      try {
        const endpoint = this.llmConfig.endpoint || 'http://localhost:11434';
        const response = await fetch(`${endpoint}/api/tags`, {
          signal: AbortSignal.timeout(2000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Get validation message formatter with optional custom messages
   */
  getValidationFormatter(
    overrides?: ValidationMessageOverridesImport
  ): ValidationMessageFormatterImport {
    return new ValidationMessageFormatterImport(overrides);
  }

  /**
   * Get default validation messages
   */
  getDefaultValidationMessages() {
    return DEFAULT_VALIDATION_MESSAGES_IMPORT;
  }

  /**
   * Get validation message data types
   * This shows what data is available for each validation error type
   */
  getValidationMessageDataTypes(): Record<keyof ValidationMessageDataImport, string[]> {
    return {
      noteTooLong: ['actual', 'limit', 'overBy', 'percentage'],
      tooManyTags: ['actual', 'limit'],
      tooManyAnchors: ['actual', 'limit'],
      invalidTags: ['invalidTags', 'allowedTags'],
      invalidType: ['type', 'allowedTypes'],
      anchorOutsideRepo: ['anchor'],
      missingAnchors: ['actual'],
    };
  }

  /**
   * Save custom validation messages to the repository
   * These will be stored in .a24z/validation-messages.js
   */
  saveValidationMessages(messages: ValidationMessageOverridesImport): void {
    saveValidationMessagesImport(this.repositoryPath, messages);
  }

  /**
   * Load custom validation messages from the repository
   * Returns null if no custom messages are configured
   */
  loadValidationMessages(): ValidationMessageOverridesImport | null {
    return loadValidationMessagesImport(this.repositoryPath);
  }

  /**
   * Get the path where custom validation messages are stored
   */
  getValidationMessagesPath(): string {
    return getValidationMessagesPathImport(this.repositoryPath);
  }
}

// Export a default instance for convenience
export const defaultMemory = new A24zMemory();
