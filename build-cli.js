#!/usr/bin/env node
/* eslint-env node */
import * as esbuild from 'esbuild';
import { chmod } from 'fs/promises';

// Build the CLI as a single bundled file
await esbuild.build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/cli.js',
  banner: {
    js: `#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);`,
  },
  external: [
    // Keep node built-ins external
    'node:*',
    // Keep peer dependencies external if needed
  ],
  minify: false, // Keep readable for debugging
  sourcemap: true,
});

// Make the CLI executable
await chmod('dist/cli.js', 0o755);

console.log('✅ CLI bundle built successfully');