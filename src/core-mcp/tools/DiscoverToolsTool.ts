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
          'guidanceToken: Token from get_repository_guidance (required)',
        ],
        examples: [
          'askA24zMemory({ filePath: "/Users/user/project/src/AuthService.ts", query: "What authentication patterns are used here?", guidanceToken: "token-xyz" })',
          'askA24zMemory({ filePath: "/Users/user/project/src/api/", query: "How should I handle API error responses?", filterTypes: ["pattern"], guidanceToken: "token-xyz" })',
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
          'guidanceToken: Token from get_repository_guidance (optional)',
        ],
        examples: [
          'create_repository_note({ note: "Fixed race condition in validation middleware", directoryPath: "/Users/user/project", anchors: ["/Users/user/project/src/middleware/validation.ts"], tags: ["bugfix", "concurrency", "validation"], type: "gotcha" })',
        ],
      },
      {
        name: 'get_notes',
        category: 'knowledge',
        description:
          'Retrieve raw notes from the repository without AI processing. Returns actual note content, metadata, and anchors.',
        useCases: [
          'Browse through existing knowledge',
          'See exact notes stored in repository',
          'Get raw data for further processing',
          'Review notes with specific filters',
        ],
        parameters: [
          'path: File or directory path to get notes for',
          'guidanceToken: Token from get_repository_guidance (required)',
          'filterTags: Filter by specific tags (optional)',
          'filterTypes: Filter by note types (optional)',
          'filterReviewed: Filter by review status (all/reviewed/unreviewed)',
          'includeParentNotes: Include notes from parent directories',
          'includeStale: Include notes with stale anchors',
          'sortBy: Sort results (timestamp/reviewed/type/relevance)',
          'limit: Maximum number of notes to return',
          'offset: Pagination offset',
        ],
        examples: [
          'get_notes({ path: "/Users/user/project/src", guidanceToken: "token-xyz", filterTags: ["bugfix"], limit: 10 })',
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
          'guidanceToken: Token from get_repository_guidance (required)',
          'includeUsedTags: Include previously used tags',
          'includeSuggestedTags: Include path-based tag suggestions',
          'includeGuidance: Include repository guidance',
        ],
        examples: [
          'get_repository_tags({ path: "/Users/user/project/src/components/", guidanceToken: "token-xyz" })',
        ],
      },
      {
        name: 'get_repository_types',
        category: 'repository',
        description: 'Get available note types for categorizing notes in a repository.',
        useCases: [
          'See available note types (decision, pattern, gotcha, explanation)',
          'Understand how to categorize different kinds of knowledge',
          'Get repository-specific type guidance',
        ],
        parameters: [
          'path: File or directory path',
          'guidanceToken: Token from get_repository_guidance (required)',
          'includeGuidance: Include repository-specific guidance',
        ],
        examples: [
          'get_repository_types({ path: "/Users/user/project", guidanceToken: "token-xyz" })',
        ],
      },
      {
        name: 'get_repository_guidance',
        category: 'guidance',
        description:
          'Get repository-specific guidance for creating effective notes and obtain guidance token.',
        useCases: [
          'Get guidance token required for other tools',
          'Understand how to document knowledge in this repository',
          'Get guidance templates and best practices',
          'Learn repository-specific documentation standards',
        ],
        parameters: [
          'path: Any path within the repository',
          'includeToken: Whether to include guidance token (default: true)',
        ],
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
        name: 'get_stale_notes',
        category: 'repository',
        description:
          'Check for notes with stale anchors (file paths that no longer exist) in a repository.',
        useCases: [
          'Find notes that reference deleted or moved files',
          'Maintain note accuracy and relevance',
          'Clean up outdated documentation',
        ],
        parameters: ['directoryPath: Repository path (absolute)'],
        examples: ['get_stale_notes({ directoryPath: "/Users/user/project" })'],
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
        name: 'delete_repository_note',
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
          'delete_repository_note({ noteId: "note-1734567890123-abc123def", directoryPath: "/Users/user/project" })',
        ],
      },
      {
        name: 'create_handoff_brief',
        category: 'guidance',
        description: 'Create a comprehensive handoff brief for a specific part of the codebase.',
        useCases: [
          'Transfer knowledge when switching team members',
          'Create onboarding documentation for new developers',
          'Document project state before leaving',
          'Provide context for code reviews',
        ],
        parameters: [
          'path: File or directory path to create brief for',
          'context: Additional context about the handoff',
          'includeNotes: Include related repository notes',
          'includeStructure: Include file structure overview',
        ],
        examples: [
          'create_handoff_brief({ path: "/Users/user/project/src/auth", context: "Handing off authentication module to new developer" })',
        ],
      },
      {
        name: 'get_tag_usage',
        category: 'repository',
        description: 'Get detailed usage statistics for tags in the repository.',
        useCases: [
          'Understand tag usage patterns',
          'Find overused or underused tags',
          'Identify tag inconsistencies',
          'Plan tag cleanup or reorganization',
        ],
        parameters: [
          'directoryPath: Repository path (absolute)',
          'sortBy: Sort by count or name',
          'limit: Maximum number of tags to return',
        ],
        examples: [
          'get_tag_usage({ directoryPath: "/Users/user/project", sortBy: "count", limit: 20 })',
        ],
      },
      {
        name: 'delete_tag',
        category: 'repository',
        description: 'Delete a tag from all notes in the repository.',
        useCases: [
          'Clean up unused or deprecated tags',
          'Rename tags by deleting old and adding new',
          'Maintain consistent tag taxonomy',
        ],
        parameters: ['tag: Tag name to delete', 'directoryPath: Repository path (absolute)'],
        examples: ['delete_tag({ tag: "deprecated-tag", directoryPath: "/Users/user/project" })'],
      },
      {
        name: 'replace_tag',
        category: 'repository',
        description: 'Replace a tag with another tag across all notes in the repository.',
        useCases: [
          'Rename tags consistently across all notes',
          'Merge similar tags into a single tag',
          'Update tag naming conventions',
          'Fix typos in tag names',
        ],
        parameters: [
          'oldTag: The tag to replace',
          'newTag: The replacement tag',
          'directoryPath: Repository path (absolute)',
          'confirmReplacement: Must be true to confirm (safety check)',
          'transferDescription: Transfer old tag description to new tag (default: true)',
        ],
        examples: [
          'replace_tag({ oldTag: "bug-fix", newTag: "bugfix", directoryPath: "/Users/user/project", confirmReplacement: true })',
        ],
      },
      {
        name: 'get_note_coverage',
        category: 'repository',
        description:
          'Analyze note coverage for a repository to identify well-documented and under-documented areas.',
        useCases: [
          'Identify areas lacking documentation',
          'Find well-documented areas as examples',
          'Plan documentation efforts',
          'Generate coverage reports',
        ],
        parameters: [
          'directoryPath: Repository path to analyze',
          'includeDetails: Include detailed file-by-file analysis',
          'minComplexity: Minimum file complexity to include',
        ],
        examples: [
          'get_note_coverage({ directoryPath: "/Users/user/project", includeDetails: true })',
        ],
      },
      {
        name: 'start_documentation_quest',
        category: 'guidance',
        description:
          'Start an interactive documentation quest to systematically document a codebase.',
        useCases: [
          'Systematically document undocumented code',
          'Onboard new team members through guided documentation',
          'Improve overall documentation coverage',
          'Learn codebase while documenting',
        ],
        parameters: [
          'directoryPath: Repository path to document',
          'focusArea: Specific area to focus on (optional)',
          'difficulty: Quest difficulty (easy/medium/hard)',
        ],
        examples: [
          'start_documentation_quest({ directoryPath: "/Users/user/project", focusArea: "authentication", difficulty: "medium" })',
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
