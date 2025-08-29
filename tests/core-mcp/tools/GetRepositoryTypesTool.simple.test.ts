import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { GetRepositoryTypesTool } from '../../../src/core-mcp/tools/GetRepositoryTypesTool';
import { createTestGuidanceToken } from '../../test-helpers';

describe('GetRepositoryTypesTool', () => {
  let tool: GetRepositoryTypesTool;
  let testRepoPath: string;

  beforeAll(() => {
    tool = new GetRepositoryTypesTool();

    // Create a temporary git repository for testing
    testRepoPath = path.join(process.cwd(), 'test-temp-repo-types');

    // Clean up any existing test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }

    // Create test repository structure
    fs.mkdirSync(testRepoPath, { recursive: true });
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
    fs.writeFileSync(path.join(testRepoPath, 'test.ts'), 'console.log("test");');
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  it('should get repository types with guidance token', async () => {
    // Generate a guidance token
    const guidanceToken = createTestGuidanceToken(testRepoPath);

    const result = await tool.execute({
      path: testRepoPath,
      guidanceToken,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0]).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const content = JSON.parse(result.content[0].text!);
    expect(content.success).toBe(true);
    expect(content.path).toBe(testRepoPath);
    expect(content.typeRestrictions).toBeDefined();
    expect(content.commonTypes).toBeDefined();
    expect(content.commonTypes).toHaveLength(4); // explanation, decision, pattern, gotcha

    // Check common types structure
    const commonTypes = content.commonTypes;
    expect(commonTypes[0].name).toBe('explanation');
    expect(commonTypes[0].description).toContain('Explains how something works');
    expect(commonTypes[1].name).toBe('decision');
    expect(commonTypes[2].name).toBe('pattern');
    expect(commonTypes[3].name).toBe('gotcha');
  });

  it('should fail without guidance token', async () => {
    await expect(
      tool.execute({
        path: testRepoPath,
        guidanceToken: 'invalid-token',
      })
    ).rejects.toThrow();
  });

  it('should include guidance when requested', async () => {
    const guidanceToken = createTestGuidanceToken(testRepoPath);

    const result = await tool.execute({
      path: testRepoPath,
      includeGuidance: true,
      guidanceToken,
    });

    const content = JSON.parse(result.content[0].text!);
    expect(content.guidanceNote || content.repositoryGuidance).toBeDefined();
  });
});
