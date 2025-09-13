/**
 * Standalone a24z Memory MCP server
 * Provides the MCP server functionality and re-exports types from core-library
 */

import { McpServer } from './mcp/server/McpServer';
import type { McpServerConfig } from './mcp/types/mcp-types';
import { BRANDING } from './branding';

export { McpServer } from './mcp/server/McpServer';

// Re-export types from @a24z/core-library for convenience
export type {
  // CodebaseView types
  CodebaseView,
  CodebaseViewCell,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult,
  FileListValidationResult,
  CodebaseViewSummary,
  
  // Repository types
  GithubRepository,
  AlexandriaRepository,
  AlexandriaEntry,
  AlexandriaRepositoryRegistry,
} from '@a24z/core-library';

// Re-export functions from @a24z/core-library
export {
  extractCodebaseViewSummary,
  extractCodebaseViewSummaries,
  CodebaseViewsStore,
  generateViewIdFromName,
} from '@a24z/core-library';

export function run(config?: Partial<McpServerConfig>): Promise<void> {
  const resolved: McpServerConfig = {
    name: BRANDING.MCP_SERVER_NAME,
    version: BRANDING.MCP_VERSION,
    ...config,
  };

  const server = new McpServer(resolved);
  return server.start();
}