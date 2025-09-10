import { describe, it, expect, beforeEach } from 'bun:test';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type {
  ValidatedRepositoryPath,
  ValidatedAlexandriaPath,
} from '../../../src/pure-core/types';

describe('Tag Descriptions', () => {
  let store: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;
  let alexandriaPath: ValidatedAlexandriaPath;

  beforeEach(() => {
    // Initialize in-memory filesystem and store
    fs = new InMemoryFileSystemAdapter();

    // Set up test repository
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);
    alexandriaPath = MemoryPalace.getAlexandriaPath(validatedRepoPath, fs);

    store = new AnchoredNotesStore(fs, alexandriaPath);
  });

  describe('Basic Operations', () => {
    it('should save and retrieve tag descriptions', () => {
      store.saveTagDescription('feature', 'New functionality added to the system');
      store.saveTagDescription('bugfix', 'Corrections to existing functionality');

      const descriptions = store.getTagDescriptions();

      expect(descriptions['feature']).toBe('New functionality added to the system');
      expect(descriptions['bugfix']).toBe('Corrections to existing functionality');
    });

    it('should update existing tag description', () => {
      store.saveTagDescription('feature', 'Original description');
      store.saveTagDescription('feature', 'Updated description');

      const descriptions = store.getTagDescriptions();
      expect(descriptions['feature']).toBe('Updated description');
    });

    it('should delete tag descriptions', () => {
      store.saveTagDescription('feature', 'Feature description');
      store.saveTagDescription('bugfix', 'Bugfix description');

      const deleted = store.deleteTagDescription('feature');
      expect(deleted).toBe(true);

      const descriptions = store.getTagDescriptions();
      expect(descriptions['feature']).toBeUndefined();
      expect(descriptions['bugfix']).toBe('Bugfix description');
    });

    it('should return false when deleting non-existent tag', () => {
      const deleted = store.deleteTagDescription('non-existent');
      expect(deleted).toBe(false);
    });

    it('should handle empty repository', () => {
      const descriptions = store.getTagDescriptions();
      expect(descriptions).toEqual({});
    });
  });

  describe('Markdown File Storage', () => {
    it('should store tag descriptions as markdown files', () => {
      store.saveTagDescription(
        'feature',
        '# Feature Tag\n\nThis tag is used for new functionality.'
      );

      const tagFile = fs.join(testRepoPath, '.a24z', 'tags', 'feature.md');
      expect(fs.exists(tagFile)).toBe(true);

      const content = fs.readFile(tagFile);
      expect(content).toBe('# Feature Tag\n\nThis tag is used for new functionality.');
    });

    it('should enforce description length limit', () => {
      const config = store.getConfiguration();
      const longDescription = 'a'.repeat(config.limits.tagDescriptionMaxLength + 1);

      expect(() => {
        store.saveTagDescription('feature', longDescription);
      }).toThrow(/Tag description exceeds maximum length/);
    });

    it('should support markdown content within length limits', () => {
      const markdownContent = `# Feature Tag\n\n## Usage\n- New features\n- Enhancements`;

      store.saveTagDescription('feature', markdownContent);

      const descriptions = store.getTagDescriptions();
      expect(descriptions['feature']).toBe(markdownContent);
    });
  });

  describe('File Storage', () => {
    it('should create individual markdown files in .a24z/tags directory', () => {
      store.saveTagDescription('feature', 'Test description');
      store.saveTagDescription('bugfix', 'Bug fixes');

      const featureFile = fs.join(testRepoPath, '.a24z', 'tags', 'feature.md');
      const bugfixFile = fs.join(testRepoPath, '.a24z', 'tags', 'bugfix.md');

      expect(fs.exists(featureFile)).toBe(true);
      expect(fs.exists(bugfixFile)).toBe(true);

      expect(fs.readFile(featureFile)).toBe('Test description');
      expect(fs.readFile(bugfixFile)).toBe('Bug fixes');
    });

    it('should remove individual markdown files when deleted', () => {
      store.saveTagDescription('feature', 'Test description');
      const tagFile = fs.join(testRepoPath, '.a24z', 'tags', 'feature.md');

      expect(fs.exists(tagFile)).toBe(true);

      store.deleteTagDescription('feature');

      expect(fs.exists(tagFile)).toBe(false);
    });

    it('should remove tag file when deleted', () => {
      store.saveTagDescription('feature', 'Test');
      const tagFile = fs.join(testRepoPath, '.a24z', 'tags', 'feature.md');
      expect(fs.exists(tagFile)).toBe(true);

      store.deleteTagDescription('feature');

      // File should be removed
      expect(fs.exists(tagFile)).toBe(false);
      // Note: Directory may remain even when empty
    });

    it('should include current length in error message', () => {
      const longDescription = 'a'.repeat(2500); // Default is 2000

      try {
        store.saveTagDescription('feature', longDescription);
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
      store.updateConfiguration({
        tags: {
          enforceAllowedTags: true,
        },
      });

      // Add descriptions for some tags
      store.saveTagDescription('feature', 'New features');
      store.saveTagDescription('bugfix', 'Bug fixes');
      store.saveTagDescription('security', 'Security improvements');

      const tagsWithDescriptions = store.getTagsWithDescriptions();

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
      store.saveTagDescription('custom', 'Custom tag description');
      store.saveTagDescription('feature', 'Feature description');

      const tagsWithDescriptions = store.getTagsWithDescriptions();

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
      const tagsWithDescriptions = store.getTagsWithDescriptions();

      expect(tagsWithDescriptions).toHaveLength(0);
    });
  });

  describe('Multiple Repositories', () => {
    it('should isolate descriptions per repository', () => {
      const repo2Path = '/test-repo2';
      fs.setupTestRepo(repo2Path);
      const validatedRepo2Path = MemoryPalace.validateRepositoryPath(fs, repo2Path);
      const repo2AlexandriaPath = MemoryPalace.getAlexandriaPath(validatedRepo2Path, fs);
      const store2 = new AnchoredNotesStore(fs, repo2AlexandriaPath);

      store.saveTagDescription('feature', 'Repo1 feature');
      store2.saveTagDescription('feature', 'Repo2 feature');

      const repo1Descriptions = store.getTagDescriptions();
      const repo2Descriptions = store2.getTagDescriptions();

      expect(repo1Descriptions['feature']).toBe('Repo1 feature');
      expect(repo2Descriptions['feature']).toBe('Repo2 feature');
    });
  });
});
