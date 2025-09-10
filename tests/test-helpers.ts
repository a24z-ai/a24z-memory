/**
 * Test helper functions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Create basic .alexandria directory structure for testing
 */
export function createTestRepositoryStructure(repositoryPath: string): void {
  // Create the .alexandria directory structure
  const alexandriaDir = path.join(repositoryPath, '.alexandria');
  fs.mkdirSync(alexandriaDir, { recursive: true });

  // Create a basic note-guidance.md file
  const guidanceContent = `# Repository Guidance

This is test guidance for ${repositoryPath}.

## Note Guidelines
- Create clear, actionable notes
- Use appropriate tags and types
- Include relevant anchors

This guidance was created for testing purposes.`;

  fs.writeFileSync(path.join(alexandriaDir, 'note-guidance.md'), guidanceContent);
}

/**
 * Create a default test view for testing
 */
export function createTestView(repositoryPath: string, viewId: string = 'test-view'): void {
  const viewsDir = path.join(repositoryPath, '.alexandria', 'views');
  fs.mkdirSync(viewsDir, { recursive: true });

  const testView = {
    id: viewId,
    version: '1.0.0',
    name: 'Test View',
    description: 'Default view for testing',
    rows: 2,
    cols: 2,
    cells: {
      main: {
        files: ['src/index.ts', 'README.md'],
        coordinates: [0, 0] as [number, number],
        priority: 0,
      },
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(viewsDir, `${viewId}.json`), JSON.stringify(testView, null, 2));
}
