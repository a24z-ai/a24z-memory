import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  saveTagDescription,
  getTagDescriptions,
  deleteTagDescription,
  getTagsWithDescriptions,
  updateRepositoryConfiguration,
  getRepositoryConfiguration,
} from '../../../src/core-mcp/store/notesStore';

describe('Tag Descriptions', () => {
  let tempDir: string;
  let testRepoPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Basic Operations', () => {
    it('should save and retrieve tag descriptions', () => {
      saveTagDescription(testRepoPath, 'feature', 'New functionality added to the system');
      saveTagDescription(testRepoPath, 'bugfix', 'Corrections to existing functionality');

      const descriptions = getTagDescriptions(testRepoPath);

      expect(descriptions['feature']).toBe('New functionality added to the system');
      expect(descriptions['bugfix']).toBe('Corrections to existing functionality');
    });

    it('should update existing tag description', () => {
      saveTagDescription(testRepoPath, 'feature', 'Original description');
      saveTagDescription(testRepoPath, 'feature', 'Updated description');

      const descriptions = getTagDescriptions(testRepoPath);
      expect(descriptions['feature']).toBe('Updated description');
    });

    it('should delete tag descriptions', () => {
      saveTagDescription(testRepoPath, 'feature', 'Feature description');
      saveTagDescription(testRepoPath, 'bugfix', 'Bugfix description');

      const deleted = deleteTagDescription(testRepoPath, 'feature');
      expect(deleted).toBe(true);

      const descriptions = getTagDescriptions(testRepoPath);
      expect(descriptions['feature']).toBeUndefined();
      expect(descriptions['bugfix']).toBe('Bugfix description');
    });

    it('should return false when deleting non-existent tag', () => {
      const deleted = deleteTagDescription(testRepoPath, 'non-existent');
      expect(deleted).toBe(false);
    });

    it('should handle empty repository', () => {
      const descriptions = getTagDescriptions(testRepoPath);
      expect(descriptions).toEqual({});
    });
  });

  describe('Markdown File Storage', () => {
    it('should store tag descriptions as markdown files', () => {
      saveTagDescription(
        testRepoPath,
        'feature',
        '# Feature Tag\n\nThis tag is used for new functionality.'
      );

      const tagFile = path.join(testRepoPath, '.a24z', 'tags', 'feature.md');
      expect(fs.existsSync(tagFile)).toBe(true);

      const content = fs.readFileSync(tagFile, 'utf8');
      expect(content).toBe('# Feature Tag\n\nThis tag is used for new functionality.');
    });

    it('should enforce description length limit', () => {
      const config = getRepositoryConfiguration(testRepoPath);
      const longDescription = 'a'.repeat(config.limits.tagDescriptionMaxLength + 1);

      expect(() => {
        saveTagDescription(testRepoPath, 'feature', longDescription);
      }).toThrow(/Tag description exceeds maximum length/);
    });

    it('should support markdown content within length limits', () => {
      const markdownContent = `# Feature Tag\n\n## Usage\n- New features\n- Enhancements`;

      saveTagDescription(testRepoPath, 'feature', markdownContent);

      const descriptions = getTagDescriptions(testRepoPath);
      expect(descriptions['feature']).toBe(markdownContent);
    });
  });

  describe('File Storage', () => {
    it('should create individual markdown files in .a24z/tags directory', () => {
      saveTagDescription(testRepoPath, 'feature', 'Test description');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');

      const featureFile = path.join(testRepoPath, '.a24z', 'tags', 'feature.md');
      const bugfixFile = path.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');

      expect(fs.existsSync(featureFile)).toBe(true);
      expect(fs.existsSync(bugfixFile)).toBe(true);

      expect(fs.readFileSync(featureFile, 'utf8')).toBe('Test description');
      expect(fs.readFileSync(bugfixFile, 'utf8')).toBe('Bug fixes');
    });

    it('should remove individual markdown files when deleted', () => {
      saveTagDescription(testRepoPath, 'feature', 'Test description');
      const tagFile = path.join(testRepoPath, '.a24z', 'tags', 'feature.md');

      expect(fs.existsSync(tagFile)).toBe(true);

      deleteTagDescription(testRepoPath, 'feature');

      expect(fs.existsSync(tagFile)).toBe(false);
    });

    it('should clean up empty tags directory', () => {
      saveTagDescription(testRepoPath, 'feature', 'Test');
      const tagsDir = path.join(testRepoPath, '.a24z', 'tags');
      expect(fs.existsSync(tagsDir)).toBe(true);

      deleteTagDescription(testRepoPath, 'feature');

      // Directory should be removed when empty
      expect(fs.existsSync(tagsDir)).toBe(false);
    });

    it('should include current length in error message', () => {
      const longDescription = 'a'.repeat(2500); // Default is 2000

      try {
        saveTagDescription(testRepoPath, 'feature', longDescription);
        fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('Current length: 2500');
        expect((error as Error).message).toContain('exceeds maximum length of 2000');
      }
    });
  });

  describe('Integration with Tag Restrictions', () => {
    it('should return tags with descriptions for allowed tags', () => {
      // Set up tag restrictions
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add descriptions for some tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'bugfix', 'Bug fixes');
      saveTagDescription(testRepoPath, 'security', 'Security improvements');

      const tagsWithDescriptions = getTagsWithDescriptions(testRepoPath);

      // Should include all tags with descriptions
      expect(tagsWithDescriptions).toHaveLength(3);
      expect(tagsWithDescriptions).toContainEqual({
        name: 'feature',
        description: 'New features',
      });
      expect(tagsWithDescriptions).toContainEqual({
        name: 'bugfix',
        description: 'Bug fixes',
      });
      expect(tagsWithDescriptions).toContainEqual({
        name: 'security',
        description: 'Security improvements',
      });
    });

    it('should only include tags with descriptions when no restrictions', () => {
      // No tag restrictions
      saveTagDescription(testRepoPath, 'custom', 'Custom tag description');
      saveTagDescription(testRepoPath, 'feature', 'Feature description');

      const tagsWithDescriptions = getTagsWithDescriptions(testRepoPath);

      expect(tagsWithDescriptions).toHaveLength(2);

      // Should include custom tag
      const customTag = tagsWithDescriptions.find((t) => t.name === 'custom');
      expect(customTag).toBeDefined();
      expect(customTag?.description).toBe('Custom tag description');

      // Should include user-defined feature tag
      const featureTag = tagsWithDescriptions.find((t) => t.name === 'feature');
      expect(featureTag).toBeDefined();
      expect(featureTag?.description).toBe('Feature description');
    });

    it('should handle empty results when no descriptions exist', () => {
      // No tag descriptions created
      const tagsWithDescriptions = getTagsWithDescriptions(testRepoPath);

      expect(tagsWithDescriptions).toHaveLength(0);
    });
  });

  describe('Multiple Repositories', () => {
    it('should isolate descriptions per repository', () => {
      const repo2Path = path.join(tempDir, 'test-repo2');
      fs.mkdirSync(repo2Path, { recursive: true });
      fs.mkdirSync(path.join(repo2Path, '.git'), { recursive: true });

      saveTagDescription(testRepoPath, 'feature', 'Repo1 feature');
      saveTagDescription(repo2Path, 'feature', 'Repo2 feature');

      const repo1Descriptions = getTagDescriptions(testRepoPath);
      const repo2Descriptions = getTagDescriptions(repo2Path);

      expect(repo1Descriptions['feature']).toBe('Repo1 feature');
      expect(repo2Descriptions['feature']).toBe('Repo2 feature');
    });
  });
});
