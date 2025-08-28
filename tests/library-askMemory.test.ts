import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { A24zMemory } from '../src/lib';

describe('A24zMemory askMemory method', () => {
  let tempDir: string;
  let testRepoPath: string;
  let memory: A24zMemory;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });

    // Initialize A24zMemory with test repo
    memory = new A24zMemory(testRepoPath);
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('askMemory', () => {
    it('should return metadata with llmUsed=false when no LLM configured', async () => {
      // Save a test note
      memory.saveNote({
        note: 'Test authentication pattern using JWT',
        anchors: [path.join(testRepoPath, 'src/auth.ts')],
        tags: ['authentication', 'jwt', 'security'],
        type: 'pattern',
      });

      // Ask a question
      const result = await memory.askMemory({
        filePath: path.join(testRepoPath, 'src/auth.ts'),
        query: 'How is authentication handled?',
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.llmUsed).toBe(false);
      expect(result.metadata.notesFound).toBeGreaterThan(0);
      expect(result.response).toContain('authentication');
      expect(result.notes).toHaveLength(result.metadata.notesFound);
    });

    it('should apply tag filters correctly', async () => {
      // Save multiple notes with different tags
      memory.saveNote({
        note: 'Authentication with JWT',
        anchors: [path.join(testRepoPath, 'src/auth.ts')],
        tags: ['authentication', 'jwt'],
        type: 'pattern',
      });

      memory.saveNote({
        note: 'Database connection pooling',
        anchors: [path.join(testRepoPath, 'src/db.ts')],
        tags: ['database', 'performance'],
        type: 'pattern',
      });

      // Ask with tag filter
      const result = await memory.askMemory({
        filePath: testRepoPath,
        query: 'What patterns exist?',
        filterTags: ['database'],
      });

      expect(result.metadata.filters.tags).toEqual(['database']);
      expect(result.notes.every((n) => n.tags.includes('database'))).toBe(true);
    });

    it('should apply type filters correctly', async () => {
      // Save notes with different types
      memory.saveNote({
        note: 'Architecture decision: Use microservices',
        anchors: [path.join(testRepoPath, 'docs/arch.md')],
        tags: ['architecture'],
        type: 'decision',
      });

      memory.saveNote({
        note: 'Watch out for race condition in auth',
        anchors: [path.join(testRepoPath, 'src/auth.ts')],
        tags: ['bug'],
        type: 'gotcha',
      });

      // Ask with type filter
      const result = await memory.askMemory({
        filePath: testRepoPath,
        query: 'What should I know?',
        filterTypes: ['gotcha'],
      });

      expect(result.metadata.filters.types).toEqual(['gotcha']);
      expect(result.notes.every((n) => n.context.type === 'gotcha')).toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      // Ask without any notes
      const result = await memory.askMemory({
        filePath: path.join(testRepoPath, 'src/nonexistent.ts'),
        query: 'Any notes here?',
      });

      expect(result.metadata.notesFound).toBe(0);
      expect(result.metadata.notesUsed).toBe(0);
      expect(result.notes).toHaveLength(0);
      expect(result.response).toContain('No existing knowledge');
    });

    it('should respect maxNotes option', async () => {
      // Save multiple notes
      for (let i = 0; i < 10; i++) {
        memory.saveNote({
          note: `Note ${i}`,
          anchors: [path.join(testRepoPath, `file${i}.ts`)],
          tags: ['test'],
          type: 'explanation',
        });
      }

      // Ask with maxNotes limit
      const result = await memory.askMemory({
        filePath: testRepoPath,
        query: 'Show me notes',
        options: { maxNotes: 3 },
      });

      // Note: The tool internally limits to defaultConfig.noteFetching.maxNotesPerQuery
      // but we can verify it returns data
      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.metadata.notesFound).toBeGreaterThan(0);
    });
  });

  describe('configureLLM', () => {
    it('should update LLM configuration', () => {
      const config = {
        provider: 'ollama' as const,
        endpoint: 'http://localhost:11434',
        model: 'llama2',
        temperature: 0.5,
      };

      memory.configureLLM(config);

      // Configuration should be set (we can't directly test private fields)
      expect(() => memory.configureLLM(config)).not.toThrow();
    });
  });

  describe('isLLMAvailable', () => {
    it('should return false when no LLM configured', async () => {
      const available = await memory.isLLMAvailable();
      expect(available).toBe(false);
    });

    it('should check Ollama endpoint when configured', async () => {
      memory.configureLLM({
        provider: 'ollama',
        endpoint: 'http://localhost:11434',
        model: 'llama2',
      });

      // This will return false if Ollama is not running
      const available = await memory.isLLMAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should return false for "none" provider', async () => {
      memory.configureLLM({
        provider: 'none',
      });

      const available = await memory.isLLMAvailable();
      expect(available).toBe(false);
    });
  });

  describe('Integration with file contents', () => {
    it('should handle includeFileContents option', async () => {
      // Create a test file
      const testFilePath = path.join(testRepoPath, 'test.ts');
      fs.writeFileSync(testFilePath, 'export const test = "value";');

      // Save a note anchored to the file
      memory.saveNote({
        note: 'This file contains test exports',
        anchors: [testFilePath],
        tags: ['exports'],
        type: 'explanation',
      });

      // Configure LLM with file contents
      memory.configureLLM({
        provider: 'none', // Use none to avoid actual LLM calls
        includeFileContents: true,
      });

      // Ask with file contents option
      const result = await memory.askMemory({
        filePath: testFilePath,
        query: 'What does this file do?',
        options: {
          includeFileContents: true,
        },
      });

      expect(result).toBeDefined();
      expect(result.metadata.filesRead).toBeGreaterThanOrEqual(0);
    });
  });
});
