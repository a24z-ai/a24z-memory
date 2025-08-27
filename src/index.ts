#!/usr/bin/env node

/**
 * Standalone a24z Memory MCP server
 * Re-exports the local server and provides a run() helper.
 */

import { McpServer } from './core-mcp/server/McpServer';
import type { McpServerConfig } from './core-mcp/types/mcp-types';
import { BRANDING } from './branding';

export { McpServer } from './core-mcp/server/McpServer';

export function run(config?: Partial<McpServerConfig>): Promise<void> {
  const resolved: McpServerConfig = {
    name: BRANDING.MCP_SERVER_NAME,
    version: BRANDING.MCP_VERSION,
    ...config,
  };

  const server = new McpServer(resolved);
  return server.start();
}

if (require.main === module) {
  run().catch((err: unknown) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
  });
}
