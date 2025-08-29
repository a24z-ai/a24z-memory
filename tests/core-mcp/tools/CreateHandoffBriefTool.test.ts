import * as fs from 'fs';
import * as path from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { CreateHandoffBriefTool } from '../../../src/core-mcp/tools/CreateHandoffBriefTool';

describe('CreateHandoffBriefTool', () => {
  let testDir: string;
  let repoDir: string;
  let tool: CreateHandoffBriefTool;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await mkdtemp(path.join(tmpdir(), 'handoff-tool-test-'));
    repoDir = path.join(testDir, 'test-repo');

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });

    tool = new CreateHandoffBriefTool();
  });

  afterEach(async () => {
    // Clean up
    await rm(testDir, { recursive: true, force: true });
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('create_handoff_brief');
    expect(tool.description).toContain('handoff brief');
  });

  it('should create a handoff brief successfully', async () => {
    const input = {
      title: 'OAuth Migration',
      overview: 'Migrating authentication from JWT to OAuth',
      references: [
        {
          anchor: 'src/auth/oauth.ts',
          context: 'New OAuth implementation',
        },
        {
          anchor: 'tests/auth/',
          context: 'Test suite needs updating',
        },
      ],
      directoryPath: repoDir,
      ephemeral: false,
    };

    const result = await tool.execute(input);

    expect(result.isError).toBeFalsy();
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text as string;
    expect(text).toContain('✅ Handoff brief created successfully');
    expect(text).toContain('handoff-');
    expect(text).toContain('.a24z/handoffs');

    // Check file was actually created
    const handoffsDir = path.join(repoDir, '.a24z', 'handoffs');
    expect(fs.existsSync(handoffsDir)).toBe(true);

    // Find the created file
    const year = new Date().getFullYear().toString();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const yearMonthDir = path.join(handoffsDir, year, month);
    const files = fs.readdirSync(yearMonthDir);
    expect(files.length).toBe(1);

    // Check content
    const content = fs.readFileSync(path.join(yearMonthDir, files[0]), 'utf8');
    expect(content).toContain('# OAuth Migration');
    expect(content).toContain('Migrating authentication from JWT to OAuth');
    expect(content).toContain('`src/auth/oauth.ts`');
    expect(content).toContain('- New OAuth implementation');
  });

  it('should create an ephemeral handoff brief', async () => {
    const input = {
      title: 'Temporary Handoff',
      overview: 'This is temporary',
      references: [
        {
          anchor: 'src/temp.ts',
          context: 'Temporary fix',
        },
      ],
      directoryPath: repoDir,
      ephemeral: true,
    };

    const result = await tool.execute(input);

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text as string;
    expect(text).toContain('⚠️ This is an EPHEMERAL handoff');

    // Check the file content includes ephemeral marker
    const handoffsDir = path.join(repoDir, '.a24z', 'handoffs');
    const year = new Date().getFullYear().toString();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const yearMonthDir = path.join(handoffsDir, year, month);
    const files = fs.readdirSync(yearMonthDir);
    const content = fs.readFileSync(path.join(yearMonthDir, files[0]), 'utf8');

    expect(content).toContain('[EPHEMERAL: This handoff will be deleted after reading]');
    expect(content).toContain('This is temporary');
  });

  it('should handle empty references', async () => {
    const input = {
      title: 'No References',
      overview: 'Just an overview',
      references: [],
      directoryPath: repoDir,
      ephemeral: false,
    };

    const result = await tool.execute(input);

    expect(result.isError).toBeFalsy();

    // Check file content
    const handoffsDir = path.join(repoDir, '.a24z', 'handoffs');
    const year = new Date().getFullYear().toString();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const yearMonthDir = path.join(handoffsDir, year, month);
    const files = fs.readdirSync(yearMonthDir);
    const content = fs.readFileSync(path.join(yearMonthDir, files[0]), 'utf8');

    expect(content).toContain('# No References');
    expect(content).toContain('Just an overview');
    expect(content).toContain('## Code & Context');
    // Should not have any backtick-wrapped anchors
    expect(content.match(/`[^`]+`/g)).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const input = {
      title: 'Test',
      overview: 'Test',
      references: [],
      directoryPath: '/invalid/path/that/does/not/exist',
      ephemeral: false,
    };

    const result = await tool.execute(input);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('❌ Failed to create handoff brief');
  });

  it('should validate input schema', () => {
    // Test that schema requires all fields
    const validInput = {
      title: 'Test',
      overview: 'Test',
      references: [],
      directoryPath: '/path',
    };

    expect(() => tool.schema.parse(validInput)).not.toThrow();

    // Test missing required fields
    const invalidInput = {
      title: 'Test',
      // missing overview
      references: [],
      directoryPath: '/path',
    };

    expect(() => tool.schema.parse(invalidInput)).toThrow();
  });

  it('should handle multi-line overview', async () => {
    const input = {
      title: 'Complex Handoff',
      overview: `This is line one.
This is line two.

This is after a blank line.`,
      references: [],
      directoryPath: repoDir,
      ephemeral: false,
    };

    const result = await tool.execute(input);
    expect(result.isError).toBeFalsy();

    // Check the file content preserves multi-line structure
    const handoffsDir = path.join(repoDir, '.a24z', 'handoffs');
    const year = new Date().getFullYear().toString();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const yearMonthDir = path.join(handoffsDir, year, month);
    const files = fs.readdirSync(yearMonthDir);
    const content = fs.readFileSync(path.join(yearMonthDir, files[0]), 'utf8');

    expect(content).toContain(
      'This is line one.\nThis is line two.\n\nThis is after a blank line.'
    );
  });
});
