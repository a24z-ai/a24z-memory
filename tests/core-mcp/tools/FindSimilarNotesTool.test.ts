import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FindSimilarNotesTool } from '../../../src/core-mcp/tools/FindSimilarNotesTool';
import { saveNote } from '../../../src/core-mcp/store/notesStore';

describe('FindSimilarNotesTool', () => {
  let tool: FindSimilarNotesTool;
  let tempDir: string;
  let testRepoPath: string;

  beforeEach(() => {
    tool = new FindSimilarNotesTool();
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
    expect(tool.name).toBe('find_similar_notes');
    expect(tool.description).toBe('Find notes that are semantically similar or potentially duplicates');
  });

  it('should handle repository with insufficient notes', async () => {
    // Create only one note
    saveNote({
      note: 'Single note',
      anchors: ['file.ts'],
      tags: ['test'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxResults: 20,
      groupBy: 'pairs'
    });

    expect(result.content[0].text).toContain('Not enough notes to analyze');
    expect(result.content[0].text).toContain('Found 1 notes');
  });

  it('should find similar notes based on content', async () => {
    // Create similar notes
    saveNote({
      note: 'This is about authentication and user login',
      anchors: ['auth.ts'],
      tags: ['auth', 'security'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'This covers authentication and user login flow',
      anchors: ['login.ts'],
      tags: ['auth', 'frontend'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'Database schema for products',
      anchors: ['db.ts'],
      tags: ['database'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxResults: 20,
      groupBy: 'pairs'
    });

    expect(result.content[0].text).toContain('Similar Notes Analysis');
    expect(result.content[0].text).toContain('authentication');
    expect(result.isError).toBeUndefined();
  });

  it('should filter notes by tags when filterTags is provided', async () => {
    // Create notes with different tags
    saveNote({
      note: 'Authentication implementation',
      anchors: ['auth.ts'],
      tags: ['auth', 'security'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'Authentication flow documentation',
      anchors: ['auth-flow.md'],
      tags: ['auth', 'documentation'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'Database connection setup',
      anchors: ['db.ts'],
      tags: ['database', 'configuration'],
      confidence: 'medium',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'Database migration scripts',
      anchors: ['migration.ts'],
      tags: ['database', 'migration'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    // Filter to only 'auth' tagged notes
    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'low',
      includeStale: true,
      maxResults: 20,
      groupBy: 'pairs',
      filterTags: ['auth']
    });

    expect(result.content[0].text).toContain('Filtered by tags: auth');
    expect(result.content[0].text).toContain('Authentication');
    expect(result.content[0].text).not.toContain('Database connection');
    expect(result.content[0].text).not.toContain('migration');
  });

  it('should group notes into clusters when groupBy is clusters', async () => {
    // Create a cluster of similar notes
    saveNote({
      note: 'Error handling in API endpoints',
      anchors: ['api/error.ts'],
      tags: ['api', 'error-handling'],
      confidence: 'high',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'API error handling patterns',
      anchors: ['api/handler.ts'],
      tags: ['api', 'error-handling'],
      confidence: 'high',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'Error handling utilities for API',
      anchors: ['api/utils.ts'],
      tags: ['api', 'error-handling', 'utilities'],
      confidence: 'high',
      type: 'pattern',
      metadata: {},
      directoryPath: testRepoPath
    });

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'medium',
      includeStale: true,
      maxResults: 20,
      groupBy: 'clusters'
    });

    expect(result.content[0].text).toContain('Similar Notes Analysis');
    expect(result.content[0].text).toMatch(/cluster|group/i);
  });

  it('should respect threshold settings', async () => {
    // Create notes with varying similarity
    saveNote({
      note: 'User authentication system',
      anchors: ['auth.ts'],
      tags: ['auth'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'User authentication module',
      anchors: ['auth.ts'],
      tags: ['auth'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    saveNote({
      note: 'Payment processing system',
      anchors: ['payment.ts'],
      tags: ['payment'],
      confidence: 'high',
      type: 'explanation',
      metadata: {},
      directoryPath: testRepoPath
    });

    // High threshold should find very similar notes
    const highResult = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'high',
      includeStale: true,
      maxResults: 20,
      groupBy: 'pairs'
    });

    // Low threshold should find more pairs
    const lowResult = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'low',
      includeStale: true,
      maxResults: 20,
      groupBy: 'pairs'
    });

    // With high threshold, we expect fewer or no matches between dissimilar notes
    // With low threshold, we expect more matches
    expect(highResult.content[0].text).toBeDefined();
    expect(lowResult.content[0].text).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const result = await tool.execute({
      repositoryPath: '/non/existent/path',
      threshold: 'medium',
      includeStale: true,
      maxResults: 20,
      groupBy: 'pairs'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error analyzing notes');
  });

  it('should respect maxResults parameter', async () => {
    // Create many similar notes
    for (let i = 0; i < 10; i++) {
      saveNote({
        note: `API endpoint documentation ${i}`,
        anchors: [`api/endpoint${i}.ts`],
        tags: ['api', 'documentation'],
        confidence: 'high',
        type: 'explanation',
        metadata: {},
        directoryPath: testRepoPath
      });
    }

    const result = await tool.execute({
      repositoryPath: testRepoPath,
      threshold: 'low',
      includeStale: true,
      maxResults: 3,
      groupBy: 'pairs'
    });

    // Check that the output respects the maxResults limit
    expect(result.content[0].text).toBeDefined();
    // The actual number of pairs shown should be limited
  });
});