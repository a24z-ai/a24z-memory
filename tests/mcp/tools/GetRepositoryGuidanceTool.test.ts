import { describe, it, expect, beforeEach } from 'bun:test';
import { GetRepositoryGuidanceTool } from '../../../src/mcp/tools/GetRepositoryGuidanceTool';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';

describe('GetRepositoryGuidanceTool', () => {
  let tool: GetRepositoryGuidanceTool;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    tool = new GetRepositoryGuidanceTool(fs);
    fs.setupTestRepo(testRepoPath);
    MemoryPalace.validateRepositoryPath(fsRepoPath);
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
      // Create a repository-specific guidance file
      const a24zDir = fs.join(testRepoPath, '.a24z');
      fs.createDir(a24zDir);

      const customGuidance = '# Custom Repository Guidance\n\nThis is project-specific guidance.';
      fs.writeFile(fs.join(a24zDir, 'note-guidance.md'), customGuidance);

      const result = await tool.handler({ path: testRepoPath });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const data = JSON.parse(result.content[0].text as string);
      // Check for main sections
      expect(data.guidance).toContain(customGuidance);
      expect(data.configuration).toBeDefined();
      expect(data.configuration.allowedTags).toBeDefined();
      expect(data.configuration.tagDescriptions).toBeDefined();
    });

    it('should show configuration with default guidance when no custom exists', async () => {
      const result = await tool.handler({ path: testRepoPath });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const data = JSON.parse(result.content[0].text as string);
      // Should still show configuration sections
      expect(data.guidance).toBeDefined();
      expect(data.configuration).toBeDefined();
      expect(data.configuration.allowedTags).toBeDefined();
      expect(data.configuration.tagDescriptions).toBeDefined();
      // When no custom guidance exists, it shows the default template
      expect(data.guidance).toContain('Note Creation Guidelines');
    });

    it('should work with nested paths within repository', async () => {
      // Create a nested directory structure
      const nestedDir = fs.join(testRepoPath, 'src', 'components');
      fs.createDir(nestedDir);

      // Create guidance at repository root
      const a24zDir = fs.join(testRepoPath, '.a24z');
      fs.createDir(a24zDir);

      const customGuidance = '# Repo Guidance from Root';
      fs.writeFile(fs.join(a24zDir, 'note-guidance.md'), customGuidance);

      // Test with nested path
      const result = await tool.handler({ path: nestedDir });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.guidance).toContain(customGuidance);
      expect(data.configuration).toBeDefined();
    });

    it('should include tag descriptions when available', async () => {
      // Create tag descriptions as markdown files
      const a24zDir = fs.join(testRepoPath, '.a24z');
      const tagsDir = fs.join(a24zDir, 'tags');
      fs.createDir(tagsDir);

      fs.writeFile(fs.join(tagsDir, 'feature.md'), 'New functionality');
      fs.writeFile(fs.join(tagsDir, 'bugfix.md'), 'Bug corrections');

      const result = await tool.handler({ path: testRepoPath });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.configuration.tagDescriptions.feature).toBe('New functionality');
      expect(data.configuration.tagDescriptions.bugfix).toBe('Bug corrections');
    });
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('get_repository_guidance');
      expect(tool.description).toBe(
        'Get comprehensive repository configuration including note guidance, tag restrictions, and tag descriptions'
      );
    });

    it('should have proper schema structure', () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();
      expect(schema.shape.path).toBeDefined();
    });
  });
});
