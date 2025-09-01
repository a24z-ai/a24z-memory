import { z } from 'zod';
import { BaseTool } from './base-tool';
import { McpToolResult } from '../types';
import { calculateNoteCoverage, NoteCoverageReport } from '../utils/noteCoverage';
import { FileInfo } from '../utils/eligibleFiles';
import {
  loadQuestInstructions,
  getRandomQuestInstruction,
  checkQuestConfiguration,
  QuestConfigurationStatus,
} from '../utils/documentationInstructions';
import * as path from 'path';

const inputSchema = z.object({
  path: z.string().describe('The absolute path to a git repository or any path within it'),
  quest: z
    .string()
    .optional()
    .describe(
      'Type of documentation quest (e.g., "architecture", "gotcha", "api", "onboarding"). Must be configured in documentation-quests.json'
    ),
  fileTypes: z
    .array(z.string())
    .optional()
    .describe(
      'Limit quest to specific file extensions (e.g., ["ts", "js"]). If not specified, uses all code files.'
    ),
});

type ToolInput = z.infer<typeof inputSchema>;

interface QuestResult {
  winner: string;
  relativePath: string;
  size: number;
  extension: string;
  questType: string;
  reason: string;
  instruction: string;
  context?: string;
}

export class StartDocumentationQuestTool extends BaseTool {
  name = 'start_documentation_quest';
  description =
    'Start a documentation quest! Intelligently selects an undocumented file for a specific type of documentation mission (architecture, gotchas, API docs, etc.).';
  schema = inputSchema;

  async execute(input: unknown): Promise<McpToolResult> {
    const params = input as ToolInput;
    try {
      // Check if documentation quest instructions are configured
      const configStatus = checkQuestConfiguration(params.path, params.quest);

      // If no configuration exists
      if (!configStatus.hasConfiguration) {
        return {
          content: [
            {
              type: 'text',
              text: this.formatNoConfigurationMessage(configStatus, params.path),
            },
          ],
        };
      }

      // If no specific quest requested, pick a random available one
      let questType = params.quest;
      if (!questType) {
        questType =
          configStatus.availableQuests[
            Math.floor(Math.random() * configStatus.availableQuests.length)
          ];
      }

      // Check if the requested quest is configured
      if (params.quest && !configStatus.hasRequestedQuest) {
        return {
          content: [
            {
              type: 'text',
              text: this.formatMissingQuestMessage(params.quest, configStatus, params.path),
            },
          ],
        };
      }

      // Calculate coverage to find uncovered files
      const report = calculateNoteCoverage(params.path, {
        includeDirectories: false,
        excludeDirectoryAnchors: true, // Exclude directory anchors for more accurate file coverage
      });

      // Filter uncovered files by type if specified
      let eligibleFiles = report.uncoveredFiles;

      // Default code file types if not specified
      const codeExtensions = params.fileTypes || [
        'ts',
        'js',
        'tsx',
        'jsx',
        'py',
        'java',
        'go',
        'rs',
        'cpp',
        'c',
        'h',
        'swift',
        'kt',
      ];

      // Filter to only code files
      eligibleFiles = eligibleFiles.filter((f) => codeExtensions.includes(f.extension || ''));

      if (eligibleFiles.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: this.formatNoFilesMessage(params.fileTypes, report),
            },
          ],
        };
      }

      // Select file based on quest type
      const winner = this.selectWinnerForQuest(eligibleFiles, questType);

      // Load documentation quest instructions
      const instructions = loadQuestInstructions(params.path);
      if (!instructions) {
        // This shouldn't happen given our checks above, but handle it gracefully
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Could not load documentation quest instructions.',
            },
          ],
        };
      }

      const instruction = getRandomQuestInstruction(instructions, questType);
      if (!instruction) {
        // This also shouldn't happen given our checks
        return {
          content: [
            {
              type: 'text',
              text: `Error: No instructions found for "${questType}" quest.`,
            },
          ],
        };
      }

      // Generate quest result
      const result = this.generateQuestResult(winner, questType, instruction, report);

      return {
        content: [
          {
            type: 'text',
            text: this.formatQuestResult(result),
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to start documentation quest');
    }
  }

  private selectWinnerForQuest(files: FileInfo[], questType: string): FileInfo {
    let candidates = [...files];

    switch (questType) {
      case 'architecture':
        // Prioritize larger, central files and files with "manager", "service", "controller", "core" in name
        candidates = candidates
          .filter((f) => f.size && f.size > 5000) // Larger files more likely to have architecture
          .sort((a, b) => {
            const aIsArchitectural =
              /(?:manager|service|controller|core|engine|system|main|index)/i.test(a.relativePath);
            const bIsArchitectural =
              /(?:manager|service|controller|core|engine|system|main|index)/i.test(b.relativePath);
            if (aIsArchitectural && !bIsArchitectural) return -1;
            if (!aIsArchitectural && bIsArchitectural) return 1;
            return (b.size || 0) - (a.size || 0); // Then by size
          });
        break;

      case 'gotcha':
        // Prioritize complex files, utils, algorithms, edge cases
        candidates = candidates.sort((a, b) => {
          const aIsGotchaProne =
            /(?:util|helper|algorithm|parser|validator|converter|transform)/i.test(a.relativePath);
          const bIsGotchaProne =
            /(?:util|helper|algorithm|parser|validator|converter|transform)/i.test(b.relativePath);
          if (aIsGotchaProne && !bIsGotchaProne) return -1;
          if (!aIsGotchaProne && bIsGotchaProne) return 1;
          return (b.size || 0) - (a.size || 0);
        });
        break;

      case 'api':
        // Prioritize files that export APIs: controllers, routers, handlers, public interfaces
        candidates = candidates.sort((a, b) => {
          const aIsAPI =
            /(?:api|controller|router|handler|endpoint|interface|public)/i.test(a.relativePath) ||
            a.relativePath.includes('/api/') ||
            (a.extension === 'ts' && !a.relativePath.includes('test'));
          const bIsAPI =
            /(?:api|controller|router|handler|endpoint|interface|public)/i.test(b.relativePath) ||
            b.relativePath.includes('/api/') ||
            (b.extension === 'ts' && !b.relativePath.includes('test'));
          if (aIsAPI && !bIsAPI) return -1;
          if (!aIsAPI && bIsAPI) return 1;
          return Math.random() - 0.5;
        });
        break;

      case 'onboarding':
        // Prioritize entry points, main files, commonly used utilities
        candidates = candidates.sort((a, b) => {
          const aIsEntryPoint =
            /(?:index|main|app|server|client|init)/i.test(path.basename(a.relativePath)) ||
            a.relativePath.split('/').length <= 3; // Files closer to root
          const bIsEntryPoint =
            /(?:index|main|app|server|client|init)/i.test(path.basename(b.relativePath)) ||
            b.relativePath.split('/').length <= 3;
          if (aIsEntryPoint && !bIsEntryPoint) return -1;
          if (!aIsEntryPoint && bIsEntryPoint) return 1;
          return Math.random() - 0.5;
        });
        break;

      case 'performance':
        // Prioritize algorithms, data processing, large files, loops, computations
        candidates = candidates
          .filter((f) => f.size && f.size > 3000) // Larger files more likely to have performance concerns
          .sort((a, b) => {
            const aIsPerfSensitive =
              /(?:algorithm|process|compute|calculate|sort|search|optimize|cache|batch|stream)/i.test(
                a.relativePath
              );
            const bIsPerfSensitive =
              /(?:algorithm|process|compute|calculate|sort|search|optimize|cache|batch|stream)/i.test(
                b.relativePath
              );
            if (aIsPerfSensitive && !bIsPerfSensitive) return -1;
            if (!aIsPerfSensitive && bIsPerfSensitive) return 1;
            return (b.size || 0) - (a.size || 0);
          });
        break;

      case 'refactor':
        // Prioritize older, larger files, those with "legacy", "old", "temp" in name
        candidates = candidates
          .filter((f) => f.size && f.size > 8000) // Larger files more likely to need refactoring
          .sort((a, b) => {
            const aIsLegacy = /(?:legacy|old|temp|deprecated|hack|fix|workaround)/i.test(
              a.relativePath
            );
            const bIsLegacy = /(?:legacy|old|temp|deprecated|hack|fix|workaround)/i.test(
              b.relativePath
            );
            if (aIsLegacy && !bIsLegacy) return -1;
            if (!aIsLegacy && bIsLegacy) return 1;
            return (b.size || 0) - (a.size || 0);
          });
        break;

      default:
        // Random selection for unknown quest types
        candidates = candidates.sort(() => Math.random() - 0.5);
        break;
    }

    // If no candidates match criteria, use all files
    if (candidates.length === 0) {
      candidates = files.sort(() => Math.random() - 0.5);
    }

    // Pick from top candidates (weighted towards the best matches)
    const topCandidates = Math.min(5, candidates.length);
    const index = Math.floor(Math.random() * topCandidates);

    return candidates[index];
  }

  private generateQuestResult(
    file: FileInfo,
    questType: string,
    instruction: string,
    report: NoteCoverageReport
  ): QuestResult {
    // Generate reason based on file characteristics and quest type
    const reasons = this.getQuestReasons(file, questType);
    const reason = reasons[Math.floor(Math.random() * reasons.length)];

    // Generate context
    const context = this.getContext(report, file);

    return {
      winner: path.basename(file.relativePath),
      relativePath: file.relativePath,
      size: file.size || 0,
      extension: file.extension || 'unknown',
      questType,
      reason,
      instruction,
      context,
    };
  }

  private getQuestReasons(file: FileInfo, questType: string): string[] {
    const sizeKB = ((file.size || 0) / 1024).toFixed(0);

    const reasons = [
      `Selected for ${questType} quest`,
      `This ${file.extension} file is a good candidate for ${questType} documentation`,
    ];

    // Quest-specific reasons
    switch (questType) {
      case 'architecture':
        if (/(?:manager|service|controller|core|engine|system)/i.test(file.relativePath)) {
          reasons.push(`Core architectural component identified`);
        }
        if (file.size && file.size > 10000) {
          reasons.push(
            `Large file (${sizeKB}KB) likely contains significant architectural decisions`
          );
        }
        break;

      case 'gotcha':
        if (/(?:util|helper|algorithm|parser)/i.test(file.relativePath)) {
          reasons.push(`Utility file often contains non-obvious behavior`);
        }
        reasons.push(`Complex logic likely contains edge cases worth documenting`);
        break;

      case 'api':
        if (/(?:api|controller|router|handler)/i.test(file.relativePath)) {
          reasons.push(`API endpoint identified - public interface needs documentation`);
        }
        if (file.extension === 'ts') {
          reasons.push(`TypeScript file likely exports public interfaces`);
        }
        break;

      case 'onboarding':
        if (file.relativePath.split('/').length <= 3) {
          reasons.push(`Root-level file - important for new team member understanding`);
        }
        if (/(?:index|main|app|server)/i.test(path.basename(file.relativePath))) {
          reasons.push(`Entry point file - critical for onboarding`);
        }
        break;

      case 'performance':
        if (/(?:algorithm|process|compute|batch)/i.test(file.relativePath)) {
          reasons.push(`Performance-sensitive code identified`);
        }
        if (file.size && file.size > 8000) {
          reasons.push(`Large file (${sizeKB}KB) may have performance implications`);
        }
        break;

      case 'refactor':
        if (/(?:legacy|old|temp|deprecated)/i.test(file.relativePath)) {
          reasons.push(`Legacy code identified - needs refactoring documentation`);
        }
        if (file.size && file.size > 15000) {
          reasons.push(`Large file (${sizeKB}KB) may need refactoring insights`);
        }
        break;
    }

    // File type specific reasons
    if (file.relativePath.includes('test')) {
      reasons.push(`Test file - document testing strategies and edge cases`);
    }

    if (file.relativePath.includes('config')) {
      reasons.push(`Configuration file - important for ${questType} understanding`);
    }

    return reasons;
  }

  private getContext(report: NoteCoverageReport, file: FileInfo): string | undefined {
    const contexts = [];

    const coveragePercent = report.metrics.fileCoveragePercentage.toFixed(1);
    contexts.push(`Repository coverage: ${coveragePercent}%`);

    const typeStats = report.coverageByType[file.extension];
    if (typeStats) {
      const typeCoverage = typeStats.coveragePercentage.toFixed(1);
      contexts.push(
        `${file.extension} file coverage: ${typeCoverage}% (${typeStats.filesWithNotes}/${typeStats.totalFiles} files)`
      );
    }

    if (report.metrics.totalNotes > 0) {
      contexts.push(`Repository has ${report.metrics.totalNotes} existing notes`);
    }

    return contexts.join(' | ');
  }

  private formatQuestResult(result: QuestResult): string {
    const sizeStr =
      result.size > 1024 * 1024
        ? `${(result.size / 1024 / 1024).toFixed(2)} MB`
        : `${(result.size / 1024).toFixed(1)} KB`;

    let output = `# 📜 Documentation Quest: ${result.questType}\n\n`;

    output += `## 🎯 Quest Target\n\n`;
    output += `**Selected File:** \`${result.relativePath}\`\n\n`;

    output += `### 📊 File Information\n`;
    output += `- **Name**: ${result.winner}\n`;
    output += `- **Size**: ${sizeStr}\n`;
    output += `- **Type**: .${result.extension}\n`;
    output += `- **Quest Type**: ${result.questType}\n\n`;

    output += `### 🔍 Why This File?\n`;
    output += `${result.reason}\n\n`;

    output += `### 📝 Your Mission\n`;
    output += `${result.instruction}\n\n`;

    if (result.context) {
      output += `### Context\n`;
      output += `${result.context}\n\n`;
    }

    output += '---\n';
    output += '*Use `create_repository_note` to add documentation for this file.*\n';
    output += '*Customize quest instructions in `.a24z/documentation-quests.json`*\n';

    return output;
  }

  private formatNoFilesMessage(
    fileTypes: string[] | undefined,
    report: NoteCoverageReport
  ): string {
    let output = '# Documentation Focus: No Eligible Files\n\n';

    if (fileTypes && fileTypes.length > 0) {
      output += `✅ All **${fileTypes.join(', ')}** files are already documented!\n\n`;
    } else {
      output += '✅ All code files in the repository are already documented!\n\n';
    }

    output += '### Coverage Summary\n';
    output += `- **Overall Coverage**: ${report.metrics.fileCoveragePercentage.toFixed(1)}%\n`;
    output += `- **Files with Notes**: ${report.metrics.filesWithNotes}/${report.metrics.totalEligibleFiles}\n`;
    output += `- **Total Notes**: ${report.metrics.totalNotes}\n\n`;

    output += '### Next Steps\n';
    output += '- Review existing notes for accuracy and completeness\n';
    output += '- Consider documenting non-code files (configs, docs, etc.)\n';
    output += '- Look for files that could use additional detail\n';
    output += '- Check for stale notes that reference deleted files\n';

    return output;
  }

  private formatNoConfigurationMessage(
    configStatus: QuestConfigurationStatus,
    _repoPath: string
  ): string {
    let output = '# Documentation Quest: Configuration Required\n\n';

    output += '## ⚠️ No Documentation Quest Instructions Found\n\n';
    output +=
      'Documentation Quests require you to configure quest instructions for your repository.\n\n';

    output += '### Setup Instructions\n\n';
    output += '1. Create the configuration file at:\n';
    output += `   \`${configStatus.configPath}\`\n\n`;

    output += '2. Add your quest instructions in this format:\n\n';
    output += '```json\n';
    output += '{\n';
    output += '  "architecture": [\n';
    output += '    "Document the key architectural decisions made in this file",\n';
    output += '    "Explain why this design approach was chosen over alternatives"\n';
    output += '  ],\n';
    output += '  "gotcha": [\n';
    output += '    "Document any non-obvious behavior or edge cases",\n';
    output += '    "Add notes about common mistakes when using this code"\n';
    output += '  ],\n';
    output += '  "api": [\n';
    output += '    "Document the public API and its expected usage",\n';
    output += '    "Add examples of how to use the main functions or classes"\n';
    output += '  ],\n';
    output += '  "onboarding": [\n';
    output += '    "Explain what this file does in simple terms for new team members",\n';
    output += '    "Document the main responsibilities and use cases"\n';
    output += '  ]\n';
    output += '}\n';
    output += '```\n\n';

    output += '### Notes\n';
    output += "- You can configure any quest types that fit your team's needs\n";
    output += '- Each quest type should have an array of possible documentation tasks\n';
    output += '- Tasks will be randomly selected when you start a quest\n';
    output += "- Customize the instructions to match your team's documentation standards\n\n";

    output += '### Quick Start\n';
    output += 'To create an example configuration file, run:\n';
    output += '```bash\n';
    output += `mkdir -p "$(dirname "${configStatus.configPath}")" && cat > "${configStatus.configPath}" << 'EOF'\n`;
    output += '{\n';
    output += '  "onboarding": [\n';
    output += '    "Document the main purpose and key functions of this file",\n';
    output += '    "Explain how this module fits into the system architecture",\n';
    output += '    "Add notes about any complex logic or important decisions"\n';
    output += '  ]\n';
    output += '}\n';
    output += 'EOF\n';
    output += '```\n';

    return output;
  }

  private formatMissingQuestMessage(
    questType: string,
    configStatus: QuestConfigurationStatus,
    _repoPath: string
  ): string {
    let output = '# Documentation Quest: Configuration Incomplete\n\n';

    output += `## ⚠️ No Instructions for "${questType}" Quest\n\n`;
    output += `The requested quest type "${questType}" is not configured.\n\n`;

    output += '### Available Quest Types\n';
    if (configStatus.availableQuests.length > 0) {
      configStatus.availableQuests.forEach((q: string) => {
        output += `- ✅ ${q}\n`;
      });
    } else {
      output += 'None configured\n';
    }
    output += '\n';

    output += '### How to Fix\n';
    output += `1. Edit the configuration file at:\n`;
    output += `   \`${configStatus.configPath}\`\n\n`;

    output += `2. Add instructions for the "${questType}" quest type:\n\n`;
    output += '```json\n';
    output += '{\n';
    output += '  // ... existing configuration ...\n';
    output += `  "${questType}": [\n`;
    output += '    "Your quest instruction here",\n';
    output += '    "Another possible quest instruction",\n';
    output += '    "Add as many quest instructions as you like"\n';
    output += '  ]\n';
    output += '}\n';
    output += '```\n\n';

    output += '### Alternative\n';
    output += 'Use one of the available quest types:\n';
    configStatus.availableQuests.forEach((q: string) => {
      output += `- \`quest: "${q}"\`\n`;
    });

    return output;
  }
}
