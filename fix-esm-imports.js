#!/usr/bin/env node
/* eslint-env node */
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname } from 'path';

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function fixImports(dir) {
  const files = await readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dir, file.name);

    if (file.isDirectory()) {
      await fixImports(fullPath);
    } else if (file.name.endsWith('.js') && file.name !== 'cli.js') {
      // Skip cli.js as it's bundled
      let content = await readFile(fullPath, 'utf8');
      let modified = false;

      // Find all relative imports
      const importMatches = [
        ...content.matchAll(/from\s+['"](\.[^'"]+?)(?<!\.js)(?<!\.json)['"]/g),
      ];

      for (const match of importMatches) {
        const path = match[1];
        const basePath = join(dirname(fullPath), path);

        let replacement = path;
        if (await fileExists(basePath + '.js')) {
          replacement = path + '.js';
        } else if (await fileExists(join(basePath, 'index.js'))) {
          replacement = path + '/index.js';
        } else {
          // Default: add .js
          replacement = path + '.js';
        }

        if (replacement !== path) {
          content = content.replace(`from '${path}'`, `from '${replacement}'`);
          content = content.replace(`from "${path}"`, `from "${replacement}"`);
          modified = true;
        }
      }

      // Find all relative exports
      const exportMatches = [
        ...content.matchAll(
          /export\s+(?:\*|\{[^}]+\})\s+from\s+['"](\.[^'"]+?)(?<!\.js)(?<!\.json)['"]/g
        ),
      ];

      for (const match of exportMatches) {
        const path = match[1];
        const basePath = join(dirname(fullPath), path);

        let replacement = path;
        if (await fileExists(basePath + '.js')) {
          replacement = path + '.js';
        } else if (await fileExists(join(basePath, 'index.js'))) {
          replacement = path + '/index.js';
        } else {
          replacement = path + '.js';
        }

        if (replacement !== path) {
          content = content.replace(`from '${path}'`, `from '${replacement}'`);
          content = content.replace(`from "${path}"`, `from "${replacement}"`);
          modified = true;
        }
      }

      if (modified) {
        await writeFile(fullPath, content);
        console.log(`  Fixed: ${fullPath}`);
      }
    }
  }
}

console.log('Fixing ESM imports in dist directory...');
await fixImports('dist');
console.log('✅ All imports fixed');
