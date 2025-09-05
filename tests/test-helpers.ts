/**
 * Test helper functions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GuidanceTokenManager } from '../src/core-mcp/services/guidance-token-manager';
import { generateFullGuidanceContent } from '../src/core-mcp/utils/guidanceGenerator';

/**
 * Create a test guidance token for a repository
 */
export function createTestGuidanceToken(repositoryPath: string): string {
  const tokenManager = new GuidanceTokenManager();

  // Create the .a24z directory structure
  const a24zDir = path.join(repositoryPath, '.a24z');
  fs.mkdirSync(a24zDir, { recursive: true });

  // Create a basic note-guidance.md file
  const guidanceContent = `# Repository Guidance

This is test guidance for ${repositoryPath}.

## Note Guidelines
- Create clear, actionable notes
- Use appropriate tags and types
- Include relevant anchors

This token was generated for testing purposes.`;

  fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), guidanceContent);

  // Generate the full guidance content (same as GetRepositoryGuidanceTool)
  const fullContent = generateFullGuidanceContent(repositoryPath);

  // Generate and return the token based on the full content
  return tokenManager.generateToken(fullContent, repositoryPath);
}

/**
 * Add a guidance token to note creation input
 */
export function withGuidanceToken<T extends { directoryPath: string }>(
  input: T
): T & { guidanceToken: string } {
  return {
    ...input,
    guidanceToken: createTestGuidanceToken(input.directoryPath),
  };
}

/**
 * Create a default test view for testing
 */
export function createTestView(repositoryPath: string, viewId: string = 'test-view'): void {
  const viewsDir = path.join(repositoryPath, '.a24z', 'views');
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
        patterns: ['**/*'],
        coordinates: [0, 0] as [number, number],
        priority: 0,
      },
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(viewsDir, `${viewId}.json`), JSON.stringify(testView, null, 2));
}
