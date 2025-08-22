/**
 * File reading utilities with size limits for LLM context
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FileContent {
  path: string;
  content: string;
  size: number;
  truncated: boolean;
  error?: string;
}

export interface FileReadOptions {
  maxFileSize?: number;  // Max bytes per file (default: 10KB)
  maxTotalSize?: number; // Max total bytes across all files (default: 50KB)
  maxFiles?: number;     // Max number of files to read (default: 5)
  includeExtensions?: string[]; // File extensions to include (default: common code files)
  excludePatterns?: RegExp[]; // Patterns to exclude (e.g., /node_modules/)
}

const DEFAULT_OPTIONS: FileReadOptions = {
  maxFileSize: 10 * 1024,    // 10KB per file
  maxTotalSize: 50 * 1024,   // 50KB total
  maxFiles: 5,
  includeExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.cs', '.rb', '.php', '.swift', '.kt', '.scala', '.clj', '.ex', '.md', '.json', '.yaml', '.yml', '.toml', '.xml', '.html', '.css', '.scss', '.sql'],
  excludePatterns: [/node_modules/, /\.git/, /dist/, /build/, /coverage/, /\.next/, /\.nuxt/, /vendor/, /target/]
};

/**
 * Read file contents for anchor paths with size limits
 */
export async function readAnchorFiles(
  anchors: string[],
  repositoryPath: string,
  options: FileReadOptions = {}
): Promise<FileContent[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: FileContent[] = [];
  let totalSize = 0;
  let filesRead = 0;

  for (const anchor of anchors) {
    // Check if we've hit limits
    if (filesRead >= opts.maxFiles!) {
      break;
    }
    if (totalSize >= opts.maxTotalSize!) {
      break;
    }

    // Resolve the anchor path
    const fullPath = path.isAbsolute(anchor) 
      ? anchor 
      : path.join(repositoryPath, anchor);

    // Check if file should be excluded
    const shouldExclude = opts.excludePatterns?.some(pattern => pattern.test(fullPath));
    if (shouldExclude) {
      continue;
    }

    // Check file extension
    const ext = path.extname(fullPath).toLowerCase();
    if (opts.includeExtensions && !opts.includeExtensions.includes(ext)) {
      // Skip files with unsupported extensions
      continue;
    }

    try {
      // Check if path exists and is a file
      if (!fs.existsSync(fullPath)) {
        results.push({
          path: anchor,
          content: '',
          size: 0,
          truncated: false,
          error: 'File not found'
        });
        continue;
      }

      const stats = fs.statSync(fullPath);
      
      // If it's a directory, skip it
      if (stats.isDirectory()) {
        results.push({
          path: anchor,
          content: '',
          size: 0,
          truncated: false,
          error: 'Path is a directory'
        });
        continue;
      }

      // Check file size
      if (stats.size > opts.maxFileSize!) {
        // Read only up to maxFileSize
        const buffer = Buffer.alloc(opts.maxFileSize!);
        const fd = fs.openSync(fullPath, 'r');
        const bytesRead = fs.readSync(fd, buffer, 0, opts.maxFileSize!, 0);
        fs.closeSync(fd);
        
        const content = buffer.toString('utf8', 0, bytesRead);
        results.push({
          path: anchor,
          content,
          size: bytesRead,
          truncated: true
        });
        
        totalSize += bytesRead;
        filesRead++;
      } else {
        // Read entire file
        const content = fs.readFileSync(fullPath, 'utf8');
        results.push({
          path: anchor,
          content,
          size: stats.size,
          truncated: false
        });
        
        totalSize += stats.size;
        filesRead++;
      }
    } catch (error) {
      results.push({
        path: anchor,
        content: '',
        size: 0,
        truncated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * Extract relevant code snippets around specific patterns
 */
export function extractRelevantSnippets(
  content: string,
  patterns: string[],
  contextLines: number = 5
): string[] {
  const lines = content.split('\n');
  const snippets: string[] = [];
  const addedRanges = new Set<string>();

  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'gi');
    
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        const start = Math.max(0, i - contextLines);
        const end = Math.min(lines.length - 1, i + contextLines);
        const rangeKey = `${start}-${end}`;
        
        // Avoid duplicate snippets
        if (!addedRanges.has(rangeKey)) {
          const snippet = lines.slice(start, end + 1).join('\n');
          snippets.push(snippet);
          addedRanges.add(rangeKey);
        }
      }
    }
  }

  return snippets;
}

/**
 * Calculate optimal file content to include based on token budget
 */
export function selectOptimalContent(
  files: FileContent[],
  maxTokens: number = 2000,
  tokensPerChar: number = 0.25 // Rough estimate: 1 token ≈ 4 characters
): FileContent[] {
  const maxChars = maxTokens / tokensPerChar;
  const selected: FileContent[] = [];
  let totalChars = 0;

  // Sort by importance (non-truncated first, then by size)
  const sorted = [...files].sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    if (a.truncated && !b.truncated) return 1;
    if (!a.truncated && b.truncated) return -1;
    return a.size - b.size;
  });

  for (const file of sorted) {
    if (totalChars + file.content.length <= maxChars) {
      selected.push(file);
      totalChars += file.content.length;
    } else {
      // Include partial content if there's room
      const remainingChars = maxChars - totalChars;
      if (remainingChars > 100) { // Only include if meaningful amount
        selected.push({
          ...file,
          content: file.content.substring(0, remainingChars),
          truncated: true
        });
      }
      break;
    }
  }

  return selected;
}