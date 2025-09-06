/**
 * Pure filesystem abstraction interfaces
 * 
 * These interfaces define the contract for file system operations without any
 * platform-specific implementations. This allows the pure-core to work with
 * any file system adapter (Node.js, in-memory, browser, Deno, etc.)
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
  isDirectory(path: string): boolean;

  // Path operations (most environments can use these defaults)
  join(...paths: string[]): string;
  relative(from: string, to: string): string;
  dirname(path: string): string;
  isAbsolute(path: string): boolean;
}

// Note: The InMemoryFileSystemAdapter implementation has been moved to 
// tests/test-adapters/InMemoryFileSystemAdapter.ts for better separation
// of test utilities from production code