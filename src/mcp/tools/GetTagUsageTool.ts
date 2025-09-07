import { z } from 'zod';
import { BaseTool } from './base-tool';
import { MemoryPalace } from '../../MemoryPalace';
import { NodeFileSystemAdapter, findGitRoot } from '../../node-adapters/NodeFileSystemAdapter';
import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem';
import { McpToolResult } from '../types';
import path from 'path';
import { existsSync } from 'fs';

const GetTagUsageSchema = z.object({
  directoryPath: z
    .string()
    .describe(
      'The absolute path to the git repository root directory or any path within it. The tool will find the repository root automatically.'
    ),
  filterTags: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of specific tags to get usage for. If not provided, all tags will be analyzed.'
    ),
  includeNoteIds: z
    .boolean()
    .default(false)
    .describe('Whether to include the list of note IDs that use each tag.'),
  includeDescriptions: z
    .boolean()
    .default(true)
    .describe('Whether to include tag descriptions in the output.'),
});

interface TagUsageInfo {
  tag: string;
  usageCount: number;
  hasDescription: boolean;
  description?: string;
  noteIds?: string[];
}

export class GetTagUsageTool extends BaseTool {
  name = 'get_tag_usage';
  description =
    'Get comprehensive usage statistics for tags in a repository, showing which tags are used, how often, and whether they have descriptions';
  schema = GetTagUsageSchema;

  // Allow injection of a custom filesystem adapter for testing
  private fsAdapter?: FileSystemAdapter;

  constructor(fsAdapter?: FileSystemAdapter) {
    super();
    this.fsAdapter = fsAdapter;
  }

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const parsed = this.schema.parse(input);
    const { directoryPath, filterTags, includeNoteIds, includeDescriptions } = parsed;

    // Normalize the path
    const normalizedPath = path.resolve(directoryPath);

    // Check if path exists
    if (!existsSync(normalizedPath)) {
      throw new Error(`Path does not exist: ${normalizedPath}`);
    }

    // Find the git root
    const repoRoot = findGitRoot(normalizedPath);
    if (!repoRoot) {
      throw new Error(
        `Not a git repository: ${normalizedPath}. This tool requires a git repository.`
      );
    }

    // Create MemoryPalace instance
    const adapter = this.fsAdapter || new NodeFileSystemAdapter();
    const memoryPalace = new MemoryPalace(repoRoot, adapter);

    // Get all tag descriptions using MemoryPalace
    const tagDescriptions = memoryPalace.getTagDescriptions();

    // Get all notes to analyze tag usage using MemoryPalace
    const allNotes = memoryPalace.getNotes(true);
    const tagUsageMap = new Map<string, Set<string>>(); // tag -> Set of note IDs

    // Analyze tag usage from all notes
    for (const noteWithPath of allNotes) {
      const note = noteWithPath.note;
      for (const tag of note.tags || []) {
        if (!tagUsageMap.has(tag)) {
          tagUsageMap.set(tag, new Set());
        }
        tagUsageMap.get(tag)!.add(note.id);
      }
    }

    // Get all unique tags (from both descriptions and usage)
    const allTags = new Set<string>([...Object.keys(tagDescriptions), ...tagUsageMap.keys()]);

    // Filter tags if requested
    const tagsToAnalyze = filterTags
      ? filterTags.filter((tag) => allTags.has(tag))
      : Array.from(allTags);

    // Build usage information for each tag
    const tagUsageInfo: TagUsageInfo[] = tagsToAnalyze
      .map((tag) => {
        const noteIds = tagUsageMap.get(tag) || new Set();
        const info: TagUsageInfo = {
          tag,
          usageCount: noteIds.size,
          hasDescription: tag in tagDescriptions,
        };

        if (includeDescriptions && tag in tagDescriptions) {
          info.description = tagDescriptions[tag];
        }

        if (includeNoteIds && noteIds.size > 0) {
          info.noteIds = Array.from(noteIds);
        }

        return info;
      })
      .sort((a, b) => {
        // Sort by usage count (descending), then alphabetically
        if (a.usageCount !== b.usageCount) {
          return b.usageCount - a.usageCount;
        }
        return a.tag.localeCompare(b.tag);
      });

    // Calculate statistics
    const totalTags = tagUsageInfo.length;
    const usedTags = tagUsageInfo.filter((t) => t.usageCount > 0).length;
    const unusedTags = tagUsageInfo.filter((t) => t.usageCount === 0).length;
    const tagsWithDescriptions = tagUsageInfo.filter((t) => t.hasDescription).length;
    const tagsWithoutDescriptions = tagUsageInfo.filter(
      (t) => !t.hasDescription && t.usageCount > 0
    ).length;

    const response = {
      repository: repoRoot,
      statistics: {
        totalTags,
        usedTags,
        unusedTags,
        tagsWithDescriptions,
        tagsWithoutDescriptions,
      },
      tags: tagUsageInfo,
      recommendations: [] as string[],
    };

    // Add recommendations
    if (unusedTags > 0) {
      response.recommendations.push(
        `Found ${unusedTags} unused tag(s) that could be deleted to keep the repository clean.`
      );
    }
    if (tagsWithoutDescriptions > 0) {
      response.recommendations.push(
        `Found ${tagsWithoutDescriptions} tag(s) being used without descriptions. Consider adding descriptions for better documentation.`
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
}
