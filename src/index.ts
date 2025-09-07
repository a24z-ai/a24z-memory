/**
 * Standalone a24z Memory MCP server
 * Re-exports the local server and provides a run() helper.
 */

import { McpServer } from './mcp/server/McpServer';
import type { McpServerConfig } from './mcp/types/mcp-types';
import { BRANDING } from './branding';

export { McpServer } from './mcp/server/McpServer';

// CodebaseView types (pure)
export type {
  CodebaseView,
  CodebaseViewCell,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
  ViewValidationResult,
  PatternValidationResult,
  FileListValidationResult,
} from './pure-core/types';

// CodebaseView exports for VS Code extension integration
export { CodebaseViewsStore, generateViewIdFromName } from './pure-core/stores/CodebaseViewsStore';

// Export singleton instance for backward compatibility
import { NodeFileSystemAdapter } from './node-adapters/NodeFileSystemAdapter';
import { CodebaseViewsStore as PureCodebaseViewsStore } from './pure-core/stores/CodebaseViewsStore';
export const codebaseViewsStore = new PureCodebaseViewsStore(new NodeFileSystemAdapter());

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
