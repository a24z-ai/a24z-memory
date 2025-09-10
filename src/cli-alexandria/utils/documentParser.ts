/**
 * Document Parser - Extract codebase structure from documentation files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CodebaseViewFileCell } from '../../pure-core/types/index.js';

export interface ExtractedStructure {
  name: string;
  description: string;
  cells: Record<string, CodebaseViewFileCell>;
  rows?: number;
  cols?: number;
}

/**
 * Extract codebase structure from a markdown documentation file
 * @param content - The markdown content
 * @param repositoryPath - The repository root path for validating file existence
 */
export function extractStructureFromMarkdown(
  content: string,
  repositoryPath?: string
): ExtractedStructure {
  const lines = content.split('\n');
  const cells: Record<string, CodebaseViewFileCell> = {};

  // Extract title and description
  let name = 'Codebase View';
  let description = '';
  let inDescription = false;
  let currentSection = '';
  let currentFiles: string[] = [];
  let sectionIndex = 0;
  let maxRow = 0;
  let maxCol = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Extract title from first heading
    if (line.startsWith('# ') && name === 'Codebase View') {
      name = line.substring(2).trim();
      inDescription = true;
      continue;
    }

    // Extract description (first paragraph after title)
    if (inDescription && line && !line.startsWith('#')) {
      if (description) description += ' ';
      description += line;
    } else if (inDescription && (line.startsWith('#') || line === '')) {
      inDescription = false;
    }

    // Look for section headings that might describe components/modules
    if (line.startsWith('## ') || line.startsWith('### ')) {
      // Save previous section if it has files
      if (currentSection && currentFiles.length > 0) {
        const row = Math.floor(sectionIndex / 3);
        const col = sectionIndex % 3;
        maxRow = Math.max(maxRow, row);
        maxCol = Math.max(maxCol, col);

        cells[currentSection] = {
          coordinates: [row, col],
          files: currentFiles,
          priority: 0,
        };
        sectionIndex++;
      }

      currentSection = line.replace(/^#+\s*/, '').trim();
      currentFiles = [];
      continue;
    }

    // Look for file references in various formats
    // Match patterns like:
    // - `src/index.ts`
    // - **src/utils/helper.js**
    // - [Link text](path/to/file.ts)
    // - src/components/Button.tsx
    const filePatterns = [
      /`([^`]+\.(ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|md|txt|css|scss|html))`/gi,
      /\*\*([^*]+\.(ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|md|txt|css|scss|html))\*\*/gi,
      /\[([^\]]+)\]\(([^)]+\.(ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|md|txt|css|scss|html))\)/gi,
      /(?:^|\s)([a-zA-Z0-9_\-/.]+\.(ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|md|txt|css|scss|html))(?:\s|$)/gi,
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        // For markdown links, the file path is in the second capture group
        const filePath = match[2] || match[1];
        if (filePath && !filePath.startsWith('http') && !filePath.startsWith('//')) {
          const cleanPath = filePath.trim();

          // If repository path is provided, validate file existence
          if (repositoryPath) {
            const fullPath = path.join(repositoryPath, cleanPath);
            if (!fs.existsSync(fullPath)) {
              // Skip files that don't exist
              continue;
            }
          }

          // Don't add duplicates
          if (!currentFiles.includes(cleanPath)) {
            currentFiles.push(cleanPath);
          }
        }
      }
    }
  }

  // Save the last section if it has files
  if (currentSection && currentFiles.length > 0) {
    const row = Math.floor(sectionIndex / 3);
    const col = sectionIndex % 3;
    maxRow = Math.max(maxRow, row);
    maxCol = Math.max(maxCol, col);

    cells[currentSection] = {
      coordinates: [row, col],
      files: currentFiles,
      priority: 0,
    };
  }

  // Calculate grid dimensions only if we have cells
  const rows = Object.keys(cells).length > 0 ? maxRow + 1 : 1;
  const cols = Object.keys(cells).length > 0 ? Math.min(maxCol + 1, 3) : 1;

  return {
    name: name || 'Codebase View',
    description: description || 'Codebase view extracted from documentation',
    cells,
    rows,
    cols,
  };
}
