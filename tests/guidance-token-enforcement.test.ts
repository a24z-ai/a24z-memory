/**
 * Tests for mandatory guidance token enforcement
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
// import { saveNote } from "../../../src/core-mcp/store/anchoredNotesStore"; - removed unused import
import { CreateRepositoryAnchoredNoteTool } from '../src/core-mcp/tools/CreateRepositoryAnchoredNoteTool';
import { GuidanceTokenManager } from '../src/core-mcp/services/guidance-token-manager';

describe('Mandatory Guidance Token Enforcement', () => {
  let tempDir: string;
  let testRepoPath: string;
  let tool: CreateRepositoryAnchoredNoteTool;
  let tokenManager: GuidanceTokenManager;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });

    tool = new CreateRepositoryAnchoredNoteTool();
    tokenManager = new GuidanceTokenManager();
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Note creation (guidance tokens always required)', () => {
    it('should reject note creation without guidance token', async () => {
      const input = {
        note: 'Test note without token',
        directoryPath: testRepoPath,
        anchors: ['test.ts'],
        tags: ['test'],
      };

      await expect(tool.execute(input)).rejects.toThrow('Guidance token required');
    });

    it('should reject note creation with invalid token', async () => {
      const input = {
        note: 'Test note with invalid token',
        directoryPath: testRepoPath,
        anchors: ['test.ts'],
        tags: ['test'],
        guidanceToken: 'invalid-token',
      };

      await expect(tool.execute(input)).rejects.toThrow('Invalid or expired guidance token');
    });

    it('should accept note creation with valid token', async () => {
      // Create guidance file first
      const guidanceContent = 'This is test guidance for the repository';
      const a24zDir = path.join(testRepoPath, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), guidanceContent);

      // Import generateFullGuidanceContent to generate the full content like the tool does
      const { generateFullGuidanceContent } = require('../src/core-mcp/utils/guidanceGenerator');
      const fullContent = generateFullGuidanceContent(testRepoPath);
      const validToken = tokenManager.generateToken(fullContent, testRepoPath);

      const input = {
        note: 'Test note with valid token',
        directoryPath: testRepoPath,
        anchors: ['test.ts'],
        tags: ['test'],
        guidanceToken: validToken,
      };

      const result = await tool.execute(input);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Note saved successfully');
    });

    it('should reject token when guidance content changes', async () => {
      // Generate token for original content
      const originalContent = 'Original guidance content';
      const token = tokenManager.generateToken(originalContent, testRepoPath);

      // Create guidance file with different content
      const a24zDir = path.join(testRepoPath, '.a24z');
      fs.mkdirSync(a24zDir, { recursive: true });
      fs.writeFileSync(path.join(a24zDir, 'note-guidance.md'), 'Changed guidance content');

      const input = {
        note: 'Test note with outdated token',
        directoryPath: testRepoPath,
        anchors: ['test.ts'],
        tags: ['test'],
        guidanceToken: token,
      };

      await expect(tool.execute(input)).rejects.toThrow('Invalid or expired guidance token');
    });
  });
});
