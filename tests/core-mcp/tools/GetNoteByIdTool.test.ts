import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { GetAnchoredNoteByIdTool } from '../../../src/core-mcp/tools/GetAnchoredNoteByIdTool';
import { saveNote } from '../../../src/core-mcp/store/anchoredNotesStore';
import { createTestView } from '../../test-helpers';

describe('GetAnchoredNoteByIdTool', () => {
  let tempDir: string;
  let testRepoPath: string;
  let tool: GetAnchoredNoteByIdTool;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    createTestView(testRepoPath, 'test-view');
    tool = new GetAnchoredNoteByIdTool();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should retrieve and format a note by ID', async () => {
    // Save a test note
    const savedNoteWithPath = saveNote({
      note: '# Test Note\n\nThis is a test note with **markdown** content.',
      anchors: ['src/test.ts', 'docs/readme.md'],
      tags: ['testing', 'documentation', 'example'],
      metadata: {
        author: 'test-user',
        version: '1.0.0',
        relatedPR: 123,
      },
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    const result = await tool.execute({
      noteId: savedNote.id,
      directoryPath: testRepoPath,
    });

    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;

    // Check for all expected sections
    expect(text).toContain(`# Note ID: ${savedNote.id}`);
    // Type field has been removed
    expect(text).toContain('**Tags:** testing, documentation, example');
    expect(text).toContain('**Created:**');

    // Check anchors section
    expect(text).toContain('## Anchors');
    expect(text).toContain('- src/test.ts');
    expect(text).toContain('- docs/readme.md');

    // Check content section
    expect(text).toContain('## Content');
    expect(text).toContain('# Test Note');
    expect(text).toContain('This is a test note with **markdown** content.');

    // Check metadata section
    expect(text).toContain('## Metadata');
    expect(text).toContain('**author:** "test-user"');
    expect(text).toContain('**version:** "1.0.0"');
    expect(text).toContain('**relatedPR:** 123');
  });

  it('should throw error for non-existent note ID', async () => {
    const nonExistentId = 'note-1234567890-nonexistent';

    await expect(
      tool.execute({
        noteId: nonExistentId,
        directoryPath: testRepoPath,
      })
    ).rejects.toThrow(`Note with ID "${nonExistentId}" not found`);
  });

  it('should handle notes without metadata', async () => {
    const savedNoteWithPath = saveNote({
      note: 'Simple note',
      anchors: ['file.ts'],
      tags: ['simple'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    const result = await tool.execute({
      noteId: savedNote.id,
      directoryPath: testRepoPath,
    });

    const text = result.content[0].text as string;

    // Should have standard sections
    // Type field has been removed
    expect(text).toContain('Simple note');

    // Metadata section should not appear when metadata is empty
    expect(text).not.toContain('## Metadata');
  });

  it('should work from subdirectory path', async () => {
    const savedNoteWithPath = saveNote({
      note: 'Subdirectory test note',
      anchors: ['src/components/Component.tsx'],
      tags: ['component'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });
    const savedNote = savedNoteWithPath.note;

    // Create a subdirectory
    const subDir = path.join(testRepoPath, 'src', 'components');
    fs.mkdirSync(subDir, { recursive: true });

    // Retrieve using subdirectory path
    const result = await tool.execute({
      noteId: savedNote.id,
      directoryPath: subDir,
    });

    const text = result.content[0].text as string;
    expect(text).toContain(`# Note ID: ${savedNote.id}`);
    expect(text).toContain('Subdirectory test note');
    // Type field has been removed
  });

  it('should throw error for non-absolute path', async () => {
    await expect(
      tool.execute({
        noteId: 'any-id',
        directoryPath: 'relative/path',
      })
    ).rejects.toThrow('directoryPath must be an absolute path');
  });

  it('should throw error for non-existent directory', async () => {
    await expect(
      tool.execute({
        noteId: 'any-id',
        directoryPath: '/non/existent/path',
      })
    ).rejects.toThrow('directoryPath does not exist');
  });

  it('should throw error for path outside git repository', async () => {
    const nonGitDir = path.join(tempDir, 'non-git');
    fs.mkdirSync(nonGitDir, { recursive: true });

    await expect(
      tool.execute({
        noteId: 'any-id',
        directoryPath: nonGitDir,
      })
    ).rejects.toThrow('directoryPath is not within a git repository');
  });

  it('should format timestamp correctly', async () => {
    const savedNote = saveNote({
      note: 'Timestamp test',
      anchors: ['file.ts'],
      tags: ['time'],
      metadata: {},
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });

    const result = await tool.execute({
      noteId: savedNote.note.id,
      directoryPath: testRepoPath,
    });

    const text = result.content[0].text as string;

    // Check that the timestamp is formatted as ISO string
    const timestamp = new Date(savedNote.note.timestamp).toISOString();
    expect(text).toContain(`**Created:** ${timestamp}`);
  });

  it('should handle complex metadata structures', async () => {
    const savedNote = saveNote({
      note: 'Complex metadata test',
      anchors: ['file.ts'],
      tags: ['complex'],
      metadata: {
        nested: {
          deeply: {
            value: 'test',
          },
        },
        array: [1, 2, 3],
        boolean: true,
        nullValue: null,
      },
      directoryPath: testRepoPath,
      codebaseViewId: 'test-view',
    });

    const result = await tool.execute({
      noteId: savedNote.note.id,
      directoryPath: testRepoPath,
    });

    const text = result.content[0].text as string;

    // Check that complex metadata is JSON stringified
    expect(text).toContain('## Metadata');
    expect(text).toContain('**nested:**');
    expect(text).toContain('"deeply"');
    expect(text).toContain('**array:** [1,2,3]');
    expect(text).toContain('**boolean:** true');
    expect(text).toContain('**nullValue:** null');
  });

  it('should display all note types correctly', async () => {
    const types: Array<'decision' | 'pattern' | 'gotcha' | 'explanation'> = [
      'decision',
      'pattern',
      'gotcha',
      'explanation',
    ];

    for (const type of types) {
      const savedNote = saveNote({
        note: `Note of type ${type}`,
        anchors: ['file.ts'],
        tags: [type],
        metadata: {},
        directoryPath: testRepoPath,
        codebaseViewId: 'test-view',
      });

      const result = await tool.execute({
        noteId: savedNote.note.id,
        directoryPath: testRepoPath,
      });

      // Type field has been removed from output
      expect(result.content[0].text).toBeDefined();
    }
  });
});
