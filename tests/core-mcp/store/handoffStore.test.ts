import * as fs from 'fs';
import * as path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import {
  saveHandoffBrief,
  getHandoffBriefs,
  getHandoffContent,
  deleteHandoffBrief,
  type CreateHandoffParams,
} from '../../../src/core-mcp/store/handoffStore';

describe('handoffStore', () => {
  let testDir: string;
  let repoDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await mkdtemp(path.join(tmpdir(), 'handoff-test-'));
    repoDir = path.join(testDir, 'test-repo');

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    await rm(testDir, { recursive: true, force: true });
  });

  describe('saveHandoffBrief', () => {
    it('should save a handoff brief with correct structure', () => {
      const params: CreateHandoffParams = {
        title: 'OAuth Migration',
        overview: 'Migrating from JWT to OAuth with PKCE',
        references: [
          {
            anchor: 'src/auth/oauth.ts',
            context: 'New OAuth implementation with PKCE flow',
          },
          {
            anchor: 'tests/auth/oauth.test.ts',
            context: 'Tests need to be updated for new flow',
          },
        ],
        directoryPath: repoDir,
      };

      const result = saveHandoffBrief(params);

      // Check return value
      expect(result.id).toMatch(/^handoff-\d+-[a-z0-9]{8}$/);
      expect(result.timestamp).toBeCloseTo(Date.now(), -2); // within 100ms
      expect(result.filepath).toContain('.a24z/handoffs');

      // Check file was created
      expect(fs.existsSync(result.filepath)).toBe(true);

      // Check file content
      const content = fs.readFileSync(result.filepath, 'utf8');
      expect(content).toContain('# OAuth Migration');
      expect(content).toContain('## Overview');
      expect(content).toContain('Migrating from JWT to OAuth with PKCE');
      expect(content).toContain('## Code & Context');
      expect(content).toContain('`src/auth/oauth.ts`');
      expect(content).toContain('- New OAuth implementation with PKCE flow');
      expect(content).toContain('`tests/auth/oauth.test.ts`');
      expect(content).toContain('- Tests need to be updated for new flow');
    });

    it('should create year/month directory structure', () => {
      const params: CreateHandoffParams = {
        title: 'Test Handoff',
        overview: 'Test overview',
        references: [],
        directoryPath: repoDir,
      };

      const result = saveHandoffBrief(params);

      const date = new Date(result.timestamp);
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');

      const expectedDir = path.join(repoDir, '.a24z', 'handoffs', year, month);
      expect(fs.existsSync(expectedDir)).toBe(true);
      expect(result.filepath).toContain(path.join(year, month));
    });

    it('should handle empty references', () => {
      const params: CreateHandoffParams = {
        title: 'Simple Handoff',
        overview: 'Just an overview, no code references',
        references: [],
        directoryPath: repoDir,
      };

      const result = saveHandoffBrief(params);
      const content = fs.readFileSync(result.filepath, 'utf8');

      expect(content).toContain('# Simple Handoff');
      expect(content).toContain('Just an overview, no code references');
      expect(content).toContain('## Code & Context');
      // Should not have any backtick lines since no references
      expect(content.match(/`[^`]+`/g)).toBeNull();
    });

    it('should handle special characters in title and content', () => {
      const params: CreateHandoffParams = {
        title: 'Title with "quotes" & special chars',
        overview: 'Overview with `backticks` and **markdown**',
        references: [
          {
            anchor: 'src/file with spaces.ts',
            context: 'Context with special chars: < > &',
          },
        ],
        directoryPath: repoDir,
      };

      const result = saveHandoffBrief(params);
      const content = fs.readFileSync(result.filepath, 'utf8');

      expect(content).toContain('# Title with "quotes" & special chars');
      expect(content).toContain('Overview with `backticks` and **markdown**');
      expect(content).toContain('`src/file with spaces.ts`');
      expect(content).toContain('- Context with special chars: < > &');
    });
  });

  describe('getHandoffBriefs', () => {
    it('should return empty array when no handoffs exist', () => {
      const results = getHandoffBriefs(repoDir);
      expect(results).toEqual([]);
    });

    it('should return all handoffs sorted by most recent first', () => {
      // Create multiple handoffs with different timestamps
      const handoffs = [
        {
          title: 'First',
          overview: 'First handoff',
          references: [],
          directoryPath: repoDir,
        },
        {
          title: 'Second',
          overview: 'Second handoff',
          references: [],
          directoryPath: repoDir,
        },
        {
          title: 'Third',
          overview: 'Third handoff',
          references: [],
          directoryPath: repoDir,
        },
      ];

      handoffs.forEach((h) => saveHandoffBrief(h));

      const results = getHandoffBriefs(repoDir);

      expect(results.length).toBe(3);
      // Should be in reverse chronological order
      expect(results[0].timestamp).toBeGreaterThanOrEqual(results[1].timestamp);
      expect(results[1].timestamp).toBeGreaterThanOrEqual(results[2].timestamp);
    });

    it('should respect limit option', () => {
      // Create 5 handoffs
      for (let i = 0; i < 5; i++) {
        saveHandoffBrief({
          title: `Handoff ${i}`,
          overview: `Overview ${i}`,
          references: [],
          directoryPath: repoDir,
        });
      }

      const results = getHandoffBriefs(repoDir, { limit: 3 });
      expect(results.length).toBe(3);
    });

    it('should respect since option', () => {
      // Create two handoffs
      saveHandoffBrief({
        title: 'Old Handoff',
        overview: 'This is old',
        references: [],
        directoryPath: repoDir,
      });

      saveHandoffBrief({
        title: 'Recent Handoff',
        overview: 'This is recent',
        references: [],
        directoryPath: repoDir,
      });

      // Only get handoffs from the last minute
      const oneMinuteAgo = Date.now() - 60 * 1000;
      const results = getHandoffBriefs(repoDir, { since: oneMinuteAgo });

      // Should include both (they were just created)
      expect(results.length).toBe(2);

      // Test with future timestamp (should return nothing)
      const futureTime = Date.now() + 60 * 1000;
      const futureResults = getHandoffBriefs(repoDir, { since: futureTime });
      expect(futureResults.length).toBe(0);
    });

    it('should handle handoffs across multiple months', () => {
      // Create handoffs in different month directories manually
      const handoffsDir = path.join(repoDir, '.a24z', 'handoffs');

      // Create January handoff
      const janDir = path.join(handoffsDir, '2025', '01');
      fs.mkdirSync(janDir, { recursive: true });
      fs.writeFileSync(
        path.join(janDir, 'handoff-1704067200000-abc123.md'),
        '# January Handoff\n\n## Overview\nJanuary content\n\n## Code & Context\n'
      );

      // Create February handoff
      const febDir = path.join(handoffsDir, '2025', '02');
      fs.mkdirSync(febDir, { recursive: true });
      fs.writeFileSync(
        path.join(febDir, 'handoff-1706745600000-def456.md'),
        '# February Handoff\n\n## Overview\nFebruary content\n\n## Code & Context\n'
      );

      const results = getHandoffBriefs(repoDir);
      expect(results.length).toBe(2);
      // February should come first (more recent)
      expect(results[0].id).toContain('def456');
      expect(results[1].id).toContain('abc123');
    });
  });

  describe('getHandoffContent', () => {
    it('should retrieve content of a saved handoff', () => {
      const params: CreateHandoffParams = {
        title: 'Test Handoff',
        overview: 'Test overview content',
        references: [
          {
            anchor: 'src/test.ts',
            context: 'Test context',
          },
        ],
        directoryPath: repoDir,
      };

      const saved = saveHandoffBrief(params);
      const content = getHandoffContent(repoDir, saved.id);

      expect(content).not.toBeNull();
      expect(content).toContain('# Test Handoff');
      expect(content).toContain('Test overview content');
      expect(content).toContain('`src/test.ts`');
      expect(content).toContain('- Test context');
    });

    it('should return null for non-existent handoff', () => {
      const content = getHandoffContent(repoDir, 'handoff-1234567890-notexist');
      expect(content).toBeNull();
    });

    it('should return null for invalid handoff ID format', () => {
      const content = getHandoffContent(repoDir, 'invalid-id-format');
      expect(content).toBeNull();
    });

    it('should handle handoff ID with correct format but wrong timestamp', () => {
      // Save a handoff
      const saved = saveHandoffBrief({
        title: 'Test',
        overview: 'Test',
        references: [],
        directoryPath: repoDir,
      });

      // Try to get it with a different timestamp but same random ID
      const match = saved.id.match(/handoff-(\d+)-([a-z0-9]+)/);
      const wrongId = `handoff-1234567890-${match![2]}`;

      const content = getHandoffContent(repoDir, wrongId);
      expect(content).toBeNull();
    });
  });

  describe('deleteHandoffBrief', () => {
    it('should delete an existing handoff', () => {
      const params: CreateHandoffParams = {
        title: 'To Delete',
        overview: 'This will be deleted',
        references: [],
        directoryPath: repoDir,
      };

      const saved = saveHandoffBrief(params);

      // Verify it exists
      expect(fs.existsSync(saved.filepath)).toBe(true);

      // Delete it
      const deleted = deleteHandoffBrief(repoDir, saved.id);
      expect(deleted).toBe(true);

      // Verify it's gone
      expect(fs.existsSync(saved.filepath)).toBe(false);

      // Should not be retrievable
      const content = getHandoffContent(repoDir, saved.id);
      expect(content).toBeNull();
    });

    it('should return false for non-existent handoff', () => {
      const deleted = deleteHandoffBrief(repoDir, 'handoff-1234567890-notexist');
      expect(deleted).toBe(false);
    });

    it('should return false for invalid ID format', () => {
      const deleted = deleteHandoffBrief(repoDir, 'invalid-format');
      expect(deleted).toBe(false);
    });
  });

  describe('markdown formatting', () => {
    it('should format multi-line overview correctly', () => {
      const params: CreateHandoffParams = {
        title: 'Complex Handoff',
        overview: `This is a multi-line overview.
It has several paragraphs.

And even blank lines in between.`,
        references: [],
        directoryPath: repoDir,
      };

      const saved = saveHandoffBrief(params);
      const content = getHandoffContent(repoDir, saved.id);

      expect(content).toContain(
        'This is a multi-line overview.\nIt has several paragraphs.\n\nAnd even blank lines in between.'
      );
    });

    it('should format multiple references correctly', () => {
      const params: CreateHandoffParams = {
        title: 'Multi-ref Handoff',
        overview: 'Testing multiple references',
        references: [
          { anchor: 'src/file1.ts', context: 'First file context' },
          { anchor: 'src/file2.ts', context: 'Second file context' },
          { anchor: 'tests/test.ts', context: 'Test file context' },
          { anchor: 'docs/README.md', context: 'Documentation' },
        ],
        directoryPath: repoDir,
      };

      const saved = saveHandoffBrief(params);
      const content = getHandoffContent(repoDir, saved.id);

      // Check all references are present and properly formatted
      expect(content).toContain('`src/file1.ts`\n- First file context');
      expect(content).toContain('`src/file2.ts`\n- Second file context');
      expect(content).toContain('`tests/test.ts`\n- Test file context');
      expect(content).toContain('`docs/README.md`\n- Documentation');
    });
  });
});
