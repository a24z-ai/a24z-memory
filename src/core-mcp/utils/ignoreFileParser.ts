import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Parse an ignore file (like .gitignore or .a24zignore) and return patterns
 * @param filePath Path to the ignore file
 * @returns Array of ignore patterns
 */
export function parseIgnoreFile(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const patterns: string[] = [];

    // Split by lines and process each line
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      // Trim whitespace
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Add the pattern
      patterns.push(trimmed);

      // If it's a directory pattern (ends with /), also add patterns for its contents
      if (trimmed.endsWith('/')) {
        // Add pattern to match all files in the directory
        patterns.push(`${trimmed}**`);
        patterns.push(`${trimmed}*`);

        // If it doesn't start with /, add recursive version
        if (!trimmed.startsWith('/')) {
          patterns.push(`**/${trimmed}**`);
          patterns.push(`**/${trimmed}*`);
        }
      } else {
        // For glob patterns and other patterns
        if (!trimmed.startsWith('/') && !trimmed.startsWith('**/')) {
          // Add recursive version for patterns that don't start with /
          patterns.push(`**/${trimmed}`);

          // For non-glob patterns that look like directories, also match contents
          if (!trimmed.includes('*') && !trimmed.includes('.')) {
            patterns.push(`${trimmed}/**`);
            patterns.push(`**/${trimmed}/**`);
          }
        }
      }
    }

    return patterns;
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
