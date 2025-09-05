/**
 * Standalone a24z Memory MCP server
 * Re-exports the local server and provides a run() helper.
 */

import { McpServer } from './core-mcp/server/McpServer';
import type { McpServerConfig } from './core-mcp/types/mcp-types';
import { BRANDING } from './branding';

export { McpServer } from './core-mcp/server/McpServer';

// CodebaseView exports for VS Code extension integration
export {
  codebaseViewsStore,
  CodebaseViewsStore,
  generateViewIdFromName,
} from './core-mcp/store/codebaseViewsStore';

export type {
  CodebaseView,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult,
} from './core-mcp/store/codebaseViewsStore';

export function run(config?: Partial<McpServerConfig>): Promise<void> {
  const resolved: McpServerConfig = {
    name: BRANDING.MCP_SERVER_NAME,
    version: BRANDING.MCP_VERSION,
    ...config,
  };

  const server = new McpServer(resolved);
  return server.start();
}

// This check is for when index.js is run directly (not typical for ESM)
// The actual CLI entry point is cli.ts
