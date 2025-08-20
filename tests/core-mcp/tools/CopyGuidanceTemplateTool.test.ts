import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { CopyGuidanceTemplateTool } from '../../../src/core-mcp/tools/CopyGuidanceTemplateTool';

describe('CopyGuidanceTemplateTool', () => {
  let tool: CopyGuidanceTemplateTool;
  let tempDir: string;
  let repoDir: string;

  beforeEach(() => {
    tool = new CopyGuidanceTemplateTool();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-template-test-'));
    repoDir = path.join(tempDir, 'test-repo');
    fs.mkdirSync(repoDir, { recursive: true });
    
    // Create a package.json to make it look like a proper project root
    fs.writeFileSync(path.join(repoDir, 'package.json'), '{}');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('schema validation', () => {
    it('should validate valid input with all parameters', () => {
      const validInput = {
        path: '/some/path',
        template: 'react-typescript' as const,
        overwrite: true
      };
      expect(() => tool.schema.parse(validInput)).not.toThrow();
    });

    it('should validate minimal input with defaults', () => {
      const validInput = { path: '/some/path' };
      const parsed = tool.schema.parse(validInput);
      expect(parsed.template).toBe('default');
      expect(parsed.overwrite).toBe(false);
    });

    it('should reject invalid template types', () => {
      const invalidInput = {
        path: '/some/path',
        template: 'invalid-template'
      };
      expect(() => tool.schema.parse(invalidInput)).toThrow();
    });

    it('should reject missing path', () => {
      expect(() => tool.schema.parse({})).toThrow();
    });
  });

  describe('execute', () => {
    it('should copy default template successfully', async () => {
      const result = await tool.handler({ path: repoDir });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully copied "default" template');

      // Verify file was created
      const guidanceFile = path.join(repoDir, '.a24z', 'note-guidance.md');
      expect(fs.existsSync(guidanceFile)).toBe(true);

      // Verify content
      const content = fs.readFileSync(guidanceFile, 'utf8');
      expect(content).toContain('Repository Note Guidelines');
      expect(content).toContain('Architecture Decisions');
    });

    it('should copy react-typescript template successfully', async () => {
      const result = await tool.handler({ 
        path: repoDir, 
        template: 'react-typescript' 
      });

      expect(result.content[0].text).toContain('Successfully copied "react-typescript" template');

      const guidanceFile = path.join(repoDir, '.a24z', 'note-guidance.md');
      const content = fs.readFileSync(guidanceFile, 'utf8');
      expect(content).toContain('React TypeScript Project Note Guidelines');
      expect(content).toContain('Custom Hook Pattern');
    });

    it('should copy nodejs-api template successfully', async () => {
      const result = await tool.handler({ 
        path: repoDir, 
        template: 'nodejs-api' 
      });

      expect(result.content[0].text).toContain('Successfully copied "nodejs-api" template');

      const guidanceFile = path.join(repoDir, '.a24z', 'note-guidance.md');
      const content = fs.readFileSync(guidanceFile, 'utf8');
      expect(content).toContain('Node.js API Project Note Guidelines');
      expect(content).toContain('API Architecture Decisions');
    });

    it('should copy python-data-science template successfully', async () => {
      const result = await tool.handler({ 
        path: repoDir, 
        template: 'python-data-science' 
      });

      expect(result.content[0].text).toContain('Successfully copied "python-data-science" template');

      const guidanceFile = path.join(repoDir, '.a24z', 'note-guidance.md');
      const content = fs.readFileSync(guidanceFile, 'utf8');
      expect(content).toContain('Python Data Science Project Note Guidelines');
      expect(content).toContain('Model Development');
    });

    it('should refuse to overwrite existing file without overwrite flag', async () => {
      // Create existing guidance file
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), 'existing content');

      const result = await tool.handler({ path: repoDir });

      expect(result.content[0].text).toContain('Guidance file already exists');
      expect(result.content[0].text).toContain('Use overwrite: true');

      // Verify original content is preserved
      const content = fs.readFileSync(path.join(a24zDir, 'note-guidance.md'), 'utf8');
      expect(content).toBe('existing content');
    });

    it('should overwrite existing file when overwrite flag is true', async () => {
      // Create existing guidance file
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), 'existing content');

      const result = await tool.handler({ 
        path: repoDir, 
        template: 'react-typescript',
        overwrite: true 
      });

      expect(result.content[0].text).toContain('Successfully copied "react-typescript" template');

      // Verify content was replaced
      const content = fs.readFileSync(path.join(a24zDir, 'note-guidance.md'), 'utf8');
      expect(content).toContain('React TypeScript Project Note Guidelines');
      expect(content).not.toContain('existing content');
    });

    it('should create .a24z directory if it does not exist', async () => {
      const a24zDir = path.join(repoDir, '.a24z');
      expect(fs.existsSync(a24zDir)).toBe(false);

      await tool.handler({ path: repoDir });

      expect(fs.existsSync(a24zDir)).toBe(true);
      expect(fs.existsSync(path.join(a24zDir, 'note-guidance.md'))).toBe(true);
    });

    it('should work with nested paths within repository', async () => {
      const nestedDir = path.join(repoDir, 'src', 'components');
      fs.mkdirSync(nestedDir, { recursive: true });

      const result = await tool.handler({ path: nestedDir });

      expect(result.content[0].text).toContain('Successfully copied');

      // Should create guidance at repository root, not nested location
      const guidanceFile = path.join(repoDir, '.a24z', 'note-guidance.md');
      expect(fs.existsSync(guidanceFile)).toBe(true);
    });

    it('should verify all bundled templates exist', () => {
      // Verify that all the templates we reference actually exist
      const templatesDir = path.join(__dirname, '../../../templates');
      
      const templates = [
        'default-note-guidance.md',
        'react-typescript-note-guidance.md',
        'nodejs-api-note-guidance.md',
        'python-data-science-note-guidance.md'
      ];

      templates.forEach(template => {
        const templatePath = path.join(templatesDir, template);
        expect(fs.existsSync(templatePath)).toBe(true);
      });
    });
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('copy_guidance_template');
      expect(tool.description).toBe('Copy a note guidance template to your repository\'s .a24z directory');
    });

    it('should have proper schema structure with all template options', () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();
      expect(schema.shape.path).toBeDefined();
      expect(schema.shape.template).toBeDefined();
      expect(schema.shape.overwrite).toBeDefined();

      // Test all template enum values
      const templateOptions = ['default', 'react-typescript', 'nodejs-api', 'python-data-science'];
      templateOptions.forEach(template => {
        expect(() => schema.parse({ 
          path: '/test', 
          template: template as any 
        })).not.toThrow();
      });
    });
  });
});