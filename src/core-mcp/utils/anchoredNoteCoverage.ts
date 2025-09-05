import * as fs from 'node:fs';
import * as path from 'node:path';
import { readAllNotes } from '../store/anchoredNotesStore';
import { normalizeRepositoryPath } from './pathNormalization';
import { getEligibleFilesSync, type FileInfo } from './eligibleFiles';

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

export interface CoverageByType {
  [fileType: string]: {
    totalFiles: number;
    filesWithNotes: number;
    coveragePercentage: number;
    totalNotes: number;
  };
}

export interface FileWithCoverage extends FileInfo {
  hasNotes: boolean;
  noteCount: number;
  noteIds: string[];
}

export interface StaleAnchoredNote {
  noteId: string;
  anchor: string;
  noteContent: string;
}

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
  staleNotes: StaleAnchoredNote[];
  coveredFiles: FileWithCoverage[];
  uncoveredFiles: FileWithCoverage[];
  coveredDirectories: FileWithCoverage[];
  uncoveredDirectories: FileWithCoverage[];
}

/**
 * Normalize an anchor path to match against eligible files
 */
function normalizeAnchorPath(anchor: string, repoPath: string): string {
  // If anchor is absolute, make it relative to repo
  if (path.isAbsolute(anchor)) {
    return path.relative(repoPath, anchor);
  }
  // Already relative
  return anchor;
}

/**
 * Check if an anchor matches a file or directory path
 */
function anchorMatchesPath(anchor: string, targetPath: string, repoPath: string): boolean {
  const normalizedAnchor = normalizeAnchorPath(anchor, repoPath);

  // Direct match
  if (normalizedAnchor === targetPath) {
    return true;
  }

  // Check if anchor is a parent directory of the target
  if (targetPath.startsWith(normalizedAnchor + path.sep)) {
    return true;
  }

  // Check if target is a parent directory of the anchor
  if (normalizedAnchor.startsWith(targetPath + path.sep)) {
    return true;
  }

  return false;
}

/**
 * Calculate note coverage for a repository
 */
export function calculateAnchoredNoteCoverage(
  repositoryPath: string,
  options: {
    includeDirectories?: boolean;
    maxStaleAnchoredNotesToReport?: number;
    excludeDirectoryAnchors?: boolean;
  } = {}
): NoteCoverageReport {
  const {
    includeDirectories = true,
    maxStaleAnchoredNotesToReport = 50,
    excludeDirectoryAnchors = false,
  } = options;

  // Normalize repository path
  const repoPath = normalizeRepositoryPath(repositoryPath);

  // Get all eligible files and directories
  const { files, directories } = getEligibleFilesSync(repoPath, {
    includeDirectories,
  });

  // Get all notes for the repository
  const notesWithPaths = readAllNotes(repoPath);
  const notes = notesWithPaths.map((nwp) => nwp.note);

  // Initialize coverage maps
  const fileCoverageMap = new Map<string, FileWithCoverage>();
  const directoryCoverageMap = new Map<string, FileWithCoverage>();
  const staleNotes: StaleAnchoredNote[] = [];

  // Initialize all files with no coverage
  files.forEach((file) => {
    fileCoverageMap.set(file.relativePath, {
      ...file,
      hasNotes: false,
      noteCount: 0,
      noteIds: [],
    });
  });

  // Initialize all directories with no coverage
  directories.forEach((dir) => {
    directoryCoverageMap.set(dir.relativePath, {
      ...dir,
      hasNotes: false,
      noteCount: 0,
      noteIds: [],
    });
  });

  // Process each note and map to files/directories
  notes.forEach((note) => {
    note.anchors.forEach((anchor) => {
      let anchorMatched = false;

      // Check if this anchor itself is a directory (for exclusion purposes)
      const normalizedAnchor = normalizeAnchorPath(anchor, repoPath);
      const isDirectoryAnchor = directoryCoverageMap.has(normalizedAnchor);

      // Try to match against files
      fileCoverageMap.forEach((fileCoverage, filePath) => {
        if (anchorMatchesPath(anchor, filePath, repoPath)) {
          fileCoverage.hasNotes = true;
          fileCoverage.noteCount++;
          fileCoverage.noteIds.push(note.id);
          anchorMatched = true;
        }
      });

      // Try to match against directories (skip if excludeDirectoryAnchors is true and anchor IS a directory)
      if (!excludeDirectoryAnchors || !isDirectoryAnchor) {
        directoryCoverageMap.forEach((dirCoverage, dirPath) => {
          if (anchorMatchesPath(anchor, dirPath, repoPath)) {
            dirCoverage.hasNotes = true;
            dirCoverage.noteCount++;
            dirCoverage.noteIds.push(note.id);
            anchorMatched = true;
          }
        });
      } else if (isDirectoryAnchor) {
        // If we're excluding directory anchors and this IS a directory anchor,
        // mark it as matched so it's not considered stale
        anchorMatched = true;
      }

      // Check if this is a stale anchor (doesn't match any eligible file)
      if (!anchorMatched) {
        const absoluteAnchor = path.isAbsolute(anchor) ? anchor : path.join(repoPath, anchor);

        // Only consider it stale if the file doesn't exist at all
        // (not just excluded by .gitignore)
        if (!fs.existsSync(absoluteAnchor)) {
          staleNotes.push({
            noteId: note.id,
            anchor,
            noteContent: note.note.substring(0, 100) + (note.note.length > 100 ? '...' : ''),
          });
        }
      }
    });
  });

  // Convert maps to arrays
  const allFiles = Array.from(fileCoverageMap.values());
  const allDirectories = Array.from(directoryCoverageMap.values());

  // Separate covered and uncovered
  const coveredFiles = allFiles.filter((f) => f.hasNotes);
  const uncoveredFiles = allFiles.filter((f) => !f.hasNotes);
  const coveredDirectories = allDirectories.filter((d) => d.hasNotes);
  const uncoveredDirectories = allDirectories.filter((d) => !d.hasNotes);

  // Calculate metrics
  const totalFileNotes = coveredFiles.reduce((sum, f) => sum + f.noteCount, 0);
  const totalDirNotes = coveredDirectories.reduce((sum, d) => sum + d.noteCount, 0);

  const metrics: CoverageMetrics = {
    totalEligibleFiles: files.length,
    totalEligibleDirectories: directories.length,
    filesWithNotes: coveredFiles.length,
    directoriesWithNotes: coveredDirectories.length,
    fileCoveragePercentage: files.length > 0 ? (coveredFiles.length / files.length) * 100 : 0,
    directoryCoveragePercentage:
      directories.length > 0 ? (coveredDirectories.length / directories.length) * 100 : 0,
    totalNotes: notes.length,
    averageNotesPerCoveredFile: coveredFiles.length > 0 ? totalFileNotes / coveredFiles.length : 0,
    averageNotesPerCoveredDirectory:
      coveredDirectories.length > 0 ? totalDirNotes / coveredDirectories.length : 0,
  };

  // Calculate coverage by file type
  const coverageByType: CoverageByType = {};

  allFiles.forEach((file) => {
    const type = file.extension || 'no-extension';

    if (!coverageByType[type]) {
      coverageByType[type] = {
        totalFiles: 0,
        filesWithNotes: 0,
        coveragePercentage: 0,
        totalNotes: 0,
      };
    }

    coverageByType[type].totalFiles++;
    if (file.hasNotes) {
      coverageByType[type].filesWithNotes++;
      coverageByType[type].totalNotes += file.noteCount;
    }
  });

  // Calculate percentages for each type
  Object.values(coverageByType).forEach((typeInfo) => {
    typeInfo.coveragePercentage =
      typeInfo.totalFiles > 0 ? (typeInfo.filesWithNotes / typeInfo.totalFiles) * 100 : 0;
  });

  // Get files with most notes
  const filesWithMostNotes = coveredFiles
    .sort((a, b) => b.noteCount - a.noteCount)
    .slice(0, 10)
    .map((f) => ({
      path: f.relativePath,
      noteCount: f.noteCount,
    }));

  // Get largest uncovered files
  const largestUncoveredFiles = uncoveredFiles
    .filter((f) => f.size !== undefined)
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .slice(0, 10)
    .map((f) => ({
      path: f.relativePath,
      size: f.size || 0,
    }));

  // Limit stale notes
  const limitedStaleAnchoredNotes = staleNotes.slice(0, maxStaleAnchoredNotesToReport);

  return {
    repositoryPath: repoPath,
    metrics,
    coverageByType,
    filesWithMostNotes,
    largestUncoveredFiles,
    staleNotes: limitedStaleAnchoredNotes,
    coveredFiles,
    uncoveredFiles,
    coveredDirectories,
    uncoveredDirectories,
  };
}
