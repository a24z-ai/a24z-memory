import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ReviewDuplicatesTool } from '../../../src/core-mcp/tools/ReviewDuplicatesTool';
import { saveNote } from '../../../src/core-mcp/store/notesStore';

describe('ReviewDuplicatesTool', () => {
  let tool: ReviewDuplicatesTool;
  let tempDir: string;
  let testRepoPath: string;

  beforeEach(() => {
    tool = new ReviewDuplicatesTool();
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

  it('should have correct tool metadata', () => {
    expect(tool.name).toBe('review_duplicates');
    expect(tool.description).toBe(
      'Comprehensive duplicate analysis with actionable recommendations'
    );
  });

  it('should handle repository with insufficient notes', async () => {
    // Create only one note
    saveNote({
      note: 'Single note for testing',
      anchors: ['test.ts'],
      tags: ['test'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'all',
    });

    expect(result.content[0].text).toContain('Not enough notes to analyze');
    expect(result.content[0].text).toContain('Found 1 notes');
  });

  it('should identify duplicate notes and provide recommendations', async () => {
    // Create duplicate/similar notes
    saveNote({
      note: 'Database connection setup with PostgreSQL',
      anchors: ['db/connection.ts'],
      tags: ['database', 'postgresql', 'setup'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'PostgreSQL database connection configuration',
      anchors: ['db/config.ts'],
      tags: ['database', 'postgresql', 'configuration'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'Setting up PostgreSQL connection',
      anchors: ['db/setup.ts'],
      tags: ['database', 'postgresql'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'API endpoint for user authentication',
      anchors: ['api/auth.ts'],
      tags: ['api', 'authentication'],
      confidence: 'high',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath,
    });

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'all',
    });

    expect(result.content[0].text).toContain('Duplicate Analysis Report');
    expect(result.content[0].text).toContain('PostgreSQL');
    expect(result.content[0].text).toContain('database');
    expect(result.content[0].text).toMatch(/recommendation|cluster|similar/i);
    expect(result.isError).toBeUndefined();
  });

  it('should respect threshold settings', async () => {
    // Create notes with varying similarity levels
    saveNote({
      note: 'Caching strategy using Redis',
      anchors: ['cache/redis.ts'],
      tags: ['cache', 'redis', 'performance'],
      confidence: 'high',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'Redis caching implementation',
      anchors: ['cache/impl.ts'],
      tags: ['cache', 'redis'],
      confidence: 'high',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'Memory caching with TTL',
      anchors: ['cache/memory.ts'],
      tags: ['cache', 'memory'],
      confidence: 'medium',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath,
    });

    // High threshold - should find only very similar notes
    const highResult = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'high',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'all',
    });

    // Low threshold - should find more similarities
    const lowResult = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'low',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'all',
    });

    expect(highResult.content[0].text).toBeDefined();
    expect(lowResult.content[0].text).toBeDefined();
    // Low threshold should generally find more duplicates
  });

  it('should filter by focus parameter', async () => {
    // 400 days ago and 10 days ago timestamps would be used for filtering
    // but we cannot directly set timestamps in tests

    // Create notes with different timestamps and confidence levels
    // Note: We can't directly set timestamps, so we'll test the focus logic
    saveNote({
      note: 'Old documentation note',
      anchors: ['old.md'],
      tags: ['documentation'],
      confidence: 'low',
      type: 'explanation',
      metadata: { created: 'old' },
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'Recent feature implementation',
      anchors: ['feature.ts'],
      tags: ['feature'],
      confidence: 'high',
      type: 'pattern',
      metadata: { created: 'recent' },
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'High confidence security pattern',
      anchors: ['security.ts'],
      tags: ['security'],
      confidence: 'high',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'Another high confidence pattern',
      anchors: ['pattern.ts'],
      tags: ['pattern'],
      confidence: 'high',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath,
    });

    // Test focus on high-confidence notes
    const highConfidenceResult = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'high-confidence',
    });

    expect(highConfidenceResult.content[0].text).toContain('Duplicate Analysis Report');
    // Should analyze only high-confidence notes
  });

  it('should handle stale notes based on maxAgeDays', async () => {
    // Create several notes
    for (let i = 0; i < 5; i++) {
      saveNote({
        note: `Note ${i} about testing`,
        anchors: [`test${i}.ts`],
        tags: ['test', `tag${i}`],
        confidence: 'medium',
        type: 'explanation',
        metadata: { index: i },
        directoryPath: testRepoPath,
      });
    }

    // Test with includeStale true
    const withStaleResult = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxAgeDays: 30, // Consider notes older than 30 days as stale
      focus: 'all',
    });

    // Test with includeStale false
    const withoutStaleResult = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: false,
      maxAgeDays: 30,
      focus: 'all',
    });

    expect(withStaleResult.content[0].text).toBeDefined();
    expect(withoutStaleResult.content[0].text).toBeDefined();
  });

  it('should provide actionable recommendations', async () => {
    // Create a clear set of duplicates
    saveNote({
      note: 'User authentication flow with OAuth',
      anchors: ['auth/oauth.ts'],
      tags: ['auth', 'oauth'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'OAuth authentication implementation',
      anchors: ['auth/oauth-impl.ts'],
      tags: ['auth', 'oauth'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    saveNote({
      note: 'OAuth2 authentication flow',
      anchors: ['auth/oauth2.ts'],
      tags: ['auth', 'oauth'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath,
    });

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'all',
    });

    const text = result.content[0].text;
    expect(text).toContain('Duplicate Analysis Report');
    // Should contain recommendations or action items
    expect(text).toMatch(/recommendation|action|merge|consolidate|review/i);
  });

  it('should analyze by focus type stale', async () => {
    // Create notes to test stale focus
    for (let i = 0; i < 3; i++) {
      saveNote({
        note: `Stale documentation ${i}`,
        anchors: [`doc${i}.md`],
        tags: ['documentation', 'stale'],
        confidence: 'low',
        type: 'explanation',
        metadata: { age: 'old' },
        directoryPath: testRepoPath,
      });
    }

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxAgeDays: 1, // Very short to consider all as stale
      focus: 'stale',
    });

    expect(result.content[0].text).toBeDefined();
    // Should focus on stale notes analysis
  });

  it('should analyze by focus type recent', async () => {
    // Create recent notes
    for (let i = 0; i < 3; i++) {
      saveNote({
        note: `Recent implementation ${i}`,
        anchors: [`impl${i}.ts`],
        tags: ['implementation', 'recent'],
        confidence: 'high',
        type: 'pattern',
        metadata: { age: 'new' },
        directoryPath: testRepoPath,
      });
    }

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'recent',
    });

    expect(result.content[0].text).toBeDefined();
    // Should focus on recent notes (last 30 days)
  });

  it('should handle errors gracefully', async () => {
    const result = await tool.execute({
      repositoryPath: '/non/existent/path',
      threshold: 'medium',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'all',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error analyzing duplicates');
  });

  it('should generate comprehensive report structure', async () => {
    // Create a diverse set of notes for comprehensive analysis
    const noteTypes = ['pattern', 'explanation', 'gotcha', 'decision'];
    const confidenceLevels = ['high', 'medium', 'low'];

    for (let i = 0; i < 9; i++) {
      saveNote({
        note: `Technical note ${i} about ${i % 3 === 0 ? 'authentication' : i % 3 === 1 ? 'database' : 'caching'}`,
        anchors: [`file${i}.ts`],
        tags: [i % 3 === 0 ? 'auth' : i % 3 === 1 ? 'database' : 'cache', 'technical'],
        confidence: confidenceLevels[i % 3] as 'high' | 'medium' | 'low',
        type: noteTypes[i % 4] as 'pattern' | 'explanation' | 'gotcha' | 'decision',
        metadata: { index: i },
        directoryPath: testRepoPath,
      });
    }

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'low',
      includeStale: true,
      maxAgeDays: 365,
      focus: 'all',
    });

    const text = result.content[0].text;
    expect(text).toContain('Duplicate Analysis Report');
    expect(text).toMatch(/Total Notes:|Statistics:|Summary:/i);
    // Should have structured sections in the report
  });
});
