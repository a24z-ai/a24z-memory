import { z } from 'zod';
import { BaseTool } from './base-tool';
import { McpToolResult } from '../types';
import { MemoryPalace } from '@a24z/core-library';
import { FileSystemAdapter } from '@a24z/core-library';

const inputSchema = z.object({
  path: z
    .string()
    .describe(
      'The absolute path to a git repository or any path within it to analyze coverage for'
    ),
  outputFormat: z
    .enum(['markdown', 'json', 'summary'])
    .optional()
    .default('markdown')
    .describe('The format for the coverage report output'),
  includeDirectories: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include directory coverage in the analysis'),
  includeUncoveredFiles: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include the full list of uncovered files in the response'),
  maxStaleAnchoredNotes: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of stale notes to include in the report'),
  fileTypeFilter: z
    .array(z.string())
    .optional()
    .describe('Filter coverage analysis to specific file extensions (e.g., ["ts", "js", "py"])'),
  excludeDirectoryAnchors: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to exclude notes that are directly anchored to directories from coverage calculation'
    ),
});

type ToolInput = z.infer<typeof inputSchema>;

export class GetAnchoredNoteCoverageTool extends BaseTool {
  name = 'get_note_coverage';
  description =
    'Analyze note coverage for a repository, showing which files have documentation and coverage statistics';
  schema = inputSchema;

  private fs: FileSystemAdapter;

  constructor(fs: FileSystemAdapter) {
    super();
    this.fs = fs;
  }

  async execute(input: unknown): Promise<McpToolResult> {
    const params = input as ToolInput;
    try {
      // Validate that path is absolute
      if (!this.fs.isAbsolute(params.path)) {
        throw new Error(
          `❌ path must be an absolute path starting with '/'. ` +
            `Received relative path: "${params.path}". ` +
            `💡 Tip: Use absolute paths like /Users/username/projects/my-repo or /home/user/project.`
        );
      }

      // Normalize to repository root
      const gitRoot = this.fs.normalizeRepositoryPath(params.path);

      // Create MemoryPalace instance
      const memoryPalace = new MemoryPalace(gitRoot, this.fs);

      // Generate the formatted coverage report using MemoryPalace
      // Note: getCoverageReport is deprecated and returns minimal info
      const output = memoryPalace.getCoverageReport();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        // Check for common errors
        if (error.message.includes('.gitignore')) {
          throw new Error(
            'No .gitignore file found in the repository. Note coverage requires a .gitignore file to determine eligible files.'
          );
        }
        if (error.message.includes('not a git repository')) {
          throw new Error(
            'The specified path is not within a git repository. Note coverage requires a git repository.'
          );
        }
        throw error;
      }
      throw new Error('Failed to calculate note coverage');
    }
  }
}
