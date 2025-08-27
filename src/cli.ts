#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { run } from './index';
import { migrateRepository } from './core-mcp/store/notesStore';

type Command = 'start' | 'install-cursor' | 'install-claude' | 'migrate' | 'help';

function getHome(): string {
  const homedir = os.homedir();
  if (!homedir) {
    throw new Error('Unable to resolve home directory');
  }
  return homedir;
}

function writeFileEnsured(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

function installCursor(): void {
  const configPath = path.join(getHome(), '.cursor', 'mcp.json');
  let existing: Record<string, unknown> = {};
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    existing = JSON.parse(content);
  } catch {
    existing = {};
  }

  if (typeof existing !== 'object' || existing === null) {
    existing = {};
  }

  const config = existing as { mcpServers?: Record<string, unknown> };
  if (!config.mcpServers) config.mcpServers = {};

  config.mcpServers['a24z-memory'] = {
    command: 'npx',
    args: ['a24z-memory'],
  };

  writeFileEnsured(configPath, JSON.stringify(config, null, 2));

  console.log(`Installed MCP server config for Cursor at ${configPath}`);
}

function installClaude(): void {
  const candidates = [
    path.join(getHome(), '.claude.json'),
    path.join(getHome(), '.config', 'claude', 'config.json'),
  ];
  let target = candidates.find((p) => fs.existsSync(p));
  if (!target) target = candidates[0];

  let existing: Record<string, unknown> = {};
  try {
    const content = fs.readFileSync(target, 'utf8');
    existing = JSON.parse(content);
  } catch {
    existing = {};
  }

  if (typeof existing !== 'object' || existing === null) {
    existing = {};
  }

  const config = existing as { mcpServers?: Record<string, unknown> };
  if (!config.mcpServers) config.mcpServers = {};

  config.mcpServers['a24z-memory'] = {
    command: 'npx',
    args: ['a24z-memory'],
  };

  writeFileEnsured(target, JSON.stringify(config, null, 2));

  console.log(`Installed MCP server config for Claude at ${target}`);
}

function printHelp(): void {
  console.log(`a24z-memory <command>

Commands:
  start                Start the MCP server (stdio)
  install-cursor       Add MCP config to ~/.cursor/mcp.json
  install-claude       Add MCP config to ~/.claude.json (or ~/.config/claude/config.json)
  migrate [path]       Migrate repository notes from JSON to file-based storage
                       Options: --force (re-migrate), --verbose (detailed output)
  help                 Show this help
`);
}

async function main(): Promise<void> {
  const [, , cmdArg, ...args] = process.argv;
  const cmd: Command = (cmdArg as Command) || 'start';
  switch (cmd) {
    case 'start':
      await run();
      break;
    case 'install-cursor':
      installCursor();
      break;
    case 'install-claude':
      installClaude();
      break;
    case 'migrate': {
      // Parse arguments
      const force = args.includes('--force');
      const verbose = args.includes('--verbose');
      const pathArg = args.find((arg) => !arg.startsWith('--'));
      const targetPath = pathArg || process.cwd();

      console.log(`\nMigrating repository: ${targetPath}`);
      console.log('='.repeat(50));

      const result = migrateRepository(targetPath, { force, verbose });

      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.notesCount !== undefined) {
          console.log(`📊 Total notes: ${result.notesCount}`);
        }
        if (result.backupPath) {
          console.log(`💾 Backup created: ${result.backupPath}`);
        }
      } else {
        console.error(`❌ ${result.message}`);
        if (result.error) {
          console.error(`   Error details: ${result.error}`);
        }
        process.exit(1);
      }
      break;
    }
    default:
      printHelp();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
