export { McpServer } from './server';
export { BaseTool } from './tools';
export type { McpTool, McpToolResult, McpResource, McpServerConfig } from './types';

// View system exports
export { viewsStore, ViewsStore } from './store/viewsStore';
export type {
  CodebaseView,
  ViewFileCell,
  ViewScope,
  ViewSummary,
  ViewValidationResult,
  PatternValidationResult,
} from './store/viewsStore';

// Validation exports
export {
  validateViewFileCell,
  validateCodebaseView,
  validatePatterns,
  validateGridDimensions,
  detectPatternConflicts,
} from './validation/viewValidator';

// View-based note association exports
export {
  saveNoteWithView,
  getNotesForView,
  getNotesForCell,
  detectCellForAnchors,
  updateNoteView,
  getOrphanedNotes,
  getViewStatistics,
} from './store/notesStore';
export type { SaveNoteWithViewInput } from './store/notesStore';

// View query service exports
export {
  queryNotesInView,
  queryNotesInCell,
  searchAcrossViews,
  queryOrphanedNotes,
  analyzeViewCoverage,
  findSimilarNotesInView,
} from './services/viewQueryService';
export type {
  ViewQueryOptions,
  ViewQueryResult,
  MultiViewSearchResult,
  ViewCoverageAnalysis,
} from './services/viewQueryService';
