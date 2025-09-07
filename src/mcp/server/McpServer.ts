/**
 * MCP Server
 * Main server class that manages tools and resources
 */

// import { fileURLToPath } from 'node:url';
// import { dirname } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  /*AppInfoTool,*/ CreateRepositoryAnchoredNoteTool,
  GetAnchoredNotesTool,
  GetRepositoryTagsTool,
  GetRepositoryGuidanceTool,
  DeleteAnchoredNoteTool,
  GetAnchoredNoteByIdTool,
  GetStaleAnchoredNotesTool,
  GetTagUsageTool,
  DeleteTagTool,
  ReplaceTagTool,
  GetAnchoredNoteCoverageTool,
  ListCodebaseViewsTool,
} from '../tools';
import { McpServerConfig, McpTool, McpResource } from '../types';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter';
import { AnchoredNotesStore } from '../../pure-core/stores/AnchoredNotesStore';
import { MemoryPalace } from '../../MemoryPalace';

export class McpServer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private server: any; // MCP SDK Server type not exported
  private config: McpServerConfig;
  private tools: Map<string, McpTool> = new Map();
  private resources: Map<string, McpResource> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private messageQueue: any[] = []; // Message types vary by transport

  constructor(config: McpServerConfig) {
    this.config = config;

    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupDefaultTools();
    this.setupDefaultResources();
    this.registerHandlers();
  }

  private setupDefaultTools() {
    // Get configuration to check which tools are enabled
    // TODO: Using process.cwd() is not ideal - this assumes the MCP server is always
    // started from the repository root. We should review this approach and consider:
    // 1. Passing the repository path as a configuration parameter
    // 2. Looking for .git directory to find the repository root
    // 3. Using an environment variable
    const fs = new NodeFileSystemAdapter();
    const notesStore = new AnchoredNotesStore(fs);
    // Use MemoryPalace to validate the repository path first
    const validatedRepo = MemoryPalace.validateRepositoryPath(fs, process.cwd());
    const config = notesStore.getConfiguration(validatedRepo);
    const enabledTools = config.enabled_mcp_tools || {};

    // Add tools based on configuration (default to true if not specified)
    if (enabledTools.create_repository_note !== false) {
      this.addTool(new CreateRepositoryAnchoredNoteTool(fs));
    }
    if (enabledTools.get_notes !== false) {
      this.addTool(new GetAnchoredNotesTool(fs));
    }
    if (enabledTools.get_repository_tags !== false) {
      this.addTool(new GetRepositoryTagsTool(fs));
    }
    if (enabledTools.get_repository_guidance !== false) {
      this.addTool(new GetRepositoryGuidanceTool(fs));
    }
    if (enabledTools.delete_repository_note !== false) {
      this.addTool(new DeleteAnchoredNoteTool(fs));
    }
    if (enabledTools.get_repository_note !== false) {
      this.addTool(new GetAnchoredNoteByIdTool());
    }
    if (enabledTools.get_stale_notes !== false) {
      this.addTool(new GetStaleAnchoredNotesTool(fs));
    }
    if (enabledTools.get_tag_usage !== false) {
      this.addTool(new GetTagUsageTool(fs));
    }
    if (enabledTools.delete_tag !== false) {
      this.addTool(new DeleteTagTool(fs));
    }
    if (enabledTools.replace_tag !== false) {
      this.addTool(new ReplaceTagTool(fs));
    }
    if (enabledTools.get_note_coverage !== false) {
      this.addTool(new GetAnchoredNoteCoverageTool(fs));
    }
    if (enabledTools.list_codebase_views !== false) {
      this.addTool(new ListCodebaseViewsTool(fs));
    }
  }

  private setupDefaultResources() {
    // Add app status resource
    this.addResource({
      uri: 'app://status',
      name: 'Application Status',
      description: 'Current application status and metrics',
      mimeType: 'application/json',
      handler: async () => {
        const status = {
          status: 'running',
          messageQueue: this.messageQueue.length,
          timestamp: Date.now(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        };
        return JSON.stringify(status, null, 2);
      },
    });
  }

  private registerHandlers() {
    // Handle tools/list request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolList = [];
      for (const [, tool] of this.tools.entries()) {
        toolList.push({
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema || {},
        });
      }
      return { tools: toolList };
    });

    // Handle tools/call request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      // MCP SDK request type
      console.error('[McpServer] DEBUG: tool call received, name =', request.params.name);
      console.error(
        '[McpServer] DEBUG: tool call args =',
        JSON.stringify(request.params.arguments, null, 2)
      );
      console.error('[McpServer] DEBUG: current working directory:', process.cwd());
      // console.error('[McpServer] DEBUG: __dirname:', dirname(fileURLToPath(import.meta.url)));
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        console.error(
          '[McpServer] DEBUG: tool not found, available tools:',
          Array.from(this.tools.keys())
        );
        throw new Error(`Unknown tool: ${name}`);
      }

      console.error('[McpServer] DEBUG: calling tool handler for', name);
      const result = await tool.handler(args || {});
      console.error('[McpServer] DEBUG: tool handler returned:', JSON.stringify(result, null, 2));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result as any; // MCP SDK expects any return type
    });

    // Handle resources/list request
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resourceList = [];
      for (const [, resource] of this.resources.entries()) {
        resourceList.push({
          uri: resource.uri,
          name: resource.name,
          description: resource.description || '',
          mimeType: resource.mimeType || 'text/plain',
        });
      }
      return { resources: resourceList };
    });

    // Handle resources/read request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      // MCP SDK request type
      const { uri } = request.params;
      const resource = this.resources.get(uri);

      if (!resource) {
        throw new Error(`Unknown resource: ${uri}`);
      }

      const content = await resource.handler();
      return {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType || 'text/plain',
            text: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          },
        ],
      };
    });
  }

  addTool(tool: McpTool) {
    this.tools.set(tool.name, tool);
  }

  addResource(resource: McpResource) {
    this.resources.set(resource.uri, resource);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`✅ ${this.config.name} MCP server started successfully`);
    console.error(`📁 MCP Server working directory: ${process.cwd()}`);
    // console.error(`📁 MCP Server __dirname: ${dirname(fileURLToPath(import.meta.url))}`);
  }

  async stop() {
    // Cleanup if needed
    console.error(`${this.config.name} MCP server stopped`);
  }
}
