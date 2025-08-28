/**
 * Simple filesystem abstraction for a24z-memory
 *
 * This provides just the file operations we actually need,
 * allowing the library to work in different environments.
 */

export interface FileSystemAdapter {
  // File operations
  exists(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
  deleteFile(path: string): void;

  // Directory operations
  createDir(path: string): void;
  readDir(path: string): string[];
  deleteDir(path: string): void;

  // Path operations (most environments can use these defaults)
  join(...paths: string[]): string;
  dirname(path: string): string;
  isAbsolute(path: string): boolean;
  resolve(path: string): string;
  relative(from: string, to: string): string;
}

/**
 * Node.js implementation using built-in fs and path modules
 */
export class NodeFileSystemAdapter implements FileSystemAdapter {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private fs: any, // Node.js fs module type not imported to avoid dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private path: any // Node.js path module type not imported to avoid dependency
  ) {}

  exists(path: string): boolean {
    return this.fs.existsSync(path);
  }

  readFile(path: string): string {
    return this.fs.readFileSync(path, 'utf8');
  }

  writeFile(path: string, content: string): void {
    // Ensure parent directory exists
    const dir = this.dirname(path);
    if (!this.exists(dir)) {
      this.createDir(dir);
    }

    // Write to temp file first, then rename (atomic write)
    const tmp = `${path}.tmp`;
    this.fs.writeFileSync(tmp, content, { encoding: 'utf8' });
    this.fs.renameSync(tmp, path);
  }

  deleteFile(path: string): void {
    if (this.exists(path)) {
      this.fs.unlinkSync(path);
    }
  }

  createDir(path: string): void {
    if (!this.exists(path)) {
      this.fs.mkdirSync(path, { recursive: true });
    }
  }

  readDir(path: string): string[] {
    if (!this.exists(path)) return [];

    const entries = this.fs.readdirSync(path, { withFileTypes: true });
    const result: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        result.push(entry.name);
      } else if (entry.isDirectory()) {
        // Recursively read subdirectories
        const subPath = this.join(path, entry.name);
        const subFiles = this.readDir(subPath);
        result.push(...subFiles.map((f) => this.join(entry.name, f)));
      }
    }

    return result;
  }

  deleteDir(path: string): void {
    if (this.exists(path)) {
      // Only delete if empty
      const files = this.fs.readdirSync(path);
      if (files.length === 0) {
        this.fs.rmdirSync(path);
      }
    }
  }

  join(...paths: string[]): string {
    return this.path.join(...paths);
  }

  dirname(path: string): string {
    return this.path.dirname(path);
  }

  isAbsolute(path: string): boolean {
    return this.path.isAbsolute(path);
  }

  resolve(path: string): string {
    return this.path.resolve(path);
  }

  relative(from: string, to: string): string {
    return this.path.relative(from, to);
  }
}

/**
 * In-memory implementation for testing
 */
export class InMemoryFileSystemAdapter implements FileSystemAdapter {
  private files = new Map<string, string>();

  exists(path: string): boolean {
    return this.files.has(path) || this.isDirectory(path);
  }

  readFile(path: string): string {
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    return this.files.get(path)!;
  }

  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  deleteFile(path: string): void {
    this.files.delete(path);
  }

  createDir(_path: string): void {
    // In memory, directories are implicit
  }

  readDir(path: string): string[] {
    const prefix = path === '/' ? '' : `${path}/`;
    const files: string[] = [];

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const relativePath = filePath.slice(prefix.length);
        if (relativePath && !relativePath.includes('/')) {
          files.push(relativePath);
        }
      }
    }

    return files;
  }

  deleteDir(path: string): void {
    // In memory, just remove all files in the directory
    const prefix = `${path}/`;
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        this.files.delete(filePath);
      }
    }
  }

  join(...paths: string[]): string {
    return paths.join('/').replace(/\/+/g, '/');
  }

  dirname(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash <= 0 ? '/' : path.slice(0, lastSlash);
  }

  isAbsolute(path: string): boolean {
    return path.startsWith('/');
  }

  resolve(path: string): string {
    return this.isAbsolute(path) ? path : `/fake-cwd/${path}`;
  }

  relative(from: string, to: string): string {
    // Simple implementation for testing
    if (to.startsWith(from)) {
      return to.slice(from.length + 1);
    }
    return to;
  }

  private isDirectory(path: string): boolean {
    const prefix = `${path}/`;
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  // Test utilities
  clear(): void {
    this.files.clear();
  }

  getFiles(): Map<string, string> {
    return new Map(this.files);
  }
}

// Factory functions to create adapters
export function createNodeFileSystemAdapter(): FileSystemAdapter {
  const fs = require('node:fs');
  const path = require('node:path');
  return new NodeFileSystemAdapter(fs, path);
}

export function createInMemoryFileSystemAdapter(): FileSystemAdapter {
  return new InMemoryFileSystemAdapter();
}
