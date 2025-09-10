import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Find the line number of a specific property or value in a JSON file
 * @param filePath - Path to the JSON file
 * @param searchTerm - The term to search for (property name or value)
 * @returns Line number (1-indexed) or undefined if not found
 */
export function findLineNumberInJSON(filePath: string, searchTerm: string): number | undefined {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Search for the term in each line
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`"${searchTerm}"`) || lines[i].includes(searchTerm)) {
        return i + 1; // Return 1-indexed line number
      }
    }
  } catch {
    // File doesn't exist or can't be read
    return undefined;
  }

  return undefined;
}

/**
 * Find the line number of a cell definition in a view JSON file
 * @param projectRoot - The project root path
 * @param viewName - Name of the view
 * @param cellName - Name of the cell
 * @returns Line number (1-indexed) or undefined if not found
 */
export function findCellLineNumber(
  projectRoot: string,
  viewName: string,
  cellName: string
): number | undefined {
  const viewPath = join(projectRoot, 'views', `${viewName}.json`);
  return findLineNumberInJSON(viewPath, cellName);
}

/**
 * Find the line number of a file reference in a JSON file
 * @param filePath - Path to the JSON file
 * @param referencedFile - The file being referenced
 * @returns Line number (1-indexed) or undefined if not found
 */
export function findFileReferenceLineNumber(
  filePath: string,
  referencedFile: string
): number | undefined {
  return findLineNumberInJSON(filePath, referencedFile);
}
