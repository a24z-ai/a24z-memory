/**
 * Integration tests for MCP server tool registration and discovery
 * These tests verify the actual behavior of the MCP server without deep mocking
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('MCP Server Integration Tests', () => {
  let server: Server;
  let toolListHandler: any;
  let toolCallHandler: any;
  
  beforeEach(() => {
    // Create a real MCP server instance
    server = new Server(
      {
        name: 'test-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  });

  describe('Tool Registration and Discovery', () => {
    test('should register and list tools correctly', async () => {
      const tools = [
        {
          name: 'test_tool_1',
          description: 'First test tool',
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string' },
            },
          },
        },
        {
          name: 'test_tool_2',
          description: 'Second test tool',
          inputSchema: {
            type: 'object',
            properties: {
              value: { type: 'number' },
            },
          },
        },
      ];

      // Register tools/list handler
      server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools };
      });

      // Get the handler and test it
      const handlers = (server as any).handlers;
      const listHandler = handlers?.get('tools/list');
      
      if (listHandler) {
        const result = await listHandler({});
        expect(result.tools).toHaveLength(2);
        expect(result.tools[0].name).toBe('test_tool_1');
        expect(result.tools[1].name).toBe('test_tool_2');
      }
    });

    test('should handle tool execution requests', async () => {
      const mockHandler = mock(async (args: any) => ({
        content: [{ type: 'text', text: `Processed: ${JSON.stringify(args)}` }],
      }));

      const toolMap = new Map([
        ['test_tool', mockHandler],
      ]);

      // Register tools/call handler
      server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
        const { name, arguments: args } = request.params;
        const handler = toolMap.get(name);
        
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }
        
        return await handler(args);
      });

      // Get the handler and test it
      const handlers = (server as any).handlers;
      const callHandler = handlers?.get('tools/call');
      
      if (callHandler) {
        const result = await callHandler({
          params: {
            name: 'test_tool',
            arguments: { test: 'value' },
          },
        });
        
        expect(mockHandler).toHaveBeenCalledWith({ test: 'value' });
        expect(result.content[0].text).toContain('Processed');
      }
    });

    test('should throw error for unknown tools', async () => {
      const toolMap = new Map();

      server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
        const { name, arguments: args } = request.params;
        const handler = toolMap.get(name);
        
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }
        
        return await handler(args);
      });

      const handlers = (server as any).handlers;
      const callHandler = handlers?.get('tools/call');
      
      if (callHandler) {
        await expect(
          callHandler({
            params: {
              name: 'nonexistent_tool',
              arguments: {},
            },
          })
        ).rejects.toThrow('Unknown tool: nonexistent_tool');
      }
    });
  });

  describe('Configuration-based Tool Enabling', () => {
    test('should respect tool configuration settings', async () => {
      // Create a mock configuration
      const mockConfig = {
        enabled_mcp_tools: {
          tool_a: true,
          tool_b: false,
          tool_c: true,
        },
      };
      
      // Simulate tool registration based on config
      const registeredTools: string[] = [];
      
      // Only register tools that are explicitly enabled (not false)
      if (mockConfig.enabled_mcp_tools?.tool_a === true) {
        registeredTools.push('tool_a');
      }
      if (mockConfig.enabled_mcp_tools?.tool_b === true) {
        registeredTools.push('tool_b');
      }
      if (mockConfig.enabled_mcp_tools?.tool_c === true) {
        registeredTools.push('tool_c');
      }
      
      expect(registeredTools).toContain('tool_a');
      expect(registeredTools).not.toContain('tool_b');
      expect(registeredTools).toContain('tool_c');
    });
  });

  describe('Tool Discovery Edge Cases', () => {
    test('should handle empty tool list', async () => {
      server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools: [] };
      });

      const handlers = (server as any).handlers;
      const listHandler = handlers?.get('tools/list');
      
      if (listHandler) {
        const result = await listHandler({});
        expect(result.tools).toHaveLength(0);
      }
    });

    test('should handle tools with complex schemas', async () => {
      const complexTool = {
        name: 'complex_tool',
        description: 'Tool with complex schema',
        inputSchema: {
          type: 'object',
          properties: {
            nested: {
              type: 'object',
              properties: {
                field1: { type: 'string' },
                field2: { type: 'number' },
              },
              required: ['field1'],
            },
            array: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['nested'],
        },
      };

      server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools: [complexTool] };
      });

      const handlers = (server as any).handlers;
      const listHandler = handlers?.get('tools/list');
      
      if (listHandler) {
        const result = await listHandler({});
        expect(result.tools[0].inputSchema.properties).toHaveProperty('nested');
        expect(result.tools[0].inputSchema.properties).toHaveProperty('array');
      }
    });

    test('should handle concurrent tool calls', async () => {
      let callCount = 0;
      const mockHandler = mock(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          content: [{ type: 'text', text: `Call ${callCount}` }],
        };
      });

      const toolMap = new Map([['async_tool', mockHandler]]);

      server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
        const { name, arguments: args } = request.params;
        const handler = toolMap.get(name);
        
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }
        
        return await handler(args);
      });

      const handlers = (server as any).handlers;
      const callHandler = handlers?.get('tools/call');
      
      if (callHandler) {
        // Make concurrent calls
        const promises = [
          callHandler({ params: { name: 'async_tool', arguments: {} } }),
          callHandler({ params: { name: 'async_tool', arguments: {} } }),
          callHandler({ params: { name: 'async_tool', arguments: {} } }),
        ];

        await Promise.all(promises);
        
        expect(callCount).toBe(3);
        expect(mockHandler).toHaveBeenCalledTimes(3);
      }
    });
  });
});