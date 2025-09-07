/**
 * Repository utilities for CLI commands
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { MemoryPalace } from '../../MemoryPalace.js';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter.js';

/**
 * Find the git repository root from a given path
 */
export function findRepositoryRoot(startPath: string = process.cwd()): string | null {
  let currentPath = path.resolve(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * Create a MemoryPalace instance for the current repository
 */
export function createMemoryPalace(searchPath?: string): MemoryPalace {
  const repoPath = findRepositoryRoot(searchPath || process.cwd());

  if (!repoPath) {
    throw new Error(
      'Not in a git repository. Please run this command from within a git repository.'
    );
  }

  const fsAdapter = new NodeFileSystemAdapter();
  return new MemoryPalace(repoPath, fsAdapter);
}

/**
 * Get the repository root path, throwing an error if not found
 */
export function getRepositoryRoot(searchPath?: string): string {
  const repoPath = findRepositoryRoot(searchPath || process.cwd());

  if (!repoPath) {
    throw new Error(
      'Not in a git repository. Please run this command from within a git repository.'
    );
  }

  return repoPath;
}
