/**
 * View-based query service for advanced note retrieval and analysis
 *
 * This service provides high-level querying capabilities for notes organized
 * within CodebaseView configurations, enabling sophisticated knowledge retrieval
 * based on spatial organization and view context.
 */

import {
  StoredNote,
  getNotesForView,
  getNotesForCell,
  getOrphanedNotes,
  getViewStatistics,
} from '../store/notesStore';
import { viewsStore } from '../store/viewsStore';

/**
 * Query options for view-based note searches
 */
export interface ViewQueryOptions {
  includeStale?: boolean;
  sortBy?: 'timestamp' | 'reviewed' | 'relevance';
  limit?: number;
  offset?: number;
  tags?: string[];
  searchText?: string;
  reviewedOnly?: boolean;
}

/**
 * Result of a view-based query
 */
export interface ViewQueryResult {
  notes: StoredNote[];
  totalCount: number;
  hasMore: boolean;
  viewInfo?: {
    id: string;
    name: string;
    cellName?: string;
    coordinates?: [number, number];
  };
}

/**
 * Multi-view search result
 */
export interface MultiViewSearchResult {
  results: Array<{
    viewId: string;
    viewName: string;
    notes: StoredNote[];
    relevanceScore: number;
  }>;
  totalNotes: number;
  searchQuery: string;
}

/**
 * View coverage analysis
 */
export interface ViewCoverageAnalysis {
  viewId: string;
  viewName: string;
  totalCells: number;
  populatedCells: number;
  emptyCell: number;
  averageNotesPerCell: number;
  cellDetails: Array<{
    cellName: string;
    coordinates: [number, number];
    noteCount: number;
    density: 'empty' | 'sparse' | 'normal' | 'dense';
  }>;
}

/**
 * Get all notes in a view with advanced filtering
 */
export function queryNotesInView(
  repositoryPath: string,
  viewId: string,
  options: ViewQueryOptions = {}
): ViewQueryResult {
  const notes = getNotesForView(repositoryPath, viewId);

  let filteredNotes = notes;

  // Apply additional filters
  if (options.tags && options.tags.length > 0) {
    filteredNotes = filteredNotes.filter((note) =>
      options.tags!.some((tag) => note.tags.includes(tag))
    );
  }

  if (options.searchText) {
    const searchLower = options.searchText.toLowerCase();
    filteredNotes = filteredNotes.filter(
      (note) =>
        note.note.toLowerCase().includes(searchLower) ||
        note.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  if (options.reviewedOnly) {
    filteredNotes = filteredNotes.filter((note) => note.reviewed === true);
  }

  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit;
  const totalCount = filteredNotes.length;

  if (limit) {
    filteredNotes = filteredNotes.slice(offset, offset + limit);
  }

  const view = viewsStore.getView(repositoryPath, viewId);

  return {
    notes: filteredNotes,
    totalCount,
    hasMore: limit ? offset + limit < totalCount : false,
    viewInfo: view
      ? {
          id: view.id,
          name: view.name || view.id,
        }
      : undefined,
  };
}

/**
 * Get notes in a specific cell with advanced filtering
 */
export function queryNotesInCell(
  repositoryPath: string,
  viewId: string,
  cellCoordinates: [number, number],
  options: ViewQueryOptions = {}
): ViewQueryResult {
  const notes = getNotesForCell(repositoryPath, viewId, cellCoordinates);

  let filteredNotes = notes;

  // Apply same filtering logic as queryNotesInView
  if (options.tags && options.tags.length > 0) {
    filteredNotes = filteredNotes.filter((note) =>
      options.tags!.some((tag) => note.tags.includes(tag))
    );
  }

  if (options.searchText) {
    const searchLower = options.searchText.toLowerCase();
    filteredNotes = filteredNotes.filter(
      (note) =>
        note.note.toLowerCase().includes(searchLower) ||
        note.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  if (options.reviewedOnly) {
    filteredNotes = filteredNotes.filter((note) => note.reviewed === true);
  }

  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit;
  const totalCount = filteredNotes.length;

  if (limit) {
    filteredNotes = filteredNotes.slice(offset, offset + limit);
  }

  const view = viewsStore.getView(repositoryPath, viewId);
  let cellName: string | undefined;

  // Find cell name by coordinates
  if (view) {
    const cellEntry = Object.entries(view.cells).find(([, cell]) => {
      const [row, col] = cell.coordinates;
      const [targetRow, targetCol] = cellCoordinates;
      return row === targetRow && col === targetCol;
    });
    cellName = cellEntry ? cellEntry[0] : undefined;
  }

  return {
    notes: filteredNotes,
    totalCount,
    hasMore: limit ? offset + limit < totalCount : false,
    viewInfo: view
      ? {
          id: view.id,
          name: view.name || view.id,
          cellName,
          coordinates: cellCoordinates,
        }
      : undefined,
  };
}

/**
 * Search across multiple views
 */
export function searchAcrossViews(
  repositoryPath: string,
  query: string,
  options: {
    viewIds?: string[]; // Specific views to search, or all if undefined
    limit?: number;
    includeStale?: boolean;
    tags?: string[];
  } = {}
): MultiViewSearchResult {
  const availableViews = viewsStore.listViews(repositoryPath);
  const viewsToSearch = options.viewIds
    ? availableViews.filter((v) => options.viewIds!.includes(v.id))
    : availableViews;

  const results: MultiViewSearchResult['results'] = [];
  let totalNotes = 0;

  for (const viewSummary of viewsToSearch) {
    const viewResult = queryNotesInView(repositoryPath, viewSummary.id, {
      searchText: query,
      includeStale: options.includeStale,
      tags: options.tags,
      limit: options.limit,
    });

    if (viewResult.notes.length > 0) {
      // Calculate relevance score based on match quality
      const relevanceScore = calculateRelevanceScore(viewResult.notes, query);

      results.push({
        viewId: viewSummary.id,
        viewName: viewSummary.name,
        notes: viewResult.notes,
        relevanceScore,
      });

      totalNotes += viewResult.notes.length;
    }
  }

  // Sort results by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    results,
    totalNotes,
    searchQuery: query,
  };
}

/**
 * Get orphaned notes (notes with no view association)
 */
export function queryOrphanedNotes(
  repositoryPath: string,
  options: ViewQueryOptions = {}
): ViewQueryResult {
  const notes = getOrphanedNotes(repositoryPath);

  let filteredNotes = notes;

  // Apply filtering
  if (options.tags && options.tags.length > 0) {
    filteredNotes = filteredNotes.filter((note) =>
      options.tags!.some((tag) => note.tags.includes(tag))
    );
  }

  if (options.searchText) {
    const searchLower = options.searchText.toLowerCase();
    filteredNotes = filteredNotes.filter(
      (note) =>
        note.note.toLowerCase().includes(searchLower) ||
        note.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  if (options.reviewedOnly) {
    filteredNotes = filteredNotes.filter((note) => note.reviewed === true);
  }

  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit;
  const totalCount = filteredNotes.length;

  if (limit) {
    filteredNotes = filteredNotes.slice(offset, offset + limit);
  }

  return {
    notes: filteredNotes,
    totalCount,
    hasMore: limit ? offset + limit < totalCount : false,
  };
}

/**
 * Analyze view coverage and density
 */
export function analyzeViewCoverage(
  repositoryPath: string,
  viewId: string
): ViewCoverageAnalysis | null {
  const view = viewsStore.getView(repositoryPath, viewId);
  if (!view) {
    return null;
  }

  const stats = getViewStatistics(repositoryPath, viewId);
  const cellDetails = Object.entries(view.cells).map(([cellName, cell]) => {
    const noteCount = stats.cellStats[cellName]?.noteCount || 0;
    let density: 'empty' | 'sparse' | 'normal' | 'dense';

    if (noteCount === 0) {
      density = 'empty';
    } else if (noteCount <= 2) {
      density = 'sparse';
    } else if (noteCount <= 5) {
      density = 'normal';
    } else {
      density = 'dense';
    }

    return {
      cellName,
      coordinates: cell.coordinates,
      noteCount,
      density,
    };
  });

  const totalCells = Object.keys(view.cells).length;
  const populatedCells = cellDetails.filter((cell) => cell.noteCount > 0).length;
  const emptyCells = totalCells - populatedCells;
  const averageNotesPerCell = totalCells > 0 ? stats.totalNotes / totalCells : 0;

  return {
    viewId: view.id,
    viewName: view.name || view.id,
    totalCells,
    populatedCells,
    emptyCell: emptyCells,
    averageNotesPerCell: Math.round(averageNotesPerCell * 100) / 100,
    cellDetails: cellDetails.sort((a, b) => b.noteCount - a.noteCount),
  };
}

/**
 * Get similar notes within a view based on tags and content
 */
export function findSimilarNotesInView(
  repositoryPath: string,
  viewId: string,
  referenceNote: StoredNote,
  options: {
    limit?: number;
    minSimilarity?: number; // 0-1 scale
  } = {}
): StoredNote[] {
  const viewNotes = getNotesForView(repositoryPath, viewId);
  const similarities: Array<{ note: StoredNote; score: number }> = [];

  for (const note of viewNotes) {
    if (note.id === referenceNote.id) continue;

    const similarity = calculateNoteSimilarity(referenceNote, note);
    if (similarity >= (options.minSimilarity || 0.3)) {
      similarities.push({ note, score: similarity });
    }
  }

  similarities.sort((a, b) => b.score - a.score);

  const limit = options.limit || 10;
  return similarities.slice(0, limit).map((s) => s.note);
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(notes: StoredNote[], query: string): number {
  if (notes.length === 0) return 0;

  const queryLower = query.toLowerCase();
  let totalScore = 0;

  for (const note of notes) {
    let noteScore = 0;

    // Score based on exact matches in content
    const contentMatches = (note.note.toLowerCase().match(new RegExp(queryLower, 'g')) || [])
      .length;
    noteScore += contentMatches * 10;

    // Score based on tag matches
    const tagMatches = note.tags.filter((tag) => tag.toLowerCase().includes(queryLower)).length;
    noteScore += tagMatches * 5;

    // Score based on partial word matches
    const words = queryLower.split(/\s+/);
    for (const word of words) {
      if (note.note.toLowerCase().includes(word)) {
        noteScore += 2;
      }
    }

    totalScore += noteScore;
  }

  return Math.round((totalScore / notes.length) * 100) / 100;
}

/**
 * Calculate similarity between two notes
 */
function calculateNoteSimilarity(note1: StoredNote, note2: StoredNote): number {
  let similarity = 0;
  let factors = 0;

  // Tag similarity (most important factor)
  const commonTags = note1.tags.filter((tag) => note2.tags.includes(tag));
  const allTags = new Set([...note1.tags, ...note2.tags]);
  if (allTags.size > 0) {
    similarity += (commonTags.length / allTags.size) * 0.6;
    factors += 0.6;
  }

  // Anchor similarity
  const commonAnchors = note1.anchors.filter((anchor) => note2.anchors.includes(anchor));
  const allAnchors = new Set([...note1.anchors, ...note2.anchors]);
  if (allAnchors.size > 0) {
    similarity += (commonAnchors.length / allAnchors.size) * 0.3;
    factors += 0.3;
  }

  // Content similarity (basic word overlap)
  const words1 = new Set(note1.note.toLowerCase().match(/\w+/g) || []);
  const words2 = new Set(note2.note.toLowerCase().match(/\w+/g) || []);
  const commonWords = [...words1].filter((word) => words2.has(word));
  const allWords = new Set([...words1, ...words2]);
  if (allWords.size > 0) {
    similarity += (commonWords.length / allWords.size) * 0.1;
    factors += 0.1;
  }

  return factors > 0 ? similarity / factors : 0;
}
