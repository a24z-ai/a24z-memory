/**
 * MCP Server
 * Main server class that manages tools and resources
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  /*AppInfoTool,*/ AskA24zMemoryTool,
  RepositoryNoteTool,
  GetRepositoryTagsTool,
  GetRepositoryGuidanceTool,
  CopyGuidanceTemplateTool,
  DiscoverToolsTool,
} from '../tools';
import { McpServerConfig, McpTool, McpResource } from '../types';

export class McpServer {
  private server: any;
  private config: McpServerConfig;
  private tools: Map<string, McpTool> = new Map();
  private resources: Map<string, McpResource> = new Map();
  private messageQueue: any[] = [];

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
      },
    );

    this.setupDefaultTools();
    this.setupDefaultResources();
    this.registerHandlers();
  }

  private setupDefaultTools() {
    // Add default tools
    // this.addTool(new AppInfoTool(this.config.name, this.config.version, this.config.version));
    this.addTool(new AskA24zMemoryTool());
    this.addTool(new RepositoryNoteTool());
    this.addTool(new GetRepositoryTagsTool());
    this.addTool(new GetRepositoryGuidanceTool());
    this.addTool(new CopyGuidanceTemplateTool());
    this.addTool(new DiscoverToolsTool());
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
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      console.error('[McpServer] DEBUG: tool call received, name =', request.params.name);
      console.error('[McpServer] DEBUG: tool call args =', JSON.stringify(request.params.arguments, null, 2));
      console.error('[McpServer] DEBUG: current working directory:', process.cwd());
      console.error('[McpServer] DEBUG: __dirname:', __dirname);
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        console.error('[McpServer] DEBUG: tool not found, available tools:', Array.from(this.tools.keys()));
        throw new Error(`Unknown tool: ${name}`);
      }

      console.error('[McpServer] DEBUG: calling tool handler for', name);
      const result = await tool.handler(args || {});
      console.error('[McpServer] DEBUG: tool handler returned:', JSON.stringify(result, null, 2));
      return result as any;
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
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
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
    console.error(`📁 MCP Server __dirname: ${__dirname}`);
  }

  async stop() {
    // Cleanup if needed
    console.error(`${this.config.name} MCP server stopped`);
  }
}
