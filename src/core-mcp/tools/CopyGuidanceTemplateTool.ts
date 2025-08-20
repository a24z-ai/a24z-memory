import { z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { McpToolResult } from '../types';
import { BaseTool } from './base-tool';
import { normalizeRepositoryPath } from '../utils/pathNormalization';

export class CopyGuidanceTemplateTool extends BaseTool {
  name = 'copy_guidance_template';
  description = 'Copy a note guidance template to your repository\'s .a24z directory';

  schema = z.object({
    path: z.string().describe('The repository path where the template should be copied. Can be any path within the repository - the tool will find the repository root and create the .a24z directory if needed.'),
    template: z.enum(['default', 'react-typescript', 'nodejs-api', 'python-data-science']).optional().default('default').describe('Template type to copy. Choose based on your project type: "default" for general projects, "react-typescript" for React/TypeScript apps, "nodejs-api" for Node.js backend services, "python-data-science" for data science/ML projects.'),
    overwrite: z.boolean().optional().default(false).describe('Whether to overwrite an existing note-guidance.md file. Set to true if you want to replace your current guidance with the selected template.'),
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    try {
      const normalizedRepo = normalizeRepositoryPath(input.path);
      const dataDir = path.join(normalizedRepo, '.a24z');
      const targetFile = path.join(dataDir, 'note-guidance.md');
      
      // Check if guidance file already exists
      if (fs.existsSync(targetFile) && !input.overwrite) {
        return {
          content: [{
            type: 'text',
            text: `Guidance file already exists at ${targetFile}. Use overwrite: true to replace it.`
          }]
        };
      }
      
      // Get template file path
      const templateFileName = input.template === 'default' 
        ? 'default-note-guidance.md'
        : `${input.template}-note-guidance.md`;
      
      const templatePath = path.join(__dirname, '../../../templates', templateFileName);
      
      if (!fs.existsSync(templatePath)) {
        return {
          content: [{
            type: 'text',
            text: `Template "${input.template}" not found at ${templatePath}`
          }]
        };
      }
      
      // Ensure .a24z directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Copy template to target location
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      fs.writeFileSync(targetFile, templateContent, 'utf8');
      
      return {
        content: [{
          type: 'text',
          text: `Successfully copied "${input.template}" template to ${targetFile}. You can now customize it for your project's specific needs.`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error copying template: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}