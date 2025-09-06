import * as fs from 'node:fs';
import * as path from 'node:path';
import ignore from 'ignore';

/**
 * Create an ignore instance from a file (like .gitignore or .a24zignore)
 * @param filePath Path to the ignore file
 * @returns An ignore instance with patterns loaded
 */
export function createIgnoreFromFile(filePath: string): ReturnType<typeof ignore> {
  const ig = ignore();

  if (!fs.existsSync(filePath)) {
    return ig;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    ig.add(content);
    return ig;
  } catch (error) {
    console.error(`Error parsing ignore file ${filePath}:`, error);
    return ig;
  }
}

/**
 * Parse an ignore file and return patterns (for backward compatibility and testing)
 * @param filePath Path to the ignore file
 * @returns Array of ignore patterns
 */
export function parseIgnoreFile(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  } catch (error) {
    console.error(`Error parsing ignore file ${filePath}:`, error);
    return [];
  }
}

/**
 * Load .a24zignore patterns from a repository
 * @param repositoryPath Path to the repository root
 * @returns Array of ignore patterns from .a24zignore
 */
export function loadA24zIgnorePatterns(repositoryPath: string): string[] {
  const a24zIgnorePath = path.join(repositoryPath, '.a24zignore');
  return parseIgnoreFile(a24zIgnorePath);
}

/**
 * Create an ignore instance for .a24zignore from a repository
 * @param repositoryPath Path to the repository root
 * @returns An ignore instance with .a24zignore patterns loaded
 */
export function createA24zIgnore(repositoryPath: string): ReturnType<typeof ignore> {
  const a24zIgnorePath = path.join(repositoryPath, '.a24zignore');
  return createIgnoreFromFile(a24zIgnorePath);
}
