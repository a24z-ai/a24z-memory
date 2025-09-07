import { describe, it, expect, beforeEach } from 'bun:test';
import { GetTagUsageTool } from '../../../src/mcp/tools/GetTagUsageTool';
import { InMemoryFileSystemAdapter } from '../../test-adapters/InMemoryFileSystemAdapter';
import { AnchoredNotesStore } from '../../../src/pure-core/stores/AnchoredNotesStore';
import { CodebaseViewsStore } from '../../../src/pure-core/stores/CodebaseViewsStore';
import { MemoryPalace } from '../../../src/MemoryPalace';
import type { ValidatedRepositoryPath, CodebaseView } from '../../../src/pure-core/types';

interface TagUsageResponse {
  tag: string;
  usageCount: number;
  hasDescription: boolean;
  description?: string;
  noteIds?: string[];
}

describe('GetTagUsageTool', () => {
  let tool: GetTagUsageTool;
  let notesStore: AnchoredNotesStore;
  let fs: InMemoryFileSystemAdapter;
  const testRepoPath = '/test-repo';
  let validatedRepoPath: ValidatedRepositoryPath;

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    tool = new GetTagUsageTool(fs);
    notesStore = new AnchoredNotesStore(fs);
    fs.setupTestRepo(testRepoPath);
    validatedRepoPath = MemoryPalace.validateRepositoryPath(fs, testRepoPath);

    // Create a test view using CodebaseViewsStore
    const codebaseViewsStore = new CodebaseViewsStore(fs);
    const testView: CodebaseView = {
      id: 'test-view',
      version: '1.0.0',
      name: 'Test View',
      description: 'Test view for testing',
      overviewPath: 'README.md',
      cells: {},
      timestamp: new Date().toISOString(),
    };
    codebaseViewsStore.saveView(validatedRepoPath, testView);
  });

  it('should return empty statistics for repository with no tags', async () => {
    // Execute the tool
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      includeNoteIds: false,
      includeDescriptions: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify empty statistics
    expect(response.statistics.totalTags).toBe(0);
    expect(response.statistics.usedTags).toBe(0);
    expect(response.statistics.unusedTags).toBe(0);
    expect(response.statistics.tagsWithDescriptions).toBe(0);
    expect(response.statistics.tagsWithoutDescriptions).toBe(0);
    expect(response.tags).toEqual([]);
  });

  it('should identify used and unused tags', async () => {
    // Create tag descriptions
    notesStore.saveTagDescription(validatedRepoPath, 'used-tag', 'This tag is used');
    notesStore.saveTagDescription(validatedRepoPath, 'unused-tag', 'This tag is not used');

    // Save notes with tags
    const note1WithPath = notesStore.saveNote({
      note: 'Note 1',
      anchors: ['file1.ts'],
      tags: ['used-tag', 'no-description-tag'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note1 = note1WithPath.note;

    const note2WithPath = notesStore.saveNote({
      note: 'Note 2',
      anchors: ['file2.ts'],
      tags: ['used-tag'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });
    const note2 = note2WithPath.note;

    // Execute the tool
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      includeNoteIds: true,
      includeDescriptions: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify statistics
    expect(response.statistics.totalTags).toBe(3);
    expect(response.statistics.usedTags).toBe(2); // used-tag, no-description-tag
    expect(response.statistics.unusedTags).toBe(1); // unused-tag
    expect(response.statistics.tagsWithDescriptions).toBe(2); // used-tag, unused-tag
    expect(response.statistics.tagsWithoutDescriptions).toBe(1); // no-description-tag

    // Verify tag details
    const usedTag = response.tags.find((t: TagUsageResponse) => t.tag === 'used-tag');
    expect(usedTag).toBeDefined();
    expect(usedTag.usageCount).toBe(2);
    expect(usedTag.hasDescription).toBe(true);
    expect(usedTag.description).toBe('This tag is used');
    expect(usedTag.noteIds).toContain(note1.id);
    expect(usedTag.noteIds).toContain(note2.id);

    const unusedTag = response.tags.find((t: TagUsageResponse) => t.tag === 'unused-tag');
    expect(unusedTag).toBeDefined();
    expect(unusedTag.usageCount).toBe(0);
    expect(unusedTag.hasDescription).toBe(true);
    expect(unusedTag.description).toBe('This tag is not used');
    expect(unusedTag.noteIds).toBeUndefined(); // No notes use this tag

    const noDescTag = response.tags.find((t: TagUsageResponse) => t.tag === 'no-description-tag');
    expect(noDescTag).toBeDefined();
    expect(noDescTag.usageCount).toBe(1);
    expect(noDescTag.hasDescription).toBe(false);
    expect(noDescTag.description).toBeUndefined();
    expect(noDescTag.noteIds).toContain(note1.id);
  });

  it('should filter tags when filterTags is provided', async () => {
    // Create multiple tags
    notesStore.saveTagDescription(validatedRepoPath, 'tag1', 'Description 1');
    notesStore.saveTagDescription(validatedRepoPath, 'tag2', 'Description 2');
    notesStore.saveTagDescription(validatedRepoPath, 'tag3', 'Description 3');

    // Save notes with various tags
    notesStore.saveNote({
      note: 'Note with tag1',
      anchors: ['file1.ts'],
      tags: ['tag1', 'tag2'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    notesStore.saveNote({
      note: 'Note with tag3',
      anchors: ['file2.ts'],
      tags: ['tag3'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool with filter
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      filterTags: ['tag1', 'tag3', 'nonexistent'],
      includeNoteIds: false,
      includeDescriptions: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Should only return filtered tags (excluding nonexistent)
    expect(response.tags).toHaveLength(2);
    expect(response.tags.map((t: TagUsageResponse) => t.tag)).toContain('tag1');
    expect(response.tags.map((t: TagUsageResponse) => t.tag)).toContain('tag3');
    expect(response.tags.map((t: TagUsageResponse) => t.tag)).not.toContain('tag2');
    expect(response.tags.map((t: TagUsageResponse) => t.tag)).not.toContain('nonexistent');
  });

  it('should exclude descriptions when includeDescriptions is false', async () => {
    // Create tag with description
    notesStore.saveTagDescription(validatedRepoPath, 'described-tag', 'This is a description');

    // Save note with tag
    notesStore.saveNote({
      note: 'Note',
      anchors: ['file.ts'],
      tags: ['described-tag'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool without descriptions
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      includeNoteIds: false,
      includeDescriptions: false,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify description is not included
    const tag = response.tags.find((t: TagUsageResponse) => t.tag === 'described-tag');
    expect(tag.hasDescription).toBe(true);
    expect(tag.description).toBeUndefined();
  });

  it('should exclude note IDs when includeNoteIds is false', async () => {
    // Save notes with tags
    notesStore.saveNote({
      note: 'Note',
      anchors: ['file.ts'],
      tags: ['test-tag'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool without note IDs
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      includeNoteIds: false,
      includeDescriptions: false,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify note IDs are not included
    const tag = response.tags.find((t: TagUsageResponse) => t.tag === 'test-tag');
    expect(tag.usageCount).toBe(1);
    expect(tag.noteIds).toBeUndefined();
  });

  it('should sort tags by usage count then alphabetically', async () => {
    // Save notes with different tag usage counts
    notesStore.saveNote({
      note: 'Note 1',
      anchors: ['file1.ts'],
      tags: ['alpha', 'beta', 'gamma'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    notesStore.saveNote({
      note: 'Note 2',
      anchors: ['file2.ts'],
      tags: ['beta', 'gamma'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    notesStore.saveNote({
      note: 'Note 3',
      anchors: ['file3.ts'],
      tags: ['gamma'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      includeNoteIds: false,
      includeDescriptions: false,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify sorting: gamma (3), beta (2), alpha (1)
    expect(response.tags[0].tag).toBe('gamma');
    expect(response.tags[0].usageCount).toBe(3);
    expect(response.tags[1].tag).toBe('beta');
    expect(response.tags[1].usageCount).toBe(2);
    expect(response.tags[2].tag).toBe('alpha');
    expect(response.tags[2].usageCount).toBe(1);
  });

  it('should provide recommendations for unused tags and tags without descriptions', async () => {
    // Create unused tag with description
    notesStore.saveTagDescription(validatedRepoPath, 'unused', 'Unused tag');

    // Save note with tag without description
    notesStore.saveNote({
      note: 'Note',
      anchors: ['file.ts'],
      tags: ['no-desc'],
      metadata: {},
      directoryPath: validatedRepoPath,
      codebaseViewId: 'test-view',
    });

    // Execute the tool
    const result = await tool.execute({
      directoryPath: validatedRepoPath,
      includeNoteIds: false,
      includeDescriptions: true,
    });

    // Parse the result
    const response = JSON.parse(result.content[0].text);

    // Verify recommendations
    expect(response.recommendations).toHaveLength(2);
    expect(response.recommendations.some((r: string) => r.includes('1 unused tag'))).toBe(true);
    expect(
      response.recommendations.some((r: string) =>
        r.includes('1 tag(s) being used without descriptions')
      )
    ).toBe(true);
  });

  it('should throw error for non-existent path', async () => {
    await expect(
      tool.execute({
        directoryPath: '/nonexistent/path',
        includeNoteIds: false,
        includeDescriptions: true,
      })
    ).rejects.toThrow('Not a git repository');
  });

  it('should throw error for non-git repository', async () => {
    // Create a directory without .git
    const nonGitPath = '/non-git';
    fs.createDir(nonGitPath);

    await expect(
      tool.execute({
        directoryPath: nonGitPath,
        includeNoteIds: false,
        includeDescriptions: true,
      })
    ).rejects.toThrow('Not a git repository');
  });
});
