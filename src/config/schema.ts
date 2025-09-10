import { AlexandriaConfig } from './types';

export const ALEXANDRIA_SCHEMA_URL =
  'https://raw.githubusercontent.com/a24z-ai/alexandria/main/schema/alexandriarc.json';

export const DEFAULT_CONFIG: Partial<AlexandriaConfig> = {
  version: '1.0.0',
  context: {
    maxDepth: 10,
    followSymlinks: false,
    patterns: {
      exclude: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.next/**',
        '**/.nuxt/**',
        '**/.cache/**',
        '**/tmp/**',
        '**/*.log',
        '**/.DS_Store',
        '**/Thumbs.db',
      ],
    },
  },
  reporting: {
    output: 'console',
    format: 'text',
    verbose: false,
  },
};

export const CONFIG_FILENAME = '.alexandriarc.json';
export const CONFIG_FILENAMES = [
  '.alexandriarc.json',
  '.alexandriarc',
  'alexandria.config.json',
  'alexandria.json',
];
