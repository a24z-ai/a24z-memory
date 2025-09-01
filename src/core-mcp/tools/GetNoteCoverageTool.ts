import { z } from 'zod';
import { BaseTool } from './base-tool';
import { McpToolResult } from '../types';
import { calculateNoteCoverage } from '../utils/noteCoverage';
import {
  formatCoverageReport,
  formatCoverageReportAsJson,
  formatCoverageSummary,
} from '../utils/coverageReportFormatter';

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
  maxStaleNotes: z
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

export class GetNoteCoverageTool extends BaseTool {
  name = 'get_note_coverage';
  description =
    'Analyze note coverage for a repository, showing which files have documentation and coverage statistics';
  schema = inputSchema;

  async execute(input: unknown): Promise<McpToolResult> {
    const params = input as ToolInput;
    try {
      // Calculate coverage
      const report = calculateNoteCoverage(params.path, {
        includeDirectories: params.includeDirectories,
        maxStaleNotesToReport: params.maxStaleNotes,
        excludeDirectoryAnchors: params.excludeDirectoryAnchors,
      });

      // Filter by file type if specified
      if (params.fileTypeFilter && params.fileTypeFilter.length > 0) {
        const filteredTypes = new Set(params.fileTypeFilter);

        // Filter covered and uncovered files
        report.coveredFiles = report.coveredFiles.filter((f) =>
          filteredTypes.has(f.extension || 'no-extension')
        );
        report.uncoveredFiles = report.uncoveredFiles.filter((f) =>
          filteredTypes.has(f.extension || 'no-extension')
        );

        // Recalculate metrics based on filtered files
        const totalFilteredFiles = report.coveredFiles.length + report.uncoveredFiles.length;
        report.metrics.totalEligibleFiles = totalFilteredFiles;
        report.metrics.filesWithNotes = report.coveredFiles.length;
        report.metrics.fileCoveragePercentage =
          totalFilteredFiles > 0 ? (report.coveredFiles.length / totalFilteredFiles) * 100 : 0;

        // Filter coverage by type to only show filtered types
        const filteredCoverageByType: typeof report.coverageByType = {};
        for (const type of params.fileTypeFilter) {
          if (report.coverageByType[type]) {
            filteredCoverageByType[type] = report.coverageByType[type];
          }
        }
        report.coverageByType = filteredCoverageByType;
      }

      // Format output based on requested format
      let output: string;

      switch (params.outputFormat) {
        case 'json':
          output = formatCoverageReportAsJson(report);
          break;

        case 'summary':
          output = formatCoverageSummary(report);
          break;

        case 'markdown':
        default:
          output = formatCoverageReport(report);

          // Optionally append uncovered files list
          if (params.includeUncoveredFiles && report.uncoveredFiles.length > 0) {
            output += '\n## Complete List of Uncovered Files\n\n';
            report.uncoveredFiles.forEach((file) => {
              output += `- ${file.relativePath}\n`;
            });
          }
          break;
      }

      return {
        content: [
          {
            type: 'text',
            text: output,
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
