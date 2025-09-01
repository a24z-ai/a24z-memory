import * as fs from 'node:fs';
import * as path from 'node:path';
import { globby, globbySync } from 'globby';
import { normalizeRepositoryPath } from './pathNormalization';
import { createA24zIgnore } from './ignoreFileParser';

export interface FileInfo {
  absolutePath: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  extension: string;
}

export interface EligibleFilesOptions {
  includeDirectories?: boolean;
  patterns?: string[];
  additionalIgnorePatterns?: string[];
}

/**
 * Get all eligible files in a repository, respecting .gitignore
 * Always excludes .a24z directory since that's where notes are stored
 */
export async function getEligibleFiles(
  repositoryPath: string,
  options: EligibleFilesOptions = {}
): Promise<{ files: FileInfo[]; directories: FileInfo[] }> {
  const repoPath = normalizeRepositoryPath(repositoryPath);

  // Check if .gitignore exists at root
  const gitignorePath = path.join(repoPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    throw new Error(`No .gitignore file found at repository root: ${gitignorePath}`);
  }

  // Default patterns to match all files
  const patterns = options.patterns || ['**/*'];

  // Create ignore instance for .a24zignore
  const a24zIgnore = createA24zIgnore(repoPath);

  // Build ignore patterns for globby - always exclude .git and .a24z
  // Note: globby handles these as glob patterns, not gitignore patterns
  const globIgnorePatterns = [
    '.git',
    '**/.git',
    '**/.git/**',
    '.a24z',
    '**/.a24z',
    '**/.a24z/**',
    ...(options.additionalIgnorePatterns || []),
  ];

  try {
    // Get all files using globby
    // It automatically respects .gitignore files in the repository
    const entries = await globby(patterns, {
      cwd: repoPath,
      absolute: false,
      onlyFiles: false,
      markDirectories: true,
      gitignore: true, // This enables .gitignore support
      ignore: globIgnorePatterns,
      dot: true, // Include dotfiles (except .git and .a24z which we explicitly ignore)
    });

    // Filter entries using .a24zignore patterns (proper gitignore semantics)
    const filteredEntries = entries.filter((entry) => {
      // Remove trailing slash for directories before checking
      const pathToCheck = entry.endsWith('/') ? entry.slice(0, -1) : entry;
      return !a24zIgnore.ignores(pathToCheck);
    });

    const files: FileInfo[] = [];
    const directories: FileInfo[] = [];

    for (const entry of filteredEntries) {
      const relativePath = entry;
      const absolutePath = path.join(repoPath, relativePath);

      // Check if it's a directory (globby marks them with trailing slash)
      const isDirectory = relativePath.endsWith('/');
      const cleanPath = isDirectory ? relativePath.slice(0, -1) : relativePath;

      if (isDirectory) {
        if (options.includeDirectories) {
          directories.push({
            absolutePath: path.join(repoPath, cleanPath),
            relativePath: cleanPath,
            isDirectory: true,
            extension: '',
          });
        }
      } else {
        // Get file stats
        let size: number | undefined;
        if (fs.existsSync(absolutePath)) {
          try {
            const stats = fs.statSync(absolutePath);
            size = stats.size;
          } catch {
            // Ignore stat errors
          }
        }

        const extension = path.extname(cleanPath).slice(1);
        files.push({
          absolutePath,
          relativePath: cleanPath,
          isDirectory: false,
          size,
          extension,
        });
      }
    }

    // Sort for consistent output
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    directories.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    return { files, directories };
  } catch (error) {
    throw new Error(`Failed to get eligible files: ${error}`);
  }
}

/**
 * Synchronous version of getEligibleFiles
 */
export function getEligibleFilesSync(
  repositoryPath: string,
  options: EligibleFilesOptions = {}
): { files: FileInfo[]; directories: FileInfo[] } {
  const repoPath = normalizeRepositoryPath(repositoryPath);

  // Check if .gitignore exists at root
  const gitignorePath = path.join(repoPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    throw new Error(`No .gitignore file found at repository root: ${gitignorePath}`);
  }

  const patterns = options.patterns || ['**/*'];

  // Create ignore instance for .a24zignore
  const a24zIgnore = createA24zIgnore(repoPath);

  // Build ignore patterns for globby - always exclude .git and .a24z
  const globIgnorePatterns = [
    '.git',
    '**/.git',
    '**/.git/**',
    '.a24z',
    '**/.a24z',
    '**/.a24z/**',
    ...(options.additionalIgnorePatterns || []),
  ];

  try {
    const entries = globbySync(patterns, {
      cwd: repoPath,
      absolute: false,
      onlyFiles: false,
      markDirectories: true,
      gitignore: true,
      ignore: globIgnorePatterns,
      dot: true,
    });

    // Filter entries using .a24zignore patterns (proper gitignore semantics)
    const filteredEntries = entries.filter((entry) => {
      // Remove trailing slash for directories before checking
      const pathToCheck = entry.endsWith('/') ? entry.slice(0, -1) : entry;
      return !a24zIgnore.ignores(pathToCheck);
    });

    const files: FileInfo[] = [];
    const directories: FileInfo[] = [];

    for (const entry of filteredEntries) {
      const relativePath = entry;
      const absolutePath = path.join(repoPath, relativePath);

      const isDirectory = relativePath.endsWith('/');
      const cleanPath = isDirectory ? relativePath.slice(0, -1) : relativePath;

      if (isDirectory) {
        if (options.includeDirectories) {
          directories.push({
            absolutePath: path.join(repoPath, cleanPath),
            relativePath: cleanPath,
            isDirectory: true,
            extension: '',
          });
        }
      } else {
        let size: number | undefined;
        if (fs.existsSync(absolutePath)) {
          try {
            const stats = fs.statSync(absolutePath);
            size = stats.size;
          } catch {
            // Ignore stat errors
          }
        }

        const extension = path.extname(cleanPath).slice(1);
        files.push({
          absolutePath,
          relativePath: cleanPath,
          isDirectory: false,
          size,
          extension,
        });
      }
    }

    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    directories.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    return { files, directories };
  } catch (error) {
    throw new Error(`Failed to get eligible files: ${error}`);
  }
}

/**
 * Get statistics about eligible files
 */
export interface FileStatistics {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  filesByExtension: Record<string, number>;
  largestFiles: Array<{ path: string; size: number }>;
  deepestPath: { path: string; depth: number };
}

export function getFileStatistics(files: FileInfo[], directories: FileInfo[]): FileStatistics {
  const filesByExtension: Record<string, number> = {};
  let totalSize = 0;
  let deepestPath = { path: '', depth: 0 };

  files.forEach((file) => {
    if (file.size) {
      totalSize += file.size;
    }

    const ext = file.extension || 'no-extension';
    filesByExtension[ext] = (filesByExtension[ext] || 0) + 1;

    const depth = file.relativePath.split(path.sep).length;
    if (depth > deepestPath.depth) {
      deepestPath = { path: file.relativePath, depth };
    }
  });

  const largestFiles = [...files]
    .filter((f) => f.size !== undefined)
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .slice(0, 10)
    .map((f) => ({ path: f.relativePath, size: f.size || 0 }));

  return {
    totalFiles: files.length,
    totalDirectories: directories.length,
    totalSize,
    filesByExtension,
    largestFiles,
    deepestPath,
  };
}
