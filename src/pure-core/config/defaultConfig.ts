/**
 * Centralized default configuration for a24z-Memory
 * All default values should be defined here for easier maintenance
 */

import type { MemoryPalaceConfiguration } from '../types';

/**
 * Configuration interface for A24z Memory AI functionality
 */
export interface A24zMemoryConfig {
  noteFetching: {
    maxNotesPerQuery: number;
    relevanceThreshold: number;
    includeParentPaths: boolean;
    searchDepth: number;
  };
  responseStyle: {
    acknowledgeLimitations: boolean;
    suggestNoteSaving: boolean;
    conversationalTone: 'mentor' | 'casual' | 'formal';
  };
}

/**
 * Repository storage and limits configuration
 */
export const DEFAULT_REPOSITORY_CONFIG: MemoryPalaceConfiguration = {
  version: 1,
  limits: {
    noteMaxLength: 500, // 500 characters - forces concise, focused notes
    maxTagsPerNote: 3, // 3 tags max - encourages selective tagging
    maxAnchorsPerNote: 5, // 5 anchors max - keeps notes focused on specific areas
    tagDescriptionMaxLength: 500, // 500 characters for tag descriptions
  },
  storage: {
    compressionEnabled: false,
  },
  tags: {
    enforceAllowedTags: false, // Disabled by default for flexibility
  },
  enabled_mcp_tools: {
    // Core tools - always enabled
    create_repository_note: true,
    get_notes: true,
    get_repository_tags: true,
    get_repository_types: true,
    get_repository_guidance: true,

    // Management tools
    delete_repository_note: true,
    get_repository_note: true,

    // Analysis tools
    get_stale_notes: true,
    get_tag_usage: true,
    delete_tag: true,
    replace_tag: true,
    get_note_coverage: true,

    // Codebase view tools
    list_codebase_views: true,
  },
};

/**
 * Note fetching configuration for search and retrieval
 */
export const DEFAULT_NOTE_FETCHING_CONFIG = {
  maxNotesPerQuery: 20,
  relevanceThreshold: 0.3,
  includeParentPaths: true,
  searchDepth: 3,
};

/**
 * Response style configuration for AI interactions
 */
export const DEFAULT_RESPONSE_STYLE_CONFIG = {
  acknowledgeLimitations: true,
  suggestNoteSaving: true,
  conversationalTone: 'mentor' as const,
};

/**
 * Combined A24z Memory configuration for AI tools
 */
export const DEFAULT_A24Z_MEMORY_CONFIG: A24zMemoryConfig = {
  noteFetching: DEFAULT_NOTE_FETCHING_CONFIG,
  responseStyle: DEFAULT_RESPONSE_STYLE_CONFIG,
};

/**
 * Default tag suggestions based on common categories
 */
export const DEFAULT_TAG_CATEGORIES = {
  technical: ['architecture', 'performance', 'security', 'testing', 'refactoring'],
  domain: ['authentication', 'database', 'api', 'ui', 'backend', 'frontend'],
  quality: ['bugfix', 'optimization', 'cleanup', 'documentation'],
  status: ['wip', 'deprecated', 'experimental', 'stable'],
};

/**
 * Get all default configurations as a single object
 */
export function getAllDefaultConfigs() {
  return {
    repository: DEFAULT_REPOSITORY_CONFIG,
    noteFetching: DEFAULT_NOTE_FETCHING_CONFIG,
    responseStyle: DEFAULT_RESPONSE_STYLE_CONFIG,
    a24zMemory: DEFAULT_A24Z_MEMORY_CONFIG,
    tagCategories: DEFAULT_TAG_CATEGORIES,
  };
}

/**
 * Helper to get default configuration with overrides
 */
export function getConfigWithOverrides<T extends Record<string, unknown>>(
  defaultConfig: T,
  overrides?: Partial<T>
): T {
  if (!overrides) return defaultConfig;

  // Simple shallow merge - deep merging is complex with TypeScript generics
  return { ...defaultConfig, ...overrides };
}
