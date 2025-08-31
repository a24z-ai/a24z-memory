import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { saveHandoffBrief, getHandoffBriefsWithTitles } from '../src/core-mcp/store/handoffStore';
import { ListHandoffBriefsTool } from '../src/core-mcp/tools/ListHandoffBriefsTool';

describe('ListHandoffBriefsTool', () => {
  let tempDir: string;
  let gitDir: string;

  beforeEach(() => {
    // Create temporary directory with git repo
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-handoff-'));
    gitDir = path.join(tempDir, '.git');
    fs.mkdirSync(gitDir);
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should list handoff briefs with titles', async () => {
    // Create some test handoff briefs
    saveHandoffBrief({
      title: 'Authentication Refactor',
      overview: 'Overview of the authentication refactor',
      references: [{ anchor: '/src/auth.ts', context: 'Main auth module' }],
      directoryPath: tempDir,
    });

    saveHandoffBrief({
      title: 'Database Migration',
      overview: 'Notes on the database migration',
      references: [{ anchor: '/src/db.ts', context: 'Database connection' }],
      directoryPath: tempDir,
    });

    // Test the getHandoffBriefsWithTitles function
    const briefs = getHandoffBriefsWithTitles(tempDir);
    expect(briefs).toHaveLength(2);
    expect(briefs[0].title).toBe('Database Migration'); // Most recent first
    expect(briefs[1].title).toBe('Authentication Refactor');

    // Test the ListHandoffBriefsTool
    const tool = new ListHandoffBriefsTool();
    const result = await tool.execute({ directoryPath: tempDir });

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const text = result.content[0].text;
    expect(text).toContain('Handoff Briefs for Repository');
    expect(text).toContain('Found 2 handoff briefs');
    expect(text).toContain('Authentication Refactor');
    expect(text).toContain('Database Migration');
  });

  it('should handle empty repository', async () => {
    const tool = new ListHandoffBriefsTool();
    const result = await tool.execute({ directoryPath: tempDir });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('No handoff briefs found');
  });

  it('should respect limit parameter', async () => {
    // Create 3 handoff briefs
    for (let i = 1; i <= 3; i++) {
      saveHandoffBrief({
        title: `Handoff ${i}`,
        overview: `Overview ${i}`,
        references: [],
        directoryPath: tempDir,
      });
    }

    const tool = new ListHandoffBriefsTool();
    const result = await tool.execute({ directoryPath: tempDir, limit: 2 });

    const text = result.content[0].text;
    expect(text).toContain('Handoff 3'); // Most recent
    expect(text).toContain('Handoff 2');
    expect(text).not.toContain('Handoff 1'); // Should be excluded by limit
    expect(text).toContain('Results limited to 2 briefs');
  });

  it('should handle non-git directory', async () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-git-'));

    try {
      const tool = new ListHandoffBriefsTool();
      const result = await tool.execute({ directoryPath: nonGitDir });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not within a git repository');
    } finally {
      fs.rmSync(nonGitDir, { recursive: true, force: true });
    }
  });
});
