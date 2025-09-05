// Test file - any types used for mock data
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { CreateRepositoryAnchoredNoteTool } from '../../src/core-mcp/tools/CreateRepositoryAnchoredNoteTool';
import { GetAnchoredNotesTool } from '../../src/core-mcp/tools/GetAnchoredNotesTool';
import { createTestView } from '../test-helpers';

describe('Repository-Specific Note Retrieval Integration', () => {
  const testBase = path.join(os.tmpdir(), 'retrieval-test-' + Date.now());
  const repo1 = path.join(testBase, 'repo1');
  const repo2 = path.join(testBase, 'repo2');

  beforeAll(() => {
    // Create test repositories
    fs.mkdirSync(path.join(repo1, '.git'), { recursive: true });
    fs.writeFileSync(path.join(repo1, '.git', 'config'), '[core]\nrepositoryformatversion = 0\n');
    fs.writeFileSync(
      path.join(repo1, 'package.json'),
      JSON.stringify({ name: 'repo1', version: '1.0.0' })
    );
    createTestView(repo1, 'test-view');

    fs.mkdirSync(path.join(repo2, '.git'), { recursive: true });
    fs.writeFileSync(path.join(repo2, '.git', 'config'), '[core]\nrepositoryformatversion = 0\n');
    fs.writeFileSync(
      path.join(repo2, 'package.json'),
      JSON.stringify({ name: 'repo2', version: '1.0.0' })
    );
    createTestView(repo2, 'test-view');
  });

  afterAll(() => {
    if (fs.existsSync(testBase)) {
      fs.rmSync(testBase, { recursive: true, force: true });
    }
  });

  it('should correctly store and retrieve notes from specific repositories', async () => {
    const saveTool = new CreateRepositoryAnchoredNoteTool();
    const getTool = new GetAnchoredNotesTool();

    // Save notes in repo1
    console.log('Saving note in repo1...');
    const save1Result = await saveTool.execute({
      note: 'Repository 1 specific note',
      directoryPath: repo1,
      anchors: [repo1],
      tags: ['repo1', 'test'],
      codebaseViewId: 'test-view',
      metadata: { testId: 'repo1-note' },
    });
    expect(save1Result.content[0].text).toContain('Note saved successfully');

    // Save notes in repo2
    console.log('Saving note in repo2...');
    const save2Result = await saveTool.execute({
      note: 'Repository 2 specific note',
      directoryPath: repo2,
      anchors: [repo2],
      tags: ['repo2', 'test'],
      codebaseViewId: 'test-view',
      metadata: { testId: 'repo2-note' },
    });
    expect(save2Result.content[0].text).toContain('Note saved successfully');

    // Verify notes directories are created in correct locations
    const repo1NotesDir = path.join(repo1, '.a24z', 'notes');
    const repo2NotesDir = path.join(repo2, '.a24z', 'notes');

    console.log('Checking directory existence...');
    expect(fs.existsSync(repo1NotesDir)).toBe(true);
    expect(fs.existsSync(repo2NotesDir)).toBe(true);

    // Retrieve notes from repo1
    console.log('Retrieving notes from repo1...');
    const get1Result = await getTool.execute({
      path: repo1,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 10,
      offset: 0,
      includeMetadata: true,
    });

    const repo1Data = JSON.parse(get1Result.content[0].text!);
    console.log('Repo1 retrieval result:', JSON.stringify(repo1Data, null, 2));

    expect(repo1Data.pagination.total).toBe(1);
    expect(repo1Data.notes[0].note).toBe('Repository 1 specific note');

    // Retrieve notes from repo2
    console.log('Retrieving notes from repo2...');
    const get2Result = await getTool.execute({
      path: repo2,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 10,
      offset: 0,
      includeMetadata: true,
    });

    const repo2Data = JSON.parse(get2Result.content[0].text!);
    console.log('Repo2 retrieval result:', JSON.stringify(repo2Data, null, 2));

    expect(repo2Data.pagination.total).toBe(1);
    expect(repo2Data.notes[0].note).toBe('Repository 2 specific note');
  });

  it('should retrieve notes from nested paths within repository', async () => {
    const saveTool = new CreateRepositoryAnchoredNoteTool();
    const getTool = new GetAnchoredNotesTool();

    const nestedPath = path.join(repo1, 'src', 'components', 'Button.tsx');
    fs.mkdirSync(path.dirname(nestedPath), { recursive: true });

    // Save note at repository root
    console.log('Saving note at repository root...');
    await saveTool.execute({
      note: 'Root level note for nested path test',
      directoryPath: repo1,
      anchors: [repo1],
      tags: ['root', 'nested-test'],
      codebaseViewId: 'test-view',
      metadata: {},
    });

    // Try to retrieve from nested path
    console.log('Retrieving from nested path:', nestedPath);
    const getResult = await getTool.execute({
      path: nestedPath,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 10,
      offset: 0,
      includeMetadata: true,
    });

    const data = JSON.parse(getResult.content[0].text!);
    console.log('Nested path retrieval result:', JSON.stringify(data, null, 2));

    // Should find the root note even when querying from nested path
    expect(data.pagination.total).toBeGreaterThanOrEqual(1);

    const rootNote = data.notes.find((n: any) => n.note.includes('Root level note'));
    expect(rootNote).toBeDefined();
  });

  it('should not retrieve notes from different repository', async () => {
    const getTool = new GetAnchoredNotesTool();

    // Both repositories should have notes from previous tests
    // Query repo1 - should not see repo2 notes
    console.log('Querying repo1 for isolation check...');
    const get1Result = await getTool.execute({
      path: repo1,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 100,
      offset: 0,
      includeMetadata: true,
    });

    const repo1Data = JSON.parse(get1Result.content[0].text!);
    console.log('Repo1 notes count:', repo1Data.pagination.total);

    // Check that no notes from repo2 appear
    const hasRepo2Notes = repo1Data.notes.some(
      (n: any) => n.note.includes('Repository 2') || n.note.includes('repo2')
    );
    expect(hasRepo2Notes).toBe(false);

    // Query repo2 - should not see repo1 notes
    console.log('Querying repo2 for isolation check...');
    const get2Result = await getTool.execute({
      path: repo2,
      includeParentNotes: true,
      filterReviewed: 'all',
      includeStale: true,
      sortBy: 'timestamp',
      limit: 100,
      offset: 0,
      includeMetadata: true,
    });

    const repo2Data = JSON.parse(get2Result.content[0].text!);
    console.log('Repo2 notes count:', repo2Data.pagination.total);

    // Check that no notes from repo1 appear
    const hasRepo1Notes = repo2Data.notes.some(
      (n: any) =>
        n.note.includes('Repository 1') ||
        n.note.includes('repo1') ||
        n.note.includes('Root level note')
    );
    expect(hasRepo1Notes).toBe(false);
  });
});
