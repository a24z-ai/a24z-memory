import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Find the git root directory starting from a given path
 */
export function findGitRoot(startPath: string): string | null {
  let current = path.resolve(startPath);
  
  // Handle file paths by starting from the directory
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }
  
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

/**
 * Find the project root directory by looking for common project files
 */
export function findProjectRoot(startPath: string): string | null {
  let current = path.resolve(startPath);
  
  // Handle file paths by starting from the directory
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }
  
  const projectFiles = [
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'pom.xml',
    'build.gradle',
    'composer.json',
    'Gemfile',
    'requirements.txt',
    'setup.py'
  ];
  
  while (current !== path.dirname(current)) {
    for (const projectFile of projectFiles) {
      if (fs.existsSync(path.join(current, projectFile))) {
        return current;
      }
    }
    current = path.dirname(current);
  }
  return null;
}

/**
 * Normalize a repository path by finding the git root or project root
 */
export function normalizeRepositoryPath(inputPath: string): string {
  // 1. Try to find git root from the input path
  const gitRoot = findGitRoot(inputPath);
  if (gitRoot) {
    return gitRoot;
  }
  
  // 2. If no git root, use the deepest "project-like" directory
  const projectRoot = findProjectRoot(inputPath);
  if (projectRoot) {
    return projectRoot;
  }
  
  // 3. Fallback: use the provided path as-is (resolved)
  return path.resolve(inputPath);
}

/**
 * Get repository name from a normalized path
 */
export function getRepositoryName(repositoryPath: string): string {
  return path.basename(repositoryPath);
} 