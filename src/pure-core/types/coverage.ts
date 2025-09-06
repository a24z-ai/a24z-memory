/**
 * Coverage analysis types for a24z-memory
 * These types are used for analyzing note coverage across a codebase
 */

import { StaleAnchoredNote } from '../stores/AnchoredNotesStore';

// ============================================================================
// Coverage Metrics
// ============================================================================

export interface CoverageMetrics {
  totalEligibleFiles: number;
  totalEligibleDirectories: number;
  filesWithNotes: number;
  directoriesWithNotes: number;
  fileCoveragePercentage: number;
  directoryCoveragePercentage: number;
  totalNotes: number;
  averageNotesPerCoveredFile: number;
  averageNotesPerCoveredDirectory: number;
}

// ============================================================================
// Coverage by File Type
// ============================================================================

export interface CoverageByType {
  [fileType: string]: {
    totalFiles: number;
    filesWithNotes: number;
    coveragePercentage: number;
    totalNotes: number;
  };
}

// ============================================================================
// File Information
// ============================================================================

export interface FileInfo {
  relativePath: string;
  extension?: string;
  size: number;
  isDirectory: boolean;
}

export interface FileWithCoverage extends FileInfo {
  hasNotes: boolean;
  noteCount: number;
  noteIds: string[];
}

// ============================================================================
// Coverage Report
// ============================================================================

export interface NoteCoverageReport {
  repositoryPath: string;
  metrics: CoverageMetrics;
  coverageByType: CoverageByType;
  filesWithMostNotes: Array<{
    path: string;
    noteCount: number;
  }>;
  largestUncoveredFiles: Array<{
    path: string;
    size: number;
  }>;
  recentlyModifiedUncoveredFiles: Array<{
    path: string;
    lastModified: number;
  }>;
  staleAnchoredNotes: Array<{
    noteId: string;
    anchor: string;
    noteContent: string;
  }>;
  coveredFiles: FileWithCoverage[];
  uncoveredFiles: FileInfo[];
}