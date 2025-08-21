import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';

export class DiscoverToolsTool extends BaseTool {
  public name = 'discover_a24z_tools';
  public description = 'Discover all available a24z-Memory tools and their capabilities. Use this to understand what tools are available and how to use them effectively.';

  public schema = z.object({
    category: z.enum(['all', 'knowledge', 'repository', 'guidance']).optional().default('all').describe('Filter tools by category: "all" shows everything, "knowledge" shows search/retrieval tools, "repository" shows note management tools, "guidance" shows guidance and template tools'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const { category } = input;

    const allTools = [
      {
        name: 'askA24zMemory',
        category: 'knowledge',
        description: 'Search and retrieve tribal knowledge, architectural decisions, patterns, and gotchas from the repository.',
        useCases: [
          'Check for existing knowledge before starting work',
          'Get guidance on implementation approaches',
          'Understand architectural decisions and patterns',
          'Avoid repeating past mistakes'
        ],
        parameters: [
          'filePath: Absolute path to relevant file or directory',
          'query: Your specific question about the code',
          'taskContext: Additional context about what you\'re trying to accomplish',
          'filterTags: Filter results by specific tags',
          'filterTypes: Filter by note types (decision, pattern, gotcha, explanation)'
        ],
        examples: [
          'askA24zMemory({ filePath: "/Users/user/project/src/AuthService.ts", query: "What authentication patterns are used here?" })',
          'askA24zMemory({ filePath: "/Users/user/project/src/api/", query: "How should I handle API error responses?", filterTypes: ["pattern"] })'
        ]
      },
      {
        name: 'create_repository_note',
        category: 'repository',
        description: 'Document tribal knowledge, architectural decisions, implementation patterns, and important lessons learned.',
        useCases: [
          'Document complex bugs after fixing them',
          'Record architectural decisions and their rationale',
          'Share implementation patterns with the team',
          'Document gotchas and important warnings'
        ],
        parameters: [
          'note: The insight or decision to document (Markdown format)',
          'directoryPath: Repository root path (absolute)',
          'anchors: File/directory paths this note relates to',
          'tags: Semantic tags for categorization',
          'confidence: Your confidence level (high/medium/low)',
          'type: Note type (decision/pattern/gotcha/explanation)',
          'metadata: Additional context (optional)'
        ],
        examples: [
          'create_repository_note({ note: "Fixed race condition in validation middleware", directoryPath: "/Users/user/project", anchors: ["/Users/user/project/src/middleware/validation.ts"], tags: ["bugfix", "concurrency", "validation"], type: "gotcha", confidence: "high" })'
        ]
      },
      {
        name: 'get_repository_tags',
        category: 'repository',
        description: 'Get available tags for categorizing notes and understand existing categorization patterns.',
        useCases: [
          'See what tags are available before creating notes',
          'Understand existing categorization patterns',
          'Get tag suggestions based on file paths'
        ],
        parameters: [
          'path: File or directory path',
          'includeUsedTags: Include previously used tags',
          'includeSuggestedTags: Include path-based tag suggestions',
          'includeGuidance: Include repository guidance'
        ],
        examples: [
          'get_repository_tags({ path: "/Users/user/project/src/components/" })'
        ]
      },
      {
        name: 'get_repository_guidance',
        category: 'guidance',
        description: 'Get repository-specific guidance for creating effective notes.',
        useCases: [
          'Understand how to document knowledge in this repository',
          'Get guidance templates and best practices',
          'Learn repository-specific documentation standards'
        ],
        parameters: [
          'path: Any path within the repository'
        ],
        examples: [
          'get_repository_guidance({ path: "/Users/user/project" })'
        ]
      },
      {
        name: 'copy_guidance_template',
        category: 'guidance',
        description: 'Copy note guidance templates to establish documentation standards.',
        useCases: [
          'Set up documentation standards for new repositories',
          'Improve existing documentation practices',
          'Get templates for different project types'
        ],
        parameters: [
          'path: Repository path where template should be copied',
          'template: Template type (default, react-typescript, nodejs-api, python-data-science)',
          'overwrite: Whether to overwrite existing guidance'
        ],
        examples: [
          'copy_guidance_template({ path: "/Users/user/project", template: "react-typescript" })'
        ]
      }
    ];

    // Filter tools based on category
    let filteredTools = allTools;
    if (category !== 'all') {
      filteredTools = allTools.filter(tool => tool.category === category);
    }

    // Generate response
    let response = `🔍 **a24z-Memory Tools Discovery**\n\n`;
    response += `📋 **Category:** ${category}\n`;
    response += `🔧 **Found ${filteredTools.length} tool(s)**\n\n`;

    for (const tool of filteredTools) {
      response += `## ${tool.name}\n\n`;
      response += `**${tool.description}**\n\n`;

      response += `### 🎯 Use Cases:\n`;
      tool.useCases.forEach(useCase => {
        response += `- ${useCase}\n`;
      });
      response += `\n`;

      response += `### 📝 Parameters:\n`;
      tool.parameters.forEach(param => {
        response += `- ${param}\n`;
      });
      response += `\n`;

      response += `### 💡 Examples:\n`;
      tool.examples.forEach(example => {
        response += `\`\`\`javascript\n${example}\n\`\`\`\n`;
      });
      response += `\n`;
    }

    response += `---\n\n`;
    response += `💡 **Pro Tips:**\n`;
    response += `- Always use absolute paths (starting with /) for file and directory parameters\n`;
    response += `- Check existing knowledge with \`askA24zMemory\` before starting work\n`;
    response += `- Document your learnings with \`create_repository_note\` after solving problems\n`;
    response += `- Use appropriate note types: \`decision\` for architecture, \`pattern\` for reusable solutions, \`gotcha\` for bugs/warnings, \`explanation\` for general knowledge\n`;

    return { content: [{ type: 'text', text: response }] };
  }
}
