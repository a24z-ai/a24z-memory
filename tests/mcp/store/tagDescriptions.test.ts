import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type { ValidatedRepositoryPath } from '../../../src/pure-core/types';

describe('Tag Descriptions', () => {
  let store: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    // Initialize in-memory filesystem and store
    fs = new InMemoryFileSystemAdapter();
    store = new AnchoredNotesStore(fs);

    // Set up test repository
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
  });

  describe('Basic Operations', () => {
    it('should save and retrieve tag descriptions', () => {
      store.saveTagDescription(
        validatedRepoPath,
        'feature',
        'New functionality added to the system'
      );
      store.saveTagDescription(
        validatedRepoPath,
        'bugfix',
        'Corrections to existing functionality'
      );

      const descriptions = store.getTagDescriptions(validatedRepoPath);

      expect(descriptions['feature']).toBe('New functionality added to the system');
      expect(descriptions['bugfix']).toBe('Corrections to existing functionality');
    });

    it('should update existing tag description', () => {
      store.saveTagDescription(validatedRepoPath, 'feature', 'Original description');
      store.saveTagDescription(validatedRepoPath, 'feature', 'Updated description');

      const descriptions = store.getTagDescriptions(validatedRepoPath);
      expect(descriptions['feature']).toBe('Updated description');
    });

    it('should delete tag descriptions', () => {
      store.saveTagDescription(validatedRepoPath, 'feature', 'Feature description');
      store.saveTagDescription(validatedRepoPath, 'bugfix', 'Bugfix description');

      const deleted = store.deleteTagDescription(validatedRepoPath, 'feature');
      expect(deleted).toBe(true);

      const descriptions = store.getTagDescriptions(validatedRepoPath);
      expect(descriptions['feature']).toBeUndefined();
      expect(descriptions['bugfix']).toBe('Bugfix description');
    });

    it('should return false when deleting non-existent tag', () => {
      const deleted = store.deleteTagDescription(validatedRepoPath, 'non-existent');
      expect(deleted).toBe(false);
    });

    it('should handle empty repository', () => {
      const descriptions = store.getTagDescriptions(validatedRepoPath);
      expect(descriptions).toEqual({});
    });
  });

  describe('Markdown File Storage', () => {
    it('should store tag descriptions as markdown files', () => {
      store.saveTagDescription(
        validatedRepoPath,
        'feature',
        '# Feature Tag\n\nThis tag is used for new functionality.'
      );

      const tagFile = fs.join(testRepoPath, '.a24z', 'tags', 'feature.md');
      expect(fs.exists(tagFile)).toBe(true);

      const content = fs.readFile(tagFile);
      expect(content).toBe('# Feature Tag\n\nThis tag is used for new functionality.');
    });

    it('should enforce description length limit', () => {
      const config = store.getConfiguration(validatedRepoPath);
      const longDescription = 'a'.repeat(config.limits.tagDescriptionMaxLength + 1);

      expect(() => {
        store.saveTagDescription(validatedRepoPath, 'feature', longDescription);
      }).toThrow(/Tag description exceeds maximum length/);
    });

    it('should support markdown content within length limits', () => {
      const markdownContent = `# Feature Tag\n\n## Usage\n- New features\n- Enhancements`;

      store.saveTagDescription(validatedRepoPath, 'feature', markdownContent);

      const descriptions = store.getTagDescriptions(validatedRepoPath);
      expect(descriptions['feature']).toBe(markdownContent);
    });
  });

  describe('File Storage', () => {
    it('should create individual markdown files in .a24z/tags directory', () => {
      store.saveTagDescription(validatedRepoPath, 'feature', 'Test description');
      store.saveTagDescription(validatedRepoPath, 'bugfix', 'Bug fixes');

      const featureFile = fs.join(testRepoPath, '.a24z', 'tags', 'feature.md');
      const bugfixFile = fs.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');

      expect(fs.exists(featureFile)).toBe(true);
      expect(fs.exists(bugfixFile)).toBe(true);

      expect(fs.readFile(featureFile)).toBe('Test description');
      expect(fs.readFile(bugfixFile)).toBe('Bug fixes');
    });

    it('should remove individual markdown files when deleted', () => {
      store.saveTagDescription(validatedRepoPath, 'feature', 'Test description');
      const tagFile = fs.join(testRepoPath, '.a24z', 'tags', 'feature.md');

      expect(fs.exists(tagFile)).toBe(true);

      store.deleteTagDescription(validatedRepoPath, 'feature');

      expect(fs.exists(tagFile)).toBe(false);
    });

    it('should remove tag file when deleted', () => {
      store.saveTagDescription(validatedRepoPath, 'feature', 'Test');
      const tagFile = fs.join(testRepoPath, '.a24z', 'tags', 'feature.md');
      expect(fs.exists(tagFile)).toBe(true);

      store.deleteTagDescription(validatedRepoPath, 'feature');

      // File should be removed
      expect(fs.exists(tagFile)).toBe(false);
      // Note: Directory may remain even when empty
    });

    it('should include current length in error message', () => {
      const longDescription = 'a'.repeat(2500); // Default is 2000

      try {
        store.saveTagDescription(validatedRepoPath, 'feature', longDescription);
        fail('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('Current length: 2500');
        expect((error as Error).message).toContain('exceeds maximum length of 500');
      }
    });
  });

  describe('Integration with Tag Restrictions', () => {
    it('should return tags with descriptions for allowed tags', () => {
      // Set up tag restrictions
      store.updateConfiguration(validatedRepoPath, {
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add descriptions for some tags
      store.saveTagDescription(validatedRepoPath, 'feature', 'New features');
      store.saveTagDescription(validatedRepoPath, 'bugfix', 'Bug fixes');
      store.saveTagDescription(validatedRepoPath, 'security', 'Security improvements');

      const tagsWithDescriptions = store.getTagsWithDescriptions(validatedRepoPath);

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
      store.saveTagDescription(validatedRepoPath, 'custom', 'Custom tag description');
      store.saveTagDescription(validatedRepoPath, 'feature', 'Feature description');

      const tagsWithDescriptions = store.getTagsWithDescriptions(validatedRepoPath);

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
      const tagsWithDescriptions = store.getTagsWithDescriptions(validatedRepoPath);

      expect(tagsWithDescriptions).toHaveLength(0);
    });
  });

  describe('Multiple Repositories', () => {
    it('should isolate descriptions per repository', () => {
      const repo2Path = '/test-repo2';
      fs.setupTestRepo(repo2Path);
      const validatedRepo2Path = MemoryPalace.validateRepositoryPath(fs, repo2Path);

      store.saveTagDescription(validatedRepoPath, 'feature', 'Repo1 feature');
      store.saveTagDescription(validatedRepo2Path, 'feature', 'Repo2 feature');

      const repo1Descriptions = store.getTagDescriptions(validatedRepoPath);
      const repo2Descriptions = store.getTagDescriptions(validatedRepo2Path);

      expect(repo1Descriptions['feature']).toBe('Repo1 feature');
      expect(repo2Descriptions['feature']).toBe('Repo2 feature');
    });
  });
});
