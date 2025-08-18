import type { z } from 'zod';

export interface McpTool<TParams = unknown, TResult = unknown> {
  name: string;
  description?: string;
  schema: z.ZodSchema<TParams>;
  inputSchema?: unknown;
  handler: (params: TParams) => Promise<McpToolResult<TResult>>;
}

export interface McpToolResult<T = unknown> {
  content: Array<{ type: 'text' | 'image' | 'resource'; text?: string; data?: T; mimeType?: string }>;
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
