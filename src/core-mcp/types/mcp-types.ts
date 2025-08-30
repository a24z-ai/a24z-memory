import type { z } from 'zod';

export interface McpTool<TParams = unknown, TResult = unknown> {
  name: string;
  description?: string;
  schema: z.ZodSchema<TParams>;
  inputSchema?: unknown;
  handler: (params: TParams) => Promise<McpToolResult<TResult>>;
}

/**
 * MCP Tool Result type
 *
 * Note: While the MCP spec supports multiple content types (text, image, resource),
 * our implementation currently only uses text content. We've simplified the type
 * to always require the text field when type is 'text' for better type safety.
 *
 * If we need to support other content types in the future, we should change this
 * to a proper discriminated union:
 * content: Array<
 *   | { type: 'text'; text: string }
 *   | { type: 'image'; data: string; mimeType: string }
 *   | { type: 'resource'; resource: any }
 * >
 */
export interface McpToolResult<T = unknown> {
  content: Array<{
    type: 'text'; // Currently we only support text content
    text: string; // Always required for text content
    data?: T; // Optional additional data
  }>;
  isError?: boolean;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: () => Promise<string | Buffer>;
}

export interface McpServerConfig {
  name: string;
  version: string;
}
