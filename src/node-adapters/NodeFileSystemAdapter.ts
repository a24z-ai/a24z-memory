/**
 * Node.js implementation of FileSystemAdapter
 *
 * This adapter uses Node.js built-in fs and path modules.
 * It should only be imported in Node.js environments.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { FileSystemAdapter } from '../pure-core/abstractions/filesystem';

/**
 * Node.js implementation using built-in fs and path modules
 */
export class NodeFileSystemAdapter implements FileSystemAdapter {
  constructor() {}

  exists(path: string): boolean {
    return fs.existsSync(path);
  }

  readFile(path: string): string {
    return fs.readFileSync(path, 'utf8');
  }

  writeFile(path: string, content: string): void {
    // Ensure parent directory exists
    const dir = this.dirname(path);
    if (!this.exists(dir)) {
      this.createDir(dir);
    }

    // Write to temp file first, then rename (atomic write)
    const tmp = `${path}.tmp`;
    fs.writeFileSync(tmp, content, { encoding: 'utf8' });
    fs.renameSync(tmp, path);
  }

  deleteFile(path: string): void {
    if (this.exists(path)) {
      fs.unlinkSync(path);
    }
  }

  createDir(path: string): void {
    if (!this.exists(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  }

  readDir(path: string): string[] {
    if (!this.exists(path)) return [];

    try {
      const entries = fs.readdirSync(path, { withFileTypes: true });
      return entries.map((entry) => entry.name);
    } catch {
      return [];
    }
  }

  isDirectory(path: string): boolean {
    if (!this.exists(path)) return false;

    try {
      return fs.statSync(path).isDirectory();
    } catch {
      return false;
    }
  }

  deleteDir(path: string): void {
    if (this.exists(path)) {
      // Only delete if empty
      const files = fs.readdirSync(path);
      if (files.length === 0) {
        fs.rmdirSync(path);
      }
    }
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  dirname(pathString: string): string {
    return path.dirname(pathString);
  }

  relative(from: string, to: string): string {
    return path.relative(from, to);
  }

  isAbsolute(pathString: string): boolean {
    return path.isAbsolute(pathString);
  }

  // Repository operations
  normalizeRepositoryPath(inputPath: string): string {
    return normalizeRepositoryPath(inputPath);
  }

  findProjectRoot(inputPath: string): string {
    return this.normalizeRepositoryPath(inputPath);
  }

  getRepositoryName(repositoryPath: string): string {
    const segments = repositoryPath.split(path.sep).filter((s) => s);
    return segments[segments.length - 1] || 'root';
  }
}

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
 * Normalize a repository path by finding the git root or project root
 */
export function normalizeRepositoryPath(inputPath: string): string {
  // 1. Try to find git root from the input path
  const gitRoot = findGitRoot(inputPath);
  if (!gitRoot) {
    throw Error('Unable to find Git Root For Path' + inputPath);
  }
  return gitRoot;
}
