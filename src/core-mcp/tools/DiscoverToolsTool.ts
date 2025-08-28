import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';

export class DiscoverToolsTool extends BaseTool {
  public name = 'discover_a24z_tools';
  public description =
    'Discover all available a24z-Memory tools and their capabilities. Use this to understand what tools are available and how to use them effectively.';

  public schema = z.object({
    category: z
      .enum(['all', 'knowledge', 'repository', 'guidance'])
      .optional()
      .default('all')
      .describe(
        'Filter tools by category: "all" shows everything, "knowledge" shows search/retrieval tools, "repository" shows note management tools, "guidance" shows guidance and template tools'
      ),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const { category } = input;

    const allTools = [
      {
        name: 'askA24zMemory',
        category: 'knowledge',
        description:
          'Search and retrieve tribal knowledge, architectural decisions, patterns, and gotchas from the repository.',
        useCases: [
          'Check for existing knowledge before starting work',
          'Get guidance on implementation approaches',
          'Understand architectural decisions and patterns',
          'Avoid repeating past mistakes',
        ],
        parameters: [
          'filePath: Absolute path to relevant file or directory',
          'query: Your specific question about the code',
          "taskContext: Additional context about what you're trying to accomplish",
          'filterTags: Filter results by specific tags',
          'filterTypes: Filter by note types (decision, pattern, gotcha, explanation)',
        ],
        examples: [
          'askA24zMemory({ filePath: "/Users/user/project/src/AuthService.ts", query: "What authentication patterns are used here?" })',
          'askA24zMemory({ filePath: "/Users/user/project/src/api/", query: "How should I handle API error responses?", filterTypes: ["pattern"] })',
        ],
      },
      {
        name: 'create_repository_note',
        category: 'repository',
        description:
          'Document tribal knowledge, architectural decisions, implementation patterns, and important lessons learned.',
        useCases: [
          'Document complex bugs after fixing them',
          'Record architectural decisions and their rationale',
          'Share implementation patterns with the team',
          'Document gotchas and important warnings',
        ],
        parameters: [
          'note: The insight or decision to document (Markdown format)',
          'directoryPath: Repository root path (absolute)',
          'anchors: File/directory paths this note relates to',
          'tags: Semantic tags for categorization',
          'type: Note type (decision/pattern/gotcha/explanation)',
          'metadata: Additional context (optional)',
        ],
        examples: [
          'create_repository_note({ note: "Fixed race condition in validation middleware", directoryPath: "/Users/user/project", anchors: ["/Users/user/project/src/middleware/validation.ts"], tags: ["bugfix", "concurrency", "validation"], type: "gotcha" })',
        ],
      },
      {
        name: 'get_repository_tags',
        category: 'repository',
        description:
          'Get available tags for categorizing notes and understand existing categorization patterns.',
        useCases: [
          'See what tags are available before creating notes',
          'Understand existing categorization patterns',
          'Get tag suggestions based on file paths',
        ],
        parameters: [
          'path: File or directory path',
          'includeUsedTags: Include previously used tags',
          'includeSuggestedTags: Include path-based tag suggestions',
          'includeGuidance: Include repository guidance',
        ],
        examples: ['get_repository_tags({ path: "/Users/user/project/src/components/" })'],
      },
      {
        name: 'get_repository_guidance',
        category: 'guidance',
        description: 'Get repository-specific guidance for creating effective notes.',
        useCases: [
          'Understand how to document knowledge in this repository',
          'Get guidance templates and best practices',
          'Learn repository-specific documentation standards',
        ],
        parameters: ['path: Any path within the repository'],
        examples: ['get_repository_guidance({ path: "/Users/user/project" })'],
      },
      {
        name: 'get_repository_note',
        category: 'repository',
        description: 'Retrieve a specific note by its unique ID for detailed information.',
        useCases: [
          'Get detailed information about a specific note',
          'Review note content and metadata',
          'Check note anchors and related files',
        ],
        parameters: [
          'noteId: Unique note ID (e.g., "note-1734567890123-abc123def")',
          'directoryPath: Repository path (absolute)',
        ],
        examples: [
          'get_repository_note({ noteId: "note-1734567890123-abc123def", directoryPath: "/Users/user/project" })',
        ],
      },
      {
        name: 'check_stale_notes',
        category: 'repository',
        description:
          'Check for notes with stale anchors (file paths that no longer exist) in a repository.',
        useCases: [
          'Find notes that reference deleted or moved files',
          'Maintain note accuracy and relevance',
          'Clean up outdated documentation',
        ],
        parameters: ['directoryPath: Repository path (absolute)'],
        examples: ['check_stale_notes({ directoryPath: "/Users/user/project" })'],
      },
      {
        name: 'discover_a24z_tools',
        category: 'guidance',
        description: 'Discover all available a24z-Memory tools and their capabilities.',
        useCases: [
          'Understand what tools are available',
          'Learn how to use tools effectively',
          'Get tool usage examples and parameters',
        ],
        parameters: ['category: Filter by category (all, knowledge, repository, guidance)'],
        examples: ['discover_a24z_tools({ category: "repository" })'],
      },
      {
        name: 'delete_note',
        category: 'repository',
        description: 'Delete a specific note from the knowledge base.',
        useCases: [
          'Remove outdated or incorrect information',
          'Clean up duplicate notes',
          'Remove notes that are no longer relevant',
        ],
        parameters: [
          'noteId: Unique note ID to delete',
          'directoryPath: Repository path (absolute)',
        ],
        examples: [
          'delete_note({ noteId: "note-1734567890123-abc123def", directoryPath: "/Users/user/project" })',
        ],
      },
      {
        name: 'find_similar_notes',
        category: 'knowledge',
        description:
          'Find notes with similar content to avoid duplication and discover related information.',
        useCases: [
          'Check for existing content before creating new notes',
          'Find related information and patterns',
          'Identify potential duplicates to merge',
        ],
        parameters: [
          'query: Search query for similar content',
          'content: Content to compare similarity against',
          'directoryPath: Repository path (absolute)',
          'limit: Maximum number of results',
          'minSimilarity: Minimum similarity score (0-1)',
        ],
        examples: [
          'find_similar_notes({ query: "authentication error handling", directoryPath: "/Users/user/project", limit: 5 })',
        ],
      },
      {
        name: 'merge_notes',
        category: 'repository',
        description: 'Combine multiple related notes into a comprehensive note.',
        useCases: [
          'Consolidate duplicate information',
          'Create comprehensive guides from fragments',
          'Organize scattered knowledge',
        ],
        parameters: [
          'noteIds: Array of note IDs to merge',
          'directoryPath: Repository path (absolute)',
          'newNote: Content for the merged note',
          'deleteOriginals: Whether to delete original notes',
        ],
        examples: [
          'merge_notes({ noteIds: ["note-123", "note-456"], directoryPath: "/Users/user/project", newNote: { note: "Comprehensive auth guide", tags: ["auth", "guide"] } })',
        ],
      },
      {
        name: 'review_duplicates',
        category: 'repository',
        description: 'Analyze the knowledge base to identify duplicate or highly similar notes.',
        useCases: [
          'Find duplicate content to consolidate',
          'Identify similar notes for merging',
          'Maintain knowledge base quality',
        ],
        parameters: [
          'directoryPath: Repository path to analyze',
          'similarityThreshold: Similarity threshold (0-1)',
          'groupBy: Group by content or tags',
        ],
        examples: [
          'review_duplicates({ directoryPath: "/Users/user/project", similarityThreshold: 0.9 })',
        ],
      },
    ];

    // Filter tools based on category
    let filteredTools = allTools;
    if (category !== 'all') {
      filteredTools = allTools.filter((tool) => tool.category === category);
    }

    // Generate response
    let response = `🔍 **a24z-Memory Tools Discovery**\n\n`;
    response += `📋 **Category:** ${category}\n`;
    response += `🔧 **Found ${filteredTools.length} tool(s)**\n\n`;

    for (const tool of filteredTools) {
      response += `## ${tool.name}\n\n`;
      response += `**${tool.description}**\n\n`;

      response += `### 🎯 Use Cases:\n`;
      tool.useCases.forEach((useCase) => {
        response += `- ${useCase}\n`;
      });
      response += `\n`;

      response += `### 📝 Parameters:\n`;
      tool.parameters.forEach((param) => {
        response += `- ${param}\n`;
      });
      response += `\n`;

      response += `### 💡 Examples:\n`;
      tool.examples.forEach((example) => {
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
