import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';
import { CodebaseView, ValidatedRepositoryPath } from '../../pure-core/types';
import { MemoryPalace } from '../../MemoryPalace';

export class CreateRepositoryAnchoredNoteTool extends BaseTool {
  name = 'create_repository_note';
  description =
    'Document tribal knowledge, architectural decisions, implementation patterns, and important lessons learned. This tool creates searchable notes that help future developers understand context and avoid repeating mistakes. Notes are stored locally in your repository and can be retrieved using the get_notes tool.';

  private fs: FileSystemAdapter;

  constructor(fs: FileSystemAdapter) {
    super();
    this.fs = fs;
  }

  schema = z.object({
    note: z
      .string()
      .describe(
        'The tribal knowledge content in Markdown format. Use code blocks with ``` for code snippets, **bold** for emphasis, and [file.ts](path/to/file.ts) for file references'
      ),
    directoryPath: z
      .string()
      .describe(
        'The absolute path to the git repository root directory (the directory containing .git). This determines which repository the note belongs to. Must be an absolute path starting with / and must point to a valid git repository root.'
      ),
    anchors: z
      .array(z.string())
      .min(1, 'At least one anchor path is required.')
      .describe(
        'File or directory paths that this note relates to. These paths enable cross-referencing and help surface relevant notes when working in different parts of the codebase. Include all paths that should trigger this note to appear, such as the files or directories the note is about.'
      ),
    tags: z
      .array(z.string())
      .min(1, 'At least one tag is required.')
      .describe(
        "Required semantic tags for categorization. Use get_repository_tags tool to see available tags. New tags will be created automatically if they don't exist."
      ),
    metadata: z
      .record(z.any())
      .optional()
      .describe(
        'Additional structured data about the note. Can include custom fields like author, related PRs, issue numbers, or any other contextual information that might be useful for future reference.'
      ),
    codebaseViewId: z
      .string()
      .optional()
      .describe(
        'Optional CodebaseView ID to associate this note with. If not provided, a session view will be auto-created based on your file anchors.'
      ),
  });

  async execute(input: z.input<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);

    // Validate that directoryPath is absolute
    if (!this.fs.isAbsolute(parsed.directoryPath)) {
      throw new Error(
        `❌ directoryPath must be an absolute path starting with '/'. ` +
          `Received relative path: "${parsed.directoryPath}". ` +
          `💡 Tip: Use absolute paths like /Users/username/projects/my-repo or /home/user/project. ` +
          `You can get the current working directory and build the absolute path from there.`
      );
    }

    // Validate that directoryPath exists
    if (!this.fs.exists(parsed.directoryPath)) {
      throw new Error(
        `❌ directoryPath does not exist: "${parsed.directoryPath}". ` +
          `💡 Tip: Make sure the path exists and you have read access to it. ` +
          `Check your current working directory and build the correct absolute path.`
      );
    }

    // Create MemoryPalace instance for this repository
    const palace = new MemoryPalace(parsed.directoryPath, this.fs);
    const repositoryRoot = MemoryPalace.validateRepositoryPath(this.fs, parsed.directoryPath);

    // Check configuration for tag/type enforcement
    const config = palace.getConfiguration();
    const tagEnforcement = config.tags?.enforceAllowedTags || false;

    // Check for new tags that don't have descriptions
    const existingTagDescriptions = palace.getTagDescriptions();
    const existingTags = Object.keys(existingTagDescriptions);
    const newTags = parsed.tags.filter((tag) => !existingTags.includes(tag));

    // Handle tag enforcement
    if (tagEnforcement && newTags.length > 0) {
      // When enforcement is on, reject new tags - use existing tags from descriptions
      const allowedTags = existingTags;
      const tagList =
        allowedTags.length > 0
          ? allowedTags
              .map((tag) => {
                const desc = existingTagDescriptions[tag];
                return desc
                  ? `• **${tag}**: ${desc.split('\n')[0].substring(0, 50)}...`
                  : `• **${tag}**`;
              })
              .join('\n')
          : 'No tags with descriptions exist yet.';

      throw new Error(
        `❌ Tag creation is not allowed when tag enforcement is enabled.\n\n` +
          `The following tags do not exist: ${newTags.join(', ')}\n\n` +
          `**Available tags with descriptions:**\n${tagList}\n\n` +
          `💡 To use new tags, either:\n` +
          `1. Use one of the existing tags above\n` +
          `2. Ask an administrator to create the tag with a proper description\n` +
          `3. Disable tag enforcement in .a24z/configuration.json`
      );
    }

    // When enforcement is OFF, auto-create empty descriptions for new tags/types
    const autoCreatedTags: string[] = [];

    if (!tagEnforcement && newTags.length > 0) {
      // Auto-create empty descriptions for new tags
      for (const tag of newTags) {
        try {
          palace.saveTagDescription(tag, '');
          autoCreatedTags.push(tag);
        } catch (error) {
          console.error(`Failed to auto-create tag description for "${tag}":`, error);
        }
      }
    }

    // Get or create the CodebaseView (after all validations pass)
    let view;
    let actualCodebaseViewId: string;

    if (parsed.codebaseViewId) {
      // User provided a view ID - validate it exists
      view = palace.getView(parsed.codebaseViewId);
      if (!view) {
        const availableViews = palace.listViews();
        const viewsList =
          availableViews.length > 0
            ? availableViews.map((v: CodebaseView) => `• ${v.id}: ${v.name}`).join('\n')
            : 'No views found. Please create a view first.';

        throw new Error(
          `❌ CodebaseView with ID "${parsed.codebaseViewId}" not found.\n\n` +
            `**Available views:**\n${viewsList}\n\n` +
            `💡 Tip: Use an existing view ID from the list above, or create a new view first.`
        );
      }
      actualCodebaseViewId = parsed.codebaseViewId;
    } else {
      // No view ID provided - get or create the catchall "default-explorer-log" view
      const defaultViewId = 'default-explorer-log';
      actualCodebaseViewId = defaultViewId;
    }

    const savedWithPath = palace.saveNote({
      note: parsed.note,
      anchors: parsed.anchors,
      tags: parsed.tags,
      codebaseViewId: actualCodebaseViewId,
      metadata: {
        ...(parsed.metadata || {}),
        toolVersion: '2.0.0',
        createdBy: 'create_repository_note_tool',
      },
    });

    const saved = savedWithPath.note;

    // Handle catchall view creation/update AFTER saving the note (so we have normalized anchors)
    if (!parsed.codebaseViewId) {
      view = palace.getView(actualCodebaseViewId);

      if (!view) {
        // Create the catchall view using the saved note's normalized anchors
        view = this.createCatchallView(repositoryRoot, actualCodebaseViewId, saved.anchors);
        palace.saveView(view);
        // Generate the initial markdown overview
        this.generateOverviewFile(repositoryRoot, view);
      } else {
        // Update the view to include a new time-based cell if needed, using normalized anchors
        this.updateCatchallViewWithTimeCell(
          repositoryRoot,
          actualCodebaseViewId,
          saved.anchors,
          palace
        );
        // Re-fetch the updated view
        view = palace.getView(actualCodebaseViewId)!;
        // Update the markdown overview
        this.generateOverviewFile(repositoryRoot, view);
      }
    } else {
      // Get the existing view that was specified
      view = palace.getView(actualCodebaseViewId)!;
    }

    // Build response message with guidance about auto-created tags/types
    let response =
      `✅ **Note saved successfully!**\n\n` +
      `🆔 **Note ID:** ${saved.id}\n` +
      `📁 **Repository:** ${repositoryRoot}\n` +
      `📊 **View:** ${view.name} (${actualCodebaseViewId})\n` +
      `🏷️ **Tags:** ${parsed.tags.join(', ')}\n`;

    // Add info about catchall view usage
    if (!parsed.codebaseViewId) {
      response += `🔄 **Default View:** Using time-based catchall view\n`;
    }

    return { content: [{ type: 'text', text: response }] };
  }

  /**
   * Create a catchall view with basic time-based configuration
   */
  private createCatchallView(
    repositoryPath: ValidatedRepositoryPath,
    viewId: string,
    initialAnchors: string[]
  ): CodebaseView {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = now.getHours().toString().padStart(2, '0'); // HH
    const cellName = `${today}-${hour}`;

    return {
      id: viewId,
      version: '1.0.0',
      name: 'Default Exploration Log',
      description: 'Time-based catchall view that grows with each note creation',
      category: 'reference', // Exploration logs are reference material
      displayOrder: 0, // Will be auto-assigned when saved
      timestamp: new Date().toISOString(),
      cells: {
        [cellName]: {
          files: initialAnchors,
          coordinates: [0, 0],
          priority: 5,
        },
      },
      overviewPath: `.a24z/overviews/${viewId}.md`,
      metadata: {
        generationType: 'user',
      },
    };
  }

  /**
   * Add or update a time-based cell in the catchall view with note anchors
   */
  private updateCatchallViewWithTimeCell(
    repositoryPath: ValidatedRepositoryPath,
    viewId: string,
    anchors: string[],
    palace: MemoryPalace
  ): void {
    const view = palace.getView(viewId);
    if (!view) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = now.getHours().toString().padStart(2, '0'); // HH
    const cellName = `${today}-${hour}`;

    if (!view.cells[cellName]) {
      // Create new time cell if it doesn't exist
      // Find the next available coordinates
      const existingCells = Object.values(view.cells);
      const maxRow = Math.max(0, ...existingCells.map((cell) => cell.coordinates[0]));
      const cellsInMaxRow = existingCells.filter((cell) => cell.coordinates[0] === maxRow);
      const maxColInRow =
        cellsInMaxRow.length > 0
          ? Math.max(...cellsInMaxRow.map((cell) => cell.coordinates[1]))
          : -1;

      // If we have 24 hours in current row (0-23), move to next row
      const nextCoordinates: [number, number] =
        maxColInRow >= 23 ? [maxRow + 1, 0] : [maxRow, maxColInRow + 1];

      view.cells[cellName] = {
        files: anchors,
        coordinates: nextCoordinates,
        priority: 5,
      };
    } else {
      // Add new anchors to existing cell if they're not already there
      const existingFiles = new Set(view.cells[cellName].files);
      const newAnchors = anchors.filter((anchor) => !existingFiles.has(anchor));

      if (newAnchors.length > 0) {
        view.cells[cellName].files = [...view.cells[cellName].files, ...newAnchors];
      }
    }

    // Update the view
    palace.saveView(view);
  }

  /**
   * Generate or update the markdown overview file for a codebase view
   */
  private generateOverviewFile(repositoryPath: ValidatedRepositoryPath, view: CodebaseView): void {
    // Create the overview directory if it doesn't exist
    const overviewDir = this.fs.join(repositoryPath, '.a24z', 'overviews');
    this.fs.createDir(overviewDir);

    // Generate markdown content
    const content = this.generateOverviewContent(view);

    // Write the overview file
    const overviewFilePath = this.fs.join(repositoryPath, view.overviewPath);
    this.fs.writeFile(overviewFilePath, content);
  }

  /**
   * Generate the markdown content for a codebase view overview
   */
  private generateOverviewContent(view: CodebaseView): string {
    let content = `# ${view.name}\n\n`;
    content += `${view.description}\n\n`;
    content += `**View ID:** \`${view.id}\`\n`;
    content += `**Generated:** ${new Date(view.timestamp || new Date()).toLocaleString()}\n`;
    content += `**Type:** ${view.metadata?.generationType || 'user'}\n\n`;

    // Add cells information
    const cellEntries = Object.entries(view.cells);
    if (cellEntries.length > 0) {
      content += `## Time-based Cells\n\n`;

      // Sort cells by name (which includes timestamp for time-based cells)
      cellEntries.sort(([a], [b]) => a.localeCompare(b));

      for (const [cellName, cell] of cellEntries) {
        content += `### ${cellName}\n\n`;

        if (cell.files && cell.files.length > 0) {
          content += `**Files:**\n`;
          for (const file of cell.files) {
            content += `- \`${file}\`\n`;
          }
          content += '\n';
        }

        content += `**Coordinates:** [${cell.coordinates[0]}, ${cell.coordinates[1]}]\n`;
        content += `**Priority:** ${cell.priority}\n\n`;
      }
    } else {
      content += `## Cells\n\n*No cells defined yet.*\n\n`;
    }

    content += `---\n\n`;
    content += `*This overview is automatically generated and updated when notes are added to this view.*\n`;

    return content;
  }
}
