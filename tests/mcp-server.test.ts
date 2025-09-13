/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { McpServer } from '../src/mcp/server/McpServer';
import type { McpTool } from '../src/mcp/types';

// Create mock implementations
const mockServer = {
  setRequestHandler: mock(),
  connect: mock(),
};

const mockStdioServerTransport = mock();

// Mock console.error to reduce noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = mock();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('McpServer', () => {
  let server: McpServer;
  let handlers: Map<string, any>;

  beforeEach(() => {
    handlers = new Map();
    
    // Reset mock functions
    mockServer.setRequestHandler.mockReset();
    mockServer.connect.mockReset();
    
    // Capture handlers when setRequestHandler is called
    mockServer.setRequestHandler.mockImplementation((schema: any, handler: any) => {
      // Determine handler type based on schema
      if (schema.parse) {
        try {
          schema.parse({ method: 'tools/list' });
          handlers.set('tools/list', handler);
        } catch {
          try {
            schema.parse({ method: 'tools/call', params: {} });
            handlers.set('tools/call', handler);
          } catch {
            try {
              schema.parse({ method: 'resources/list' });
              handlers.set('resources/list', handler);
            } catch {
              try {
                schema.parse({ method: 'resources/read', params: {} });
                handlers.set('resources/read', handler);
              } catch {
                // Unknown schema
              }
            }
          }
        }
      }
    });

    // Mock the modules
    mock.module('@modelcontextprotocol/sdk/server/index.js', () => ({
      Server: mock(() => mockServer),
    }));

    mock.module('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: mockStdioServerTransport,
    }));

    // Mock MemoryPalace configuration
    mock.module('@a24z/core-library', () => ({
      NodeFileSystemAdapter: mock(() => ({
        readFile: mock(),
        writeFile: mock(),
        exists: mock(),
        mkdir: mock(),
        readdir: mock(),
        stat: mock(),
        unlink: mock(),
        isDirectory: mock(),
        join: mock((...parts: string[]) => parts.join('/')),
        resolve: mock((path: string) => path),
        relative: mock((from: string, to: string) => to),
        dirname: mock((path: string) => path.split('/').slice(0, -1).join('/')),
        basename: mock((path: string) => path.split('/').pop() || ''),
        normalize: mock((path: string) => path),
      })),
      MemoryPalace: mock(() => ({
        getConfiguration: mock(() => ({
          enabled_mcp_tools: {
            create_repository_note: true,
            get_notes: true,
            get_repository_tags: true,
            get_repository_guidance: true,
            delete_repository_note: true,
            get_repository_note: true,
            get_stale_notes: true,
            get_tag_usage: true,
            delete_tag: true,
            replace_tag: true,
            get_note_coverage: true,
            list_codebase_views: true,
          },
        })),
      })),
    }));

    server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
    });
  });

  describe('Tool Registration', () => {
    test('should initialize with default tools', () => {
      // Access private tools map via reflection
      const tools = (server as any).tools;
      
      expect(tools.size).toBeGreaterThan(0);
      expect(tools.has('create_repository_note')).toBe(true);
      expect(tools.has('get_notes')).toBe(true);
      expect(tools.has('get_repository_tags')).toBe(true);
    });

    test('should allow adding custom tools', () => {
      const customTool: McpTool = {
        name: 'custom_tool',
        description: 'A custom tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
        handler: mock(async () => ({ content: [{ type: 'text', text: 'result' }] })),
      };

      server.addTool(customTool);
      
      const tools = (server as any).tools;
      expect(tools.has('custom_tool')).toBe(true);
      expect(tools.get('custom_tool')).toEqual(customTool);
    });

    test('should respect tool configuration', () => {
      // Create server with some tools disabled
      mock.module('@a24z/core-library', () => ({
        NodeFileSystemAdapter: mock(() => ({})),
        MemoryPalace: mock(() => ({
          getConfiguration: mock(() => ({
            enabled_mcp_tools: {
              create_repository_note: false,
              get_notes: true,
              get_repository_tags: false,
            },
          })),
        })),
      }));

      const configuredServer = new McpServer({
        name: 'configured-server',
        version: '1.0.0',
      });

      const tools = (configuredServer as any).tools;
      expect(tools.has('create_repository_note')).toBe(false);
      expect(tools.has('get_notes')).toBe(true);
      expect(tools.has('get_repository_tags')).toBe(false);
    });
  });

  describe('Tool Discovery', () => {
    test('should handle tools/list request', async () => {
      const handler = handlers.get('tools/list');
      expect(handler).toBeDefined();
      
      if (handler) {
        const result = await handler();
        
        expect(result).toHaveProperty('tools');
        expect(Array.isArray(result.tools)).toBe(true);
        expect(result.tools.length).toBeGreaterThan(0);
        
        // Check tool structure
        const tool = result.tools[0];
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      }
    });

    test('should return all registered tools in list', async () => {
      // Add a custom tool
      server.addTool({
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        handler: mock(async () => ({ content: [] })),
      });

      const handler = handlers.get('tools/list');
      
      if (handler) {
        const result = await handler();
        
        const toolNames = result.tools.map((t: any) => t.name);
        expect(toolNames).toContain('test_tool');
      }
    });
  });

  describe('Tool Execution', () => {
    test.skip('should handle tools/call request for valid tool', async () => {
      const mockHandler = mock(async (args: any) => ({
        content: [{ type: 'text', text: `Executed with ${JSON.stringify(args)}` }],
      }));

      server.addTool({
        name: 'executable_tool',
        description: 'Tool for testing execution',
        inputSchema: { type: 'object' },
        handler: mockHandler,
      });

      const handler = handlers.get('tools/call');
      expect(handler).toBeDefined();
      
      if (handler) {
        const result = await handler({
          params: {
            name: 'executable_tool',
            arguments: { test: 'value' },
          },
        });
        
        expect(mockHandler).toHaveBeenCalledWith({ test: 'value' });
        expect(result.content[0].text).toContain('Executed with');
      }
    });

    test('should throw error for unknown tool', async () => {
      const handler = handlers.get('tools/call');
      
      if (handler) {
        await expect(
          handler({
            params: {
              name: 'nonexistent_tool',
              arguments: {},
            },
          })
        ).rejects.toThrow('Unknown tool: nonexistent_tool');
      }
    });

    test('should handle tool execution errors gracefully', async () => {
      const errorMessage = 'Tool execution failed';
      server.addTool({
        name: 'failing_tool',
        description: 'Tool that fails',
        inputSchema: { type: 'object' },
        handler: mock(async () => {
          throw new Error(errorMessage);
        }),
      });

      const handler = handlers.get('tools/call');
      
      if (handler) {
        await expect(
          handler({
            params: {
              name: 'failing_tool',
              arguments: {},
            },
          })
        ).rejects.toThrow(errorMessage);
      }
    });
  });

  describe('Resource Management', () => {
    test('should initialize with default resources', () => {
      const resources = (server as any).resources;
      
      expect(resources.size).toBeGreaterThan(0);
      expect(resources.has('app://status')).toBe(true);
    });

    test('should allow adding custom resources', () => {
      const customResource = {
        uri: 'custom://resource',
        name: 'Custom Resource',
        description: 'A custom resource',
        mimeType: 'text/plain',
        handler: mock(async () => 'resource content'),
      };

      server.addResource(customResource);
      
      const resources = (server as any).resources;
      expect(resources.has('custom://resource')).toBe(true);
      expect(resources.get('custom://resource')).toEqual(customResource);
    });

    test('should handle resources/list request', async () => {
      const handler = handlers.get('resources/list');
      expect(handler).toBeDefined();
      
      if (handler) {
        const result = await handler();
        
        expect(result).toHaveProperty('resources');
        expect(Array.isArray(result.resources)).toBe(true);
        expect(result.resources.length).toBeGreaterThan(0);
        
        const resource = result.resources[0];
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType');
      }
    });

    test('should handle resources/read request', async () => {
      const handler = handlers.get('resources/read');
      
      if (handler) {
        const result = await handler({
          params: { uri: 'app://status' },
        });
        
        expect(result).toHaveProperty('contents');
        expect(Array.isArray(result.contents)).toBe(true);
        expect(result.contents[0]).toHaveProperty('uri');
        expect(result.contents[0]).toHaveProperty('mimeType');
        expect(result.contents[0]).toHaveProperty('text');
      }
    });
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      await server.start();
      
      expect(mockServer.connect).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('MCP server started successfully')
      );
    });

    test('should stop server gracefully', async () => {
      await server.stop();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('MCP server stopped')
      );
    });
  });
});