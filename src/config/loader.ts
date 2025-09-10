import { join, resolve } from 'path';
import { AlexandriaConfig } from './types';
import { CONFIG_FILENAMES, DEFAULT_CONFIG } from './schema';
import { FileSystemAdapter } from '../pure-core/abstractions/filesystem';

export class ConfigLoader {
  private configCache: Map<string, AlexandriaConfig> = new Map();
  private fsAdapter: FileSystemAdapter;

  constructor(fsAdapter: FileSystemAdapter) {
    this.fsAdapter = fsAdapter;
  }

  findConfigFile(startDir: string = process.cwd()): string | null {
    let currentDir = resolve(startDir);
    const root = resolve('/');

    while (currentDir !== root) {
      for (const filename of CONFIG_FILENAMES) {
        const configPath = join(currentDir, filename);
        if (this.fsAdapter.exists(configPath)) {
          return configPath;
        }
      }

      const parentDir = resolve(currentDir, '..');
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    return null;
  }

  loadConfig(configPath?: string): AlexandriaConfig | null {
    const path = configPath || this.findConfigFile();

    if (!path) {
      return null;
    }

    if (this.configCache.has(path)) {
      return this.configCache.get(path)!;
    }

    try {
      const content = this.fsAdapter.readFile(path);
      const config = JSON.parse(content) as AlexandriaConfig;

      const merged = this.mergeWithDefaults(config);
      this.configCache.set(path, merged);

      return merged;
    } catch (error) {
      console.error(`Failed to load config from ${path}:`, error);
      return null;
    }
  }

  private mergeWithDefaults(config: Partial<AlexandriaConfig>): AlexandriaConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      context: {
        ...DEFAULT_CONFIG.context,
        ...config.context,
        patterns: {
          ...DEFAULT_CONFIG.context?.patterns,
          ...config.context?.patterns,
        },
      },
      ai: {
        ...DEFAULT_CONFIG.ai,
        ...config.ai,
        contextWindow: {
          ...DEFAULT_CONFIG.ai?.contextWindow,
          ...config.ai?.contextWindow,
        },
      },
      reporting: {
        ...DEFAULT_CONFIG.reporting,
        ...config.reporting,
      },
    } as AlexandriaConfig;
  }

  clearCache(): void {
    this.configCache.clear();
  }
}
