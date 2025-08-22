import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { 
  addAllowedTag,
  removeAllowedTag,
  setEnforceAllowedTags,
  getAllowedTags
} from '../../../src/core-mcp/store/notesStore';

describe('Allowed Tags Helper Functions', () => {
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

  describe('addAllowedTag', () => {
    it('should add a tag to empty allowed tags', () => {
      addAllowedTag(testRepoPath, 'feature');
      setEnforceAllowedTags(testRepoPath, true); // Enable enforcement to see tags
      
      const allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.tags).toContain('feature');
      expect(allowedTags.tags).toHaveLength(1);
    });

    it('should not add duplicate tags', () => {
      addAllowedTag(testRepoPath, 'feature');
      addAllowedTag(testRepoPath, 'feature'); // Duplicate
      setEnforceAllowedTags(testRepoPath, true); // Enable enforcement to see tags
      
      const allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.tags).toEqual(['feature']);
    });

    it('should add multiple different tags', () => {
      addAllowedTag(testRepoPath, 'feature');
      addAllowedTag(testRepoPath, 'bug');
      addAllowedTag(testRepoPath, 'security');
      setEnforceAllowedTags(testRepoPath, true); // Enable enforcement to see tags
      
      const allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.tags).toContain('feature');
      expect(allowedTags.tags).toContain('bug');
      expect(allowedTags.tags).toContain('security');
      expect(allowedTags.tags).toHaveLength(3);
    });
  });

  describe('removeAllowedTag', () => {
    it('should remove an existing tag', () => {
      addAllowedTag(testRepoPath, 'feature');
      addAllowedTag(testRepoPath, 'bug');
      setEnforceAllowedTags(testRepoPath, true); // Enable enforcement to see tags
      
      const removed = removeAllowedTag(testRepoPath, 'feature');
      
      expect(removed).toBe(true);
      const allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.tags).not.toContain('feature');
      expect(allowedTags.tags).toContain('bug');
    });

    it('should return false when removing non-existent tag', () => {
      const removed = removeAllowedTag(testRepoPath, 'non-existent');
      
      expect(removed).toBe(false);
    });

    it('should handle empty allowed tags list', () => {
      const removed = removeAllowedTag(testRepoPath, 'feature');
      
      expect(removed).toBe(false);
    });
  });


  describe('setEnforceAllowedTags', () => {
    it('should enable tag enforcement', () => {
      setEnforceAllowedTags(testRepoPath, true);
      
      const allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.enforced).toBe(true);
    });

    it('should disable tag enforcement', () => {
      setEnforceAllowedTags(testRepoPath, true);
      setEnforceAllowedTags(testRepoPath, false);
      
      const allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.enforced).toBe(false);
    });

    it('should default to false for new repositories', () => {
      const allowedTags = getAllowedTags(testRepoPath);
      expect(allowedTags.enforced).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should work together to manage tag restrictions', () => {
      // Start with no restrictions
      const initial = getAllowedTags(testRepoPath);
      expect(initial.enforced).toBe(false);
      expect(initial.tags).toEqual([]);

      // Add some allowed tags
      addAllowedTag(testRepoPath, 'feature');
      addAllowedTag(testRepoPath, 'bug');
      addAllowedTag(testRepoPath, 'security');

      // Enable enforcement
      setEnforceAllowedTags(testRepoPath, true);

      // Verify current state
      const current = getAllowedTags(testRepoPath);
      expect(current.enforced).toBe(true);
      expect(current.tags.sort()).toEqual(['bug', 'feature', 'security']);

      // Remove a tag
      removeAllowedTag(testRepoPath, 'bug');

      // Add new tags individually (since we removed setAllowedTags)
      addAllowedTag(testRepoPath, 'performance');
      addAllowedTag(testRepoPath, 'documentation');

      // Final verification
      const final = getAllowedTags(testRepoPath);
      expect(final.enforced).toBe(true);
      expect(final.tags).toContain('feature');
      expect(final.tags).toContain('performance');
      expect(final.tags).toContain('documentation');
      expect(final.tags).not.toContain('bug');
      expect(final.tags).toContain('security'); // Should still be there
      expect(final.tags).toHaveLength(4); // feature, security, performance, documentation
    });
  });
});