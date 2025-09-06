/**
 * Token counting utilities for limiting notes by token count
 */

import { countTokens } from 'gpt-tokenizer';
import type { StoredAnchoredNote } from '../store/anchoredNotesStore';

export type LimitType = 'count' | 'tokens';

/**
 * Calculate the token count for a note
 * Includes all relevant fields that would be sent to an LLM
 */
export function countNoteTokens(note: StoredAnchoredNote): number {
  // Format the note as it would appear in context
  const noteText = formatNoteForTokenCount(note);
  return countTokens(noteText);
}

/**
 * Format a note for token counting
 * This should match how notes are formatted when sent to LLMs
 */
function formatNoteForTokenCount(note: StoredAnchoredNote): string {
  // Match the format used in AskA24zMemoryTool
  const parts = [
    `Note ID: ${note.id}`,
    `Type: ${false}`,
    `Tags: ${note.tags.join(', ')}`,
    `Anchors: ${note.anchors.join(', ')}`,
    `Content: ${note.note}`,
  ];

  if (note.metadata && Object.keys(note.metadata).length > 0) {
    parts.push(`Metadata: ${JSON.stringify(note.metadata)}`);
  }

  return parts.join('\n');
}

/**
 * Calculate cumulative token count for multiple notes
 */
export function countNotesTokens(notes: StoredAnchoredNote[]): number {
  return notes.reduce((total, note) => total + countNoteTokens(note), 0);
}

/**
 * Filter notes to fit within token limit
 * Returns notes that fit within the limit, preserving order
 */
export function filterNotesByTokenLimit(
  notes: StoredAnchoredNote[],
  maxTokens: number
): StoredAnchoredNote[] {
  const result: StoredAnchoredNote[] = [];
  let currentTokens = 0;

  for (const note of notes) {
    const noteTokens = countNoteTokens(note);
    if (currentTokens + noteTokens <= maxTokens) {
      result.push(note);
      currentTokens += noteTokens;
    } else {
      // Stop adding notes once we would exceed the limit
      break;
    }
  }

  return result;
}

/**
 * Get information about how notes fit within limits
 */
export interface TokenLimitInfo {
  totalNotes: number;
  includedNotes: number;
  totalTokens: number;
  usedTokens: number;
  remainingTokens: number;
  truncated: boolean;
}

export function getTokenLimitInfo(notes: StoredAnchoredNote[], maxTokens: number): TokenLimitInfo {
  let usedTokens = 0;
  let includedNotes = 0;

  for (const note of notes) {
    const noteTokens = countNoteTokens(note);
    if (usedTokens + noteTokens <= maxTokens) {
      usedTokens += noteTokens;
      includedNotes++;
    } else {
      break;
    }
  }

  const totalTokens = countNotesTokens(notes);

  return {
    totalNotes: notes.length,
    includedNotes,
    totalTokens,
    usedTokens,
    remainingTokens: maxTokens - usedTokens,
    truncated: includedNotes < notes.length,
  };
}

/**
 * Check if a set of notes fits within token limit
 */
export function isWithinTokenLimit(notes: StoredAnchoredNote[], maxTokens: number): boolean {
  const totalTokens = countNotesTokens(notes);
  return totalTokens <= maxTokens;
}
