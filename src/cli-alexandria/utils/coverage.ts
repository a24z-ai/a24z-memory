/**
 * Context coverage calculation utilities
 */

import * as path from 'node:path';
import { globby } from 'globby';
import { ALEXANDRIA_DIRS } from '../../constants/paths.js';
import { createMemoryPalace } from './repository.js';

export interface CoverageMetrics {
  totalFiles: number;
  coveredFiles: number;
  coveredFilesList: string[];
  uncoveredFiles: string[];
  coveragePercentage: number;
  filesByExtension: Map<string, { total: number; covered: number }>;
}

export interface CoverageOptions {
  includeExtensions?: string[];
  excludePatterns?: string[];
  useGitignore?: boolean;
}

const DEFAULT_SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.go',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.rs',
  '.swift',
  '.kt',
  '.scala',
  '.php',
  '.cs',
  '.vue',
  '.svelte',
  '.astro',
  '.md',
  '.mdx',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.html',
];

/**
 * Get additional patterns to ignore beyond .gitignore
 * Note: .gitignore is handled automatically by globby
 */
export function getIgnorePatterns(): string[] {
  const patterns: string[] = [];

  // Always ignore Alexandria directories
  patterns.push(`**/${ALEXANDRIA_DIRS.PRIMARY}/**`);
  patterns.push(`${ALEXANDRIA_DIRS.PRIMARY}/**`);
  patterns.push(`.${ALEXANDRIA_DIRS.PRIMARY}/**`);

  // Common patterns to always ignore
  patterns.push('**/node_modules/**');
  patterns.push('**/.git/**');
  patterns.push('**/dist/**');
  patterns.push('**/build/**');
  patterns.push('**/coverage/**');
  patterns.push('**/*.log');
  patterns.push('**/.DS_Store');
  patterns.push('**/Thumbs.db');

  // Add .gitignore patterns if requested
  // globby will handle .gitignore automatically with gitignore option

  return patterns;
}

/**
 * Get all source files in the repository using globby
 */
export async function getAllSourceFiles(
  repoPath: string,
  options: CoverageOptions = {}
): Promise<Set<string>> {
  const ignorePatterns = options.excludePatterns || getIgnorePatterns();
  const validExtensions = options.includeExtensions || DEFAULT_SOURCE_EXTENSIONS;

  // Build glob patterns for the extensions we want
  const patterns = validExtensions.map((ext) => `**/*${ext}`);

  // Use globby to find all matching files
  const files = await globby(patterns, {
    cwd: repoPath,
    ignore: ignorePatterns,
    gitignore: options.useGitignore !== false,
    dot: true,
    onlyFiles: true,
  });

  return new Set(files);
}

/**
 * Get all files referenced in Alexandria views
 */
export function getReferencedFiles(repoPath: string): Set<string> {
  const referencedFiles = new Set<string>();
  const palace = createMemoryPalace(repoPath);
  const views = palace.listViews();

  for (const view of views) {
    if (view.cells) {
      for (const cellName in view.cells) {
        const cell = view.cells[cellName];
        // Check if it's a file cell (has 'files' property)
        if ('files' in cell && Array.isArray(cell.files)) {
          for (const file of cell.files) {
            // Normalize the file path
            const normalizedFile = file.startsWith('/') ? file.slice(1) : file;
            referencedFiles.add(normalizedFile);
          }
        }
      }
    }
  }

  return referencedFiles;
}

/**
 * Calculate coverage metrics
 */
export function calculateCoverageMetrics(
  sourceFiles: Set<string>,
  referencedFiles: Set<string>
): CoverageMetrics {
  const uncoveredFiles: string[] = [];
  const coveredFilesList: string[] = [];
  const filesByExtension = new Map<string, { total: number; covered: number }>();

  for (const file of sourceFiles) {
    const ext = path.extname(file).toLowerCase() || 'no-ext';

    // Update extension stats
    if (!filesByExtension.has(ext)) {
      filesByExtension.set(ext, { total: 0, covered: 0 });
    }
    const extStats = filesByExtension.get(ext)!;
    extStats.total++;

    // Check if file is covered
    if (referencedFiles.has(file)) {
      extStats.covered++;
      coveredFilesList.push(file);
    } else {
      uncoveredFiles.push(file);
    }
  }

  // Sort both lists for consistent output
  uncoveredFiles.sort();
  coveredFilesList.sort();

  const totalFiles = sourceFiles.size;
  const coveredFiles = coveredFilesList.length;
  const coveragePercentage = totalFiles > 0 ? (coveredFiles / totalFiles) * 100 : 100;

  return {
    totalFiles,
    coveredFiles,
    coveredFilesList,
    uncoveredFiles,
    coveragePercentage,
    filesByExtension,
  };
}

/**
 * Get context coverage for a repository
 */
export async function getContextCoverage(
  repoPath: string,
  options: CoverageOptions = {}
): Promise<CoverageMetrics> {
  // Get all source files
  const sourceFiles = await getAllSourceFiles(repoPath, options);

  // Get referenced files from views
  const referencedFiles = getReferencedFiles(repoPath);

  // Calculate and return metrics
  return calculateCoverageMetrics(sourceFiles, referencedFiles);
}
