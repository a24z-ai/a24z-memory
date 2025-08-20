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
    it('should return repository-specific guidance when it exists', async () => {
      // Create a repository-specific guidance file
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      
      const customGuidance = '# Custom Repository Guidance\n\nThis is project-specific guidance.';
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), customGuidance);

      const result = await tool.handler({ path: repoDir });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(customGuidance);
    });

    it('should return default guidance when repository-specific guidance does not exist', async () => {
      const result = await tool.handler({ path: repoDir });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      // Should contain default guidance content
      expect(result.content[0].text).toContain('Repository Note Guidelines');
      expect(result.content[0].text).toContain('Architecture Decisions');
    });

    it('should return default guidance when no repository-specific guidance exists', async () => {
      // Test without creating any custom guidance - should get default template
      const result = await tool.handler({ path: repoDir });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Repository Note Guidelines');
    });

    it('should work with nested paths within repository', async () => {
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

      expect(result.content[0].text).toBe(customGuidance);
    });

    it('should prioritize repository-specific guidance over default', async () => {
      // Create guidance at repository root
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      
      const customGuidance = '# Custom Project Guidance\n\nThis should override default.';
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), customGuidance);

      const result = await tool.handler({ path: repoDir });

      expect(result.content[0].text).toBe(customGuidance);
      // Should not contain default template content
      expect(result.content[0].text).not.toContain('Repository Note Guidelines');
    });
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('get_repository_guidance');
      expect(tool.description).toBe('Get repository-specific guidance for creating effective notes');
    });

    it('should have proper schema structure', () => {
      const schema = tool.schema;
      expect(schema).toBeDefined();
      expect(schema.shape.path).toBeDefined();
    });
  });
});