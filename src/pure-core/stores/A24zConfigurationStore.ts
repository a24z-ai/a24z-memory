/**
 * Pure A24zConfigurationStore - Platform-agnostic configuration management
 *
 * Manages repository-level configuration for a24z-Memory including limits,
 * storage settings, and tag restrictions.
 */

import { FileSystemAdapter } from '../abstractions/filesystem';
import { MemoryPalaceConfiguration } from '../types';
import { ValidatedAlexandriaPath } from '../types/repository';
import { DEFAULT_REPOSITORY_CONFIG } from '../config/defaultConfig';

// ============================================================================
// A24zConfigurationStore Class
// ============================================================================

export class A24zConfigurationStore {
  private fs: FileSystemAdapter;
  private alexandriaPath: ValidatedAlexandriaPath;
  private configPath: string;

  constructor(fileSystemAdapter: FileSystemAdapter, alexandriaPath: ValidatedAlexandriaPath) {
    this.fs = fileSystemAdapter;
    this.alexandriaPath = alexandriaPath;
    this.configPath = this.fs.join(alexandriaPath, 'config.json');
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  private readonly DEFAULT_CONFIG: MemoryPalaceConfiguration = DEFAULT_REPOSITORY_CONFIG;

  /**
   * Get repository configuration
   */
  getConfiguration(): MemoryPalaceConfiguration {
    const configPath = this.configPath;

    if (!this.fs.exists(configPath)) {
      return { ...this.DEFAULT_CONFIG };
    }

    try {
      const content = this.fs.readFile(configPath);
      const config = JSON.parse(content);

      // Merge with defaults to ensure all fields exist
      return {
        ...this.DEFAULT_CONFIG,
        ...config,
        limits: { ...this.DEFAULT_CONFIG.limits, ...config.limits },
        storage: { ...this.DEFAULT_CONFIG.storage, ...config.storage },
        tags: { ...this.DEFAULT_CONFIG.tags, ...config.tags },
      };
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error);
      return { ...this.DEFAULT_CONFIG };
    }
  }

  /**
   * Update repository configuration
   */
  updateConfiguration(updates: Partial<MemoryPalaceConfiguration>): MemoryPalaceConfiguration {
    const current = this.getConfiguration();
    const updated = {
      ...current,
      ...updates,
      limits: { ...current.limits, ...updates.limits },
      storage: { ...current.storage, ...updates.storage },
      tags: { ...current.tags, ...updates.tags },
    };

    const configPath = this.configPath;
    this.fs.writeFile(configPath, JSON.stringify(updated, null, 2));

    return updated;
  }

  /**
   * Reset configuration to defaults
   */
  resetConfiguration(): MemoryPalaceConfiguration {
    const configPath = this.configPath;
    const defaultConfig = { ...this.DEFAULT_CONFIG };

    this.fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  /**
   * Check if custom configuration exists
   */
  hasCustomConfiguration(): boolean {
    const configPath = this.configPath;
    return this.fs.exists(configPath);
  }

  /**
   * Delete configuration file (revert to defaults)
   */
  deleteConfiguration(): boolean {
    const configPath = this.configPath;
    if (this.fs.exists(configPath)) {
      this.fs.deleteFile(configPath);
      return true;
    }
    return false;
  }

  /**
   * Get default configuration (useful for comparison or reset)
   */
  getDefaultConfiguration(): MemoryPalaceConfiguration {
    return {
      version: this.DEFAULT_CONFIG.version,
      limits: { ...this.DEFAULT_CONFIG.limits },
      storage: { ...this.DEFAULT_CONFIG.storage },
      tags: { ...this.DEFAULT_CONFIG.tags },
    };
  }

  // ============================================================================
  // Tag Enforcement Management
  // ============================================================================

  /**
   * Get allowed tags info (enforcement status and tag list)
   */
  getAllowedTags(): {
    enforced: boolean;
    tags: string[];
  } {
    const config = this.getConfiguration();
    const enforced = config.tags?.enforceAllowedTags || false;

    if (enforced) {
      // When enforcement is on, we need to get tags from tag descriptions
      // This requires access to the tags directory, but since this is configuration-related,
      // we'll return empty array and let the caller handle tag discovery
      console.warn(
        'getAllowedTags: Tag enforcement is enabled but tag discovery requires AnchoredNotesStore'
      );
      return { enforced, tags: [] };
    }

    return { enforced, tags: [] };
  }

  /**
   * Set tag enforcement on/off
   */
  setEnforceAllowedTags(enforce: boolean): void {
    const currentConfig = this.getConfiguration();

    this.updateConfiguration({
      tags: {
        ...currentConfig.tags,
        enforceAllowedTags: enforce,
      },
    });
  }

  /**
   * Check if tag enforcement is enabled
   */
  isTagEnforcementEnabled(): boolean {
    const config = this.getConfiguration();
    return config.tags?.enforceAllowedTags || false;
  }
}
