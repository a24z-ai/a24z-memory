/**
 * Repository types for standardizing GitHub repository metadata
 * between code-city-landing, alexandria, and a24z-Memory project registry
 */

import type { CodebaseViewSummary } from './summary';
import type { ValidatedRepositoryPath } from './index';

/**
 * A validated Alexandria data directory path (.alexandria)
 * This type ensures the path has been validated to exist and be writable
 */
export type ValidatedAlexandriaPath = string & { __alexandriaPath: true };

/**
 * Pure GitHub repository metadata
 * Standard fields from GitHub API
 */
export interface GithubRepository {
  /** Repository identifier in owner/name format */
  id: string;

  /** Repository owner (username or organization) */
  owner: string;

  /** Repository name */
  name: string;

  /** Repository description */
  description?: string;

  /** Number of GitHub stars */
  stars: number;

  /** Primary programming language */
  primaryLanguage?: string;

  /** Repository topics from GitHub */
  topics?: string[];

  /** License identifier (e.g., "MIT", "Apache-2.0") */
  license?: string;

  /** ISO timestamp of last commit */
  lastCommit?: string;

  /** Default branch name (e.g., "main", "master") */
  defaultBranch?: string;

  /** Whether repository is public */
  isPublic?: boolean;

  /** ISO timestamp when GitHub metadata was last updated */
  lastUpdated: string;
}

/**
 * Alexandria repository with optional GitHub remote information
 * Base type for repositories in the Alexandria ecosystem
 */
export interface AlexandriaRepository {
  /** Project/repository name */
  name: string;

  /** Git remote URL */
  remoteUrl?: string;

  /** ISO timestamp when repository was registered */
  registeredAt: string;

  /** GitHub metadata when available */
  github?: GithubRepository;

  /** Whether repository has .alexandria/views directory */
  hasViews: boolean;

  /** Number of CodebaseView files in .alexandria/views/ */
  viewCount: number;

  /** Summary information about each CodebaseView */
  views: CodebaseViewSummary[];

  /** ISO timestamp when metadata was last verified/refreshed */
  lastChecked?: string;
}

/**
 * Alexandria repository entry for local project registry
 * Extends AlexandriaRepository with required local path
 */
export interface AlexandriaEntry extends AlexandriaRepository {
  /** Local repository path (required for registry entries) */
  path: ValidatedRepositoryPath;
}

/**
 * Registry data structure for collections of Alexandria repositories
 */
export interface AlexandriaRepositoryRegistry {
  /** List of repositories */
  repositories: AlexandriaRepository[];

  /** Total number of repositories */
  total: number;

  /** ISO timestamp when registry was last updated */
  lastUpdated: string;
}
