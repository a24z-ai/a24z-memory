export { McpServer } from './server';
export { BaseTool } from './tools';
export type { McpTool, McpToolResult, McpResource, McpServerConfig } from './types';

// View system exports
export { viewsStore, ViewsStore, generateViewIdFromName } from './store/codebaseViewsStore';
export type {
  CodebaseView,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewSummary,
  ViewValidationResult,
  PatternValidationResult,
} from './store/codebaseViewsStore';

// Validation exports
export {
  validateCodebaseViewFileCell,
  validateCodebaseView,
  validatePatterns,
  validateGridDimensions,
  detectPatternConflicts,
} from './validation/codebaseViewValidator';

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
} from './services/codebaseViewQueryService';
export type {
  ViewQueryOptions,
  ViewQueryResult,
  MultiViewSearchResult,
  ViewCoverageAnalysis,
} from './services/codebaseViewQueryService';
