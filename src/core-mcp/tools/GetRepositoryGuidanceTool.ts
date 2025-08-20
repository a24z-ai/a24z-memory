import { z } from 'zod';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { getRepositoryGuidance } from '../store/notesStore';

export class GetRepositoryGuidanceTool extends BaseTool {
  name = 'get_repository_guidance';
  description = 'Get repository-specific guidance for creating effective notes';

  schema = z.object({
    path: z.string().describe('The file or directory path to get guidance for. Can be any path within the repository - the tool will find the repository root and look for guidance.'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const guidance = getRepositoryGuidance(input.path);
    
    if (!guidance) {
      return { 
        content: [{ 
          type: 'text', 
          text: 'No repository-specific guidance found. Consider creating a note-guidance.md file in your .a24z directory to help team members understand what types of notes are most valuable for this project.' 
        }] 
      };
    }

    return { 
      content: [{ 
        type: 'text', 
        text: guidance 
      }] 
    };
  }
}