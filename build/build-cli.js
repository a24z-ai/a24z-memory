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
    js: `#!/usr/bin/env node`,
  },
  external: [
    // Keep node built-ins external
    'node:*',
    // Keep problematic packages external to avoid dynamic require issues
    'fast-glob',
    'glob',
    '@modelcontextprotocol/sdk',
  ],
  packages: 'external', // Keep all node_modules external
  minify: false, // Keep readable for debugging
  sourcemap: true,
});

// Make the CLI executable
await chmod('dist/cli.js', 0o755);

console.log('✅ CLI bundle built successfully');
