import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { GetRepositoryGuidanceTool } from '../../../src/core-mcp/tools/GetRepositoryGuidanceTool';

describe('GetRepositoryGuidanceTool', () => {
  let tool: GetRepositoryGuidanceTool;
  let tempDir: string;
  let repoDir: string;

  beforeEach(() => {
    tool = new GetRepositoryGuidanceTool();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guidance-test-'));
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
    it('should validate valid input', () => {
      const validInput = { path: '/some/path' };
      expect(() => tool.schema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid input', () => {
      expect(() => tool.schema.parse({})).toThrow();
      expect(() => tool.schema.parse({ path: 123 })).toThrow();
    });
  });

  describe('execute', () => {
    it('should return comprehensive configuration including guidance', async () => {
      // Create a .git directory to make it a valid repository
      fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
      
      // Create a repository-specific guidance file
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      
      const customGuidance = '# Custom Repository Guidance\n\nThis is project-specific guidance.';
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), customGuidance);

      const result = await tool.handler({ path: repoDir });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text as string;
      // Check for main sections
      expect(text).toContain('# Repository Note Configuration');
      expect(text).toContain('## Configuration Limits');
      expect(text).toContain('## Tag Restrictions');
      expect(text).toContain('## Note Guidance');
      expect(text).toContain(customGuidance);
      expect(text).toContain('## Summary');
    });

    it('should show configuration with default guidance when no custom exists', async () => {
      // Create a .git directory to make it a valid repository
      fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
      
      const result = await tool.handler({ path: repoDir });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text as string;
      // Should still show configuration sections
      expect(text).toContain('# Repository Note Configuration');
      expect(text).toContain('## Configuration Limits');
      expect(text).toContain('## Tag Restrictions');
      expect(text).toContain('## Note Guidance');
      // When no custom guidance exists, it shows the default template
      expect(text).toContain('Repository Note Guidelines');
    });

    it('should work with nested paths within repository', async () => {
      // Create a .git directory to make it a valid repository
      fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
      
      // Create a nested directory structure
      const nestedDir = path.join(repoDir, 'src', 'components');
      fs.mkdirSync(nestedDir, { recursive: true });

      // Create guidance at repository root
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      
      const customGuidance = '# Repo Guidance from Root';
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), customGuidance);

      // Test with nested path
      const result = await tool.handler({ path: nestedDir });

      const text = result.content[0].text as string;
      expect(text).toContain('# Repository Note Configuration');
      expect(text).toContain(customGuidance);
    });

    it('should include tag descriptions when available', async () => {
      // Create a .git directory to make it a valid repository
      fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
      
      // Create tag descriptions
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      
      const tagDescriptions = {
        'feature': 'New functionality',
        'bugfix': 'Bug corrections'
      };
      fs.writeFileSync(path.join(a24zDir, 'tags.json'), JSON.stringify(tagDescriptions, null, 2));

      const result = await tool.handler({ path: repoDir });

      const text = result.content[0].text as string;
      expect(text).toContain('feature');
      expect(text).toContain('New functionality');
      expect(text).toContain('bugfix');
      expect(text).toContain('Bug corrections');
    });
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('get_repository_guidance');
      expect(tool.description).toBe('Get comprehensive repository configuration including note guidance, tag restrictions, and tag descriptions');
    });

    it('should have proper schema structure', () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();
      expect(schema.shape.path).toBeDefined();
    });
  });
});