import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { 
  saveTagDescription,
  getTagDescriptions,
  deleteTagDescription,
  getTagsWithDescriptions,
  updateRepositoryConfiguration,
  getRepositoryConfiguration
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

  describe('Length Validation', () => {
    it('should respect default tagDescriptionMaxLength', () => {
      const longDescription = 'A'.repeat(501);  // Default is 500
      
      expect(() => {
        saveTagDescription(testRepoPath, 'feature', longDescription);
      }).toThrow('Tag description exceeds maximum length of 500 characters');
    });

    it('should respect custom tagDescriptionMaxLength', () => {
      // Update configuration with custom limit
      updateRepositoryConfiguration(testRepoPath, {
        limits: {
          tagDescriptionMaxLength: 100
        }
      });
      
      const validDescription = 'A'.repeat(100);
      const invalidDescription = 'A'.repeat(101);
      
      // Should accept exactly 100 characters
      saveTagDescription(testRepoPath, 'feature', validDescription);
      
      // Should reject 101 characters
      expect(() => {
        saveTagDescription(testRepoPath, 'bugfix', invalidDescription);
      }).toThrow('Tag description exceeds maximum length of 100 characters');
    });

    it('should include current length in error message', () => {
      const description = 'A'.repeat(600);
      
      try {
        saveTagDescription(testRepoPath, 'feature', description);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Current length: 600');
      }
    });
  });

  describe('File Storage', () => {
    it('should create tags.json file in .a24z directory', () => {
      saveTagDescription(testRepoPath, 'feature', 'Test description');
      
      const tagsFile = path.join(testRepoPath, '.a24z', 'tags.json');
      expect(fs.existsSync(tagsFile)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(tagsFile, 'utf8'));
      expect(content).toEqual({
        feature: 'Test description'
      });
    });

    it('should remove tags.json when all descriptions are deleted', () => {
      saveTagDescription(testRepoPath, 'feature', 'Test description');
      const tagsFile = path.join(testRepoPath, '.a24z', 'tags.json');
      
      expect(fs.existsSync(tagsFile)).toBe(true);
      
      deleteTagDescription(testRepoPath, 'feature');
      
      expect(fs.existsSync(tagsFile)).toBe(false);
    });

    it('should handle corrupted tags.json gracefully', () => {
      const tagsFile = path.join(testRepoPath, '.a24z', 'tags.json');
      fs.mkdirSync(path.dirname(tagsFile), { recursive: true });
      fs.writeFileSync(tagsFile, 'invalid json content');
      
      const descriptions = getTagDescriptions(testRepoPath);
      expect(descriptions).toEqual({});
    });
  });

  describe('Integration with Tag Restrictions', () => {
    it('should return tags with descriptions for allowed tags', () => {
      // Set up tag restrictions
      updateRepositoryConfiguration(testRepoPath, {
        tags: {
          allowedTags: ['feature', 'bugfix', 'security'],
          enforceAllowedTags: true
        }
      });
      
      // Add descriptions for some tags
      saveTagDescription(testRepoPath, 'feature', 'New features');
      saveTagDescription(testRepoPath, 'security', 'Security improvements');
      saveTagDescription(testRepoPath, 'other', 'Should not appear');  // Not in allowed list
      
      const tagsWithDescriptions = getTagsWithDescriptions(testRepoPath);
      
      // Should only include allowed tags
      expect(tagsWithDescriptions).toHaveLength(3);
      expect(tagsWithDescriptions).toContainEqual({
        name: 'feature',
        description: 'New features'
      });
      expect(tagsWithDescriptions).toContainEqual({
        name: 'bugfix',
        description: undefined  // No description set
      });
      expect(tagsWithDescriptions).toContainEqual({
        name: 'security',
        description: 'Security improvements'
      });
    });

    it('should include common tags when no restrictions', () => {
      // No tag restrictions
      saveTagDescription(testRepoPath, 'custom', 'Custom tag description');
      
      const tagsWithDescriptions = getTagsWithDescriptions(testRepoPath);
      
      // Should include custom tag
      const customTag = tagsWithDescriptions.find(t => t.name === 'custom');
      expect(customTag).toBeDefined();
      expect(customTag?.description).toBe('Custom tag description');
      
      // Should also include common tags
      const featureTag = tagsWithDescriptions.find(t => t.name === 'feature');
      expect(featureTag).toBeDefined();
      expect(featureTag?.description).toBe('Feature work');  // Default from getCommonTags
    });

    it('should override common tag descriptions with custom ones', () => {
      saveTagDescription(testRepoPath, 'feature', 'Custom feature description');
      
      const tagsWithDescriptions = getTagsWithDescriptions(testRepoPath);
      
      const featureTag = tagsWithDescriptions.find(t => t.name === 'feature');
      expect(featureTag?.description).toBe('Custom feature description');
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