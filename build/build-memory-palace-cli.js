#!/usr/bin/env node
/* eslint-env node */
import * as esbuild from 'esbuild';
import { chmod } from 'fs/promises';

// Build the Memory Palace CLI as a single bundled file
await esbuild.build({
  entryPoints: ['src/memory-palace-cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/memory-palace-cli.js',
  banner: {
    js: `#!/usr/bin/env node`,
  },
  external: [
    // Keep node built-ins external
    'node:*',
    // Keep problematic packages external to avoid dynamic require issues
    'fast-glob',
    'glob',
    '@modelcontextprotocol/sdk',
    'commander',
  ],
  packages: 'external', // Keep all node_modules external
  minify: false, // Keep readable for debugging
  sourcemap: true,
});

// Make the CLI executable
await chmod('dist/memory-palace-cli.js', 0o755);

console.log('✅ Memory Palace CLI bundle built successfully');