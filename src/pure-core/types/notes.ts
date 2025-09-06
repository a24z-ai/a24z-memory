/**
 * Note-specific types for a24z-memory
 * These types are used for note operations like merging, filtering, and result sets
 */

import { StoredAnchoredNote } from './index';

// ============================================================================
// Note Query Result Types
// ============================================================================

/**
 * Token limit information for notes queries
 */
export interface TokenLimitInfo {
  totalTokens: number;
  limit: number;
  limitType: 'count' | 'tokens';
  notesIncluded: number;
  notesExcluded: number;
}

/**
 * Result of a notes query with optional token limiting
 */
export interface AnchoredNotesResult {
  notes: Array<StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number }>;
  tokenInfo?: TokenLimitInfo;
}

// ============================================================================
// Note Merging Types
// ============================================================================

/**
 * Input for merging multiple notes into one
 */
export interface MergeAnchoredNotesInput {
  note: string;
  anchors: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
  noteIds: string[];
  codebaseViewId: string;
}

/**
 * Result of merging notes operation
 */
export interface MergeAnchoredNotesResult {
  mergedNote: StoredAnchoredNote;
  deletedCount: number;
}

// ============================================================================
// Re-export types that are defined elsewhere but belong to notes domain
// ============================================================================

export { StoredAnchoredNote, AnchoredNoteWithPath } from './index';
export { StaleAnchoredNote } from '../stores/AnchoredNotesStore';