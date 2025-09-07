/**
 * Pure A24zConfigurationStore - Platform-agnostic configuration management
 *
 * Manages repository-level configuration for a24z-Memory including limits,
 * storage settings, and tag restrictions.
 */

import { FileSystemAdapter } from '../abstractions/filesystem';
import { RepositoryConfiguration, ValidatedRepositoryPath } from '../types';
import { DEFAULT_REPOSITORY_CONFIG } from '../config/defaultConfig';

// ============================================================================
// A24zConfigurationStore Class
// ============================================================================

export class A24zConfigurationStore {
  private fs: FileSystemAdapter;

  constructor(fileSystemAdapter: FileSystemAdapter) {
    this.fs = fileSystemAdapter;
  }

  // ============================================================================
  // Repository Validation
  // ============================================================================

  /**
   * Validate that we have a proper repository root path
   * The .a24z directory should exist or be creatable at this path
   */
  private validateRepositoryRoot(repositoryRootPath: ValidatedRepositoryPath): void {
    const a24zPath = this.fs.join(repositoryRootPath, '.a24z');

    // If .a24z already exists, we're good
    if (this.fs.exists(a24zPath)) {
      return;
    }

    // Try to create .a24z directory - this validates we can write here
    try {
      this.fs.createDir(a24zPath);
    } catch {
      throw new Error(
        `Invalid repository root path: ${repositoryRootPath}. ` +
          `Expected a repository root where .a24z directory can be created. ` +
          `Make sure the path exists and is writable.`
      );
    }
  }

  // ============================================================================
  // Path Utilities
  // ============================================================================

  /**
   * Get the .a24z directory path for a repository
   */
  private getA24zDir(repositoryRootPath: ValidatedRepositoryPath): string {
    return this.fs.join(repositoryRootPath, '.a24z');
  }

  /**
   * Get the config file path
   */
  private getConfigPath(repositoryRootPath: ValidatedRepositoryPath): string {
    return this.fs.join(this.getA24zDir(repositoryRootPath), 'config.json');
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  private readonly DEFAULT_CONFIG: RepositoryConfiguration = DEFAULT_REPOSITORY_CONFIG;

  /**
   * Get repository configuration
   */
  getConfiguration(repositoryRootPath: ValidatedRepositoryPath): RepositoryConfiguration {
    this.validateRepositoryRoot(repositoryRootPath);

    const configPath = this.getConfigPath(repositoryRootPath);

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
  updateConfiguration(
    repositoryRootPath: ValidatedRepositoryPath,
    updates: Partial<RepositoryConfiguration>
  ): RepositoryConfiguration {
    this.validateRepositoryRoot(repositoryRootPath);

    const current = this.getConfiguration(repositoryRootPath);
    const updated = {
      ...current,
      ...updates,
      limits: { ...current.limits, ...updates.limits },
      storage: { ...current.storage, ...updates.storage },
      tags: { ...current.tags, ...updates.tags },
    };

    const configPath = this.getConfigPath(repositoryRootPath);
    this.fs.writeFile(configPath, JSON.stringify(updated, null, 2));

    return updated;
  }

  /**
   * Reset configuration to defaults
   */
  resetConfiguration(repositoryRootPath: ValidatedRepositoryPath): RepositoryConfiguration {
    this.validateRepositoryRoot(repositoryRootPath);

    const configPath = this.getConfigPath(repositoryRootPath);
    const defaultConfig = { ...this.DEFAULT_CONFIG };

    this.fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  /**
   * Check if custom configuration exists
   */
  hasCustomConfiguration(repositoryRootPath: ValidatedRepositoryPath): boolean {
    this.validateRepositoryRoot(repositoryRootPath);

    const configPath = this.getConfigPath(repositoryRootPath);
    return this.fs.exists(configPath);
  }

  /**
   * Delete configuration file (revert to defaults)
   */
  deleteConfiguration(repositoryRootPath: ValidatedRepositoryPath): boolean {
    this.validateRepositoryRoot(repositoryRootPath);

    const configPath = this.getConfigPath(repositoryRootPath);
    if (this.fs.exists(configPath)) {
      this.fs.deleteFile(configPath);
      return true;
    }
    return false;
  }

  /**
   * Get default configuration (useful for comparison or reset)
   */
  getDefaultConfiguration(): RepositoryConfiguration {
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
  getAllowedTags(repositoryRootPath: ValidatedRepositoryPath): {
    enforced: boolean;
    tags: string[];
  } {
    this.validateRepositoryRoot(repositoryRootPath);
    const config = this.getConfiguration(repositoryRootPath);
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
  setEnforceAllowedTags(repositoryRootPath: ValidatedRepositoryPath, enforce: boolean): void {
    this.validateRepositoryRoot(repositoryRootPath);
    const currentConfig = this.getConfiguration(repositoryRootPath);

    this.updateConfiguration(repositoryRootPath, {
      tags: {
        ...currentConfig.tags,
        enforceAllowedTags: enforce,
      },
    });
  }

  /**
   * Check if tag enforcement is enabled
   */
  isTagEnforcementEnabled(repositoryRootPath: ValidatedRepositoryPath): boolean {
    const config = this.getConfiguration(repositoryRootPath);
    return config.tags?.enforceAllowedTags || false;
  }
}
