/**
 * MCP Server Integration Tests
 *
 * These tests validate the MCP server's protocol compliance, startup behavior,
 * and tool functionality through proper MCP client-server communication.
 *
 * This is the kind of integration test that should run before publication
 * to ensure the MCP server works correctly with MCP clients.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* global clearTimeout */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// MCP protocol message types
interface McpRequest {
  jsonrpc: '2.0';
  method: string;
  params?: object;
  id: number;
}

interface McpResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: number;
}

describe('MCP Server Integration', () => {
  const TIMEOUT = 15000;
  let testRepo: string;

  beforeAll(() => {
    // Create a temporary repository for testing
    testRepo = path.join(os.tmpdir(), `mcp-integration-test-${Date.now()}`);
    fs.mkdirSync(testRepo, { recursive: true });

    // Create git directory
    fs.mkdirSync(path.join(testRepo, '.git'), { recursive: true });
    fs.writeFileSync(
      path.join(testRepo, '.git', 'config'),
      '[core]\nrepositoryformatversion = 0\n'
    );

    // Create default test view
    const viewsDir = path.join(testRepo, '.a24z', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    const testView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'Default view for integration testing',
      rows: 2,
      cols: 2,
      cells: {
        main: {
          files: ['src/index.ts', 'README.md'],
          coordinates: [0, 0],
          priority: 0,
        },
      },
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(viewsDir, 'test-view.json'), JSON.stringify(testView, null, 2));

    // Create package.json
    fs.writeFileSync(
      path.join(testRepo, 'package.json'),
      JSON.stringify({
        name: 'mcp-integration-test',
        version: '1.0.0',
      })
    );
  });

  afterAll(() => {
    // Clean up test repository
    if (fs.existsSync(testRepo)) {
      fs.rmSync(testRepo, { recursive: true, force: true });
    }
  });

  describe('Server Startup and Protocol Compliance', () => {
    it('should start successfully and respond to MCP initialization', async () => {
      const result = await testServerStartup();
      expect(result.success).toBe(true);
      expect(result.initialized).toBe(true);
    });

    it(
      'should implement required MCP methods',
      async () => {
        const server = await startMcpServer();

        try {
          // Test tools/list
          const toolsResponse = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 2,
          });

          expect(toolsResponse.result).toBeDefined();
          expect((toolsResponse.result as any).tools).toBeInstanceOf(Array);

          // Test resources/list
          const resourcesResponse = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'resources/list',
            id: 3,
          });

          expect(resourcesResponse.result).toBeDefined();
          expect((resourcesResponse.result as any).resources).toBeInstanceOf(Array);
        } finally {
          server.kill();
        }
      },
      TIMEOUT
    );
  });

  describe('Tool Discovery and Execution', () => {
    it(
      'should expose expected a24z-Memory tools',
      async () => {
        const server = await startMcpServer();

        try {
          const response = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 1,
          });

          const tools = (response.result as any).tools;
          const toolNames = tools.map((t: any) => t.name);

          // Verify ALL tools are available
          const expectedTools = [
            'create_repository_note',
            'get_notes',
            'get_repository_tags',
            'get_repository_guidance',
            'delete_repository_note',
            'get_repository_note',
            'get_stale_notes',
            'get_tag_usage',
            'delete_tag',
            'replace_tag',
            'get_note_coverage',
            'list_codebase_views',
          ];

          for (const tool of expectedTools) {
            expect(toolNames).toContain(tool);
          }

          // Verify we have exactly the expected number of tools
          expect(toolNames.length).toBe(expectedTools.length);
        } finally {
          server.kill();
        }
      },
      TIMEOUT
    );

    it(
      'should execute tool calls successfully',
      async () => {
        const server = await startMcpServer(testRepo);

        try {
          // Test get_repository_guidance tool
          const guidanceResponse = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'get_repository_guidance',
              arguments: {
                path: testRepo,
              },
            },
            id: 1,
          });

          expect(guidanceResponse.error).toBeUndefined();
          expect(guidanceResponse.result).toBeDefined();

          const guidanceResult = guidanceResponse.result as any;
          expect(guidanceResult.content).toBeInstanceOf(Array);
          expect(guidanceResult.content[0]).toHaveProperty('text');
          // Guidance tokens no longer exist

          // Test get_repository_tags
          const tagsResponse = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'get_repository_tags',
              arguments: {
                path: testRepo,
              },
            },
            id: 2,
          });

          expect(tagsResponse.error).toBeUndefined();
          const tagsResult = JSON.parse((tagsResponse.result as any).content[0].text);
          expect(tagsResult).toHaveProperty('usedTags');
          expect(tagsResult).toHaveProperty('tagRestrictions');
        } finally {
          server.kill();
        }
      },
      TIMEOUT
    );
  });

  describe('End-to-End Workflow', () => {
    it(
      'should complete create-note → retrieve-notes workflow',
      async () => {
        const server = await startMcpServer();

        try {
          // Use the test repository for testing instead of project directory
          // testRepo is already set up in beforeAll() with a proper .git directory
          const projectDir = testRepo;

          // No guidance token needed for current implementation

          // Create a note
          const createResponse = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'create_repository_note',
              arguments: {
                note: 'Integration test note from MCP server - this will be cleaned up',
                directoryPath: projectDir,
                anchors: ['tests'],
                tags: ['integration', 'mcp-test', 'temp'],
              },
            },
            id: 2,
          });

          expect(createResponse.error).toBeUndefined();
          expect((createResponse.result as any).content[0].text).toContain('saved successfully');

          // Retrieve the note
          const getResponse = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'get_notes',
              arguments: {
                path: projectDir,
                limit: 10,
                filterTags: ['mcp-test'],
              },
            },
            id: 3,
          });

          expect(getResponse.error).toBeUndefined();
          const getResult = (getResponse.result as any).content[0].text;

          // Check if it's an error message
          if (getResult.includes('❌') || getResult.includes('**Error')) {
            throw new Error(`Get notes failed: ${getResult}`);
          }

          const notes = JSON.parse(getResult);
          expect(notes.pagination.total).toBeGreaterThanOrEqual(1);

          // Find our test note
          const testNote = notes.notes.find((n: any) =>
            n.note.includes('Integration test note from MCP server')
          );
          expect(testNote).toBeDefined();
        } finally {
          server.kill();
        }
      },
      TIMEOUT
    );
  });

  describe('Error Handling', () => {
    it(
      'should handle invalid tool calls gracefully',
      async () => {
        const server = await startMcpServer();

        try {
          const response = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'nonexistent_tool',
              arguments: {},
            },
            id: 1,
          });

          expect(response.error).toBeDefined();
          expect(response.error!.message).toContain('Unknown tool');
        } finally {
          server.kill();
        }
      },
      TIMEOUT
    );

    it(
      'should handle malformed requests gracefully',
      async () => {
        const server = await startMcpServer();

        try {
          const response = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'invalid/method',
            id: 1,
          });

          expect(response.error).toBeDefined();
        } finally {
          server.kill();
        }
      },
      TIMEOUT
    );
  });

  describe('Resource Management', () => {
    it(
      'should provide application status resource',
      async () => {
        const server = await startMcpServer();

        try {
          // List resources
          const listResponse = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'resources/list',
            id: 1,
          });

          const resources = (listResponse.result as any).resources;
          const statusResource = resources.find((r: any) => r.uri === 'app://status');
          expect(statusResource).toBeDefined();

          // Read status resource
          const readResponse = await sendMcpRequest(server, {
            jsonrpc: '2.0',
            method: 'resources/read',
            params: {
              uri: 'app://status',
            },
            id: 2,
          });

          expect(readResponse.error).toBeUndefined();
          const contents = (readResponse.result as any).contents;
          expect(contents).toHaveLength(1);

          const status = JSON.parse(contents[0].text);
          expect(status).toHaveProperty('status', 'running');
          expect(status).toHaveProperty('uptime');
          expect(status).toHaveProperty('memoryUsage');
        } finally {
          server.kill();
        }
      },
      TIMEOUT
    );
  });

  // Helper functions
  async function testServerStartup(): Promise<{ success: boolean; initialized: boolean }> {
    return new Promise((resolve, reject) => {
      const server = spawn('node', [path.join(process.cwd(), 'dist/cli.js'), 'start'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
        cwd: testRepo, // Run from test repository to avoid creating .a24z in project directory
      });

      let output = '';
      let initialized = false;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          server.kill();
          resolve({ success: false, initialized });
        }
      }, TIMEOUT);

      const initMessage =
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '0.1.0',
            capabilities: {},
            clientInfo: {
              name: 'integration-test',
              version: '1.0.0',
            },
          },
          id: 1,
        }) + '\n';

      server.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('"jsonrpc"') && output.includes('"result"')) {
          initialized = true;
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            server.kill();
            resolve({ success: true, initialized });
          }
        }
      });

      server.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (errorOutput.toLowerCase().includes('error') && !errorOutput.includes('✅')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            server.kill();
            reject(new Error(`Server error: ${errorOutput}`));
          }
        }
      });

      server.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Send initialization
      setTimeout(() => {
        try {
          server.stdin?.write(initMessage);
        } catch {
          // Ignore write errors
        }
      }, 500);
    });
  }

  async function startMcpServer(_testRepoPath?: string): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const server = spawn('node', [path.join(process.cwd(), 'dist/cli.js'), 'start'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
        cwd: testRepo, // Run from test repository to avoid creating .a24z in project directory
      });

      let initialized = false;
      const timeout = setTimeout(() => {
        if (!initialized) {
          server.kill();
          reject(new Error('Server failed to initialize'));
        }
      }, TIMEOUT);

      const initMessage =
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '0.1.0',
            capabilities: {},
            clientInfo: {
              name: 'integration-test',
              version: '1.0.0',
            },
          },
          id: 0,
        }) + '\n';

      server.stdout.on('data', (data) => {
        const output = data.toString();
        if (!initialized && output.includes('"jsonrpc"') && output.includes('"result"')) {
          initialized = true;
          clearTimeout(timeout);
          resolve(server);
        }
      });

      server.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (
          !initialized &&
          errorOutput.toLowerCase().includes('error') &&
          !errorOutput.includes('✅')
        ) {
          clearTimeout(timeout);
          server.kill();
          reject(new Error(`Server startup error: ${errorOutput}`));
        }
      });

      server.on('error', (error) => {
        if (!initialized) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Send initialization
      setTimeout(() => {
        try {
          server.stdin?.write(initMessage);
        } catch {
          // Ignore write errors
        }
      }, 500);
    });
  }

  async function sendMcpRequest(server: ChildProcess, request: McpRequest): Promise<McpResponse> {
    return new Promise((resolve, reject) => {
      let responseReceived = false;

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error(`Request timeout for method ${request.method}`));
        }
      }, 5000);

      let buffer = '';

      const dataHandler = (data: Buffer) => {
        if (responseReceived) return;

        buffer += data.toString();
        const lines = buffer.split('\n');
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const response = JSON.parse(line);
            if (response.jsonrpc === '2.0' && response.id === request.id) {
              responseReceived = true;
              clearTimeout(timeout);
              server.stdout?.removeListener('data', dataHandler);
              resolve(response);
              return;
            }
          } catch {
            // Ignore parsing errors, continue with next line
          }
        }
      };

      server.stdout?.on('data', dataHandler);

      // Send request
      try {
        server.stdin?.write(JSON.stringify(request) + '\n');
      } catch (error) {
        clearTimeout(timeout);
        server.stdout?.removeListener('data', dataHandler);
        reject(error);
      }
    });
  }
});
