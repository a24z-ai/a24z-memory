import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getRepositoryGuidance } from '../../../src/core-mcp/store/notesStore';

describe('Repository Guidance Fallback Logic', () => {
  let tempDir: string;
  let repoDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guidance-fallback-test-'));
    repoDir = path.join(tempDir, 'test-repo');
    fs.mkdirSync(repoDir, { recursive: true });
    
    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
    
    // Create a package.json to make it look like a proper project root
    fs.writeFileSync(path.join(repoDir, 'package.json'), '{}');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getRepositoryGuidance', () => {
    it('should return repository-specific guidance when it exists', () => {
      // Create repository-specific guidance
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      
      const customGuidance = '# Custom Repository Guidance\n\nThis is project-specific guidance.';
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), customGuidance);

      const result = getRepositoryGuidance(repoDir);
      expect(result).toBe(customGuidance);
    });

    it('should fallback to bundled default template when no repository guidance exists', () => {
      const result = getRepositoryGuidance(repoDir);
      
      // Should return content from the bundled default template
      expect(result).toBeTruthy();
      expect(result).toContain('Repository Note Guidelines');
      expect(result).toContain('Architecture Decisions');
      expect(result).toContain('Bug Fixes & Gotchas');
      expect(result).toContain('Implementation Patterns');
    });

    it('should verify bundled templates exist and have correct content', () => {
      // Test that all bundled templates exist and have expected content
      const templatesDir = path.join(__dirname, '../../../templates');
      
      const templates = [
        { file: 'default-note-guidance.md', expectedContent: 'Repository Note Guidelines' },
        { file: 'react-typescript-note-guidance.md', expectedContent: 'React TypeScript Project Note Guidelines' },
        { file: 'nodejs-api-note-guidance.md', expectedContent: 'Node.js API Project Note Guidelines' },
        { file: 'python-data-science-note-guidance.md', expectedContent: 'Python Data Science Project Note Guidelines' }
      ];

      templates.forEach(({ file, expectedContent }) => {
        const templatePath = path.join(templatesDir, file);
        expect(fs.existsSync(templatePath)).toBe(true);
        
        const content = fs.readFileSync(templatePath, 'utf8');
        expect(content).toContain(expectedContent);
        expect(content.length).toBeGreaterThan(100); // Ensure it's not empty
      });
    });

    it('should demonstrate fallback behavior works correctly', () => {
      // Test that when no repository guidance exists, we get default template
      const result = getRepositoryGuidance(repoDir);
      
      // Should contain default template content, not null
      expect(result).toBeTruthy();
      expect(result).toContain('Repository Note Guidelines');
    });

    it('should handle path normalization correctly', () => {
      // Create guidance at repository root
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      
      const customGuidance = '# Root Level Guidance';
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), customGuidance);

      // Test with nested path - should still find guidance at repo root
      const nestedPath = path.join(repoDir, 'src', 'components');
      fs.mkdirSync(nestedPath, { recursive: true });

      const result = getRepositoryGuidance(nestedPath);
      expect(result).toBe(customGuidance);
    });

    it('should handle directory traversal correctly', () => {
      // Test that nested paths can find repository root guidance
      const nestedDir = path.join(repoDir, 'src', 'deeply', 'nested', 'path');
      fs.mkdirSync(nestedDir, { recursive: true });

      // When no guidance exists anywhere, should get default template
      const result1 = getRepositoryGuidance(nestedDir);
      expect(result1).toContain('Repository Note Guidelines');

      // Create guidance at repository root
      const a24zDir = path.join(repoDir, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      const customGuidance = '# Custom Root Guidance';
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), customGuidance);

      // Now nested path should find the custom guidance
      const result2 = getRepositoryGuidance(nestedDir);
      expect(result2).toBe(customGuidance);
    });
  });

  describe('template content validation', () => {
    it('should verify default template has comprehensive structure', () => {
      const result = getRepositoryGuidance(repoDir);
      
      expect(result).toContain('# Repository Note Guidelines');
      expect(result).toContain('## Preferred Note Types');
      expect(result).toContain('## Preferred Tags');
      expect(result).toContain('## Note Quality Guidelines');
      expect(result).toContain('Architecture Decisions');
      expect(result).toContain('Bug Fixes & Gotchas');
      expect(result).toContain('Implementation Patterns');
      expect(result).toContain('Performance Insights');
    });

    it('should verify template includes practical examples', () => {
      const result = getRepositoryGuidance(repoDir);
      
      // Should have concrete examples and guidance
      expect(result).toContain('Example');
      expect(result).toContain('**Tags**:');
      expect(result).toContain('**Be specific**:');
      expect(result).toContain('```');  // Just check for code blocks, not specific text
    });

    it('should verify template has appropriate tags structure', () => {
      const result = getRepositoryGuidance(repoDir);
      
      // Should include common tag categories
      expect(result).toContain('frontend');
      expect(result).toContain('backend');
      expect(result).toContain('authentication');
      expect(result).toContain('security');
      expect(result).toContain('testing');
      expect(result).toContain('performance');
    });
  });
});