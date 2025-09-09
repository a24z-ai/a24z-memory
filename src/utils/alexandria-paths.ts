import { existsSync } from 'fs';
import { join } from 'path';
import { ALEXANDRIA_DIRS } from '../constants/paths';
import { ValidatedRepositoryPath } from '../pure-core/types';

/**
 * Gets the Alexandria data directory for a project, with fallback to legacy name
 */
export function getAlexandriaDir(projectRoot: ValidatedRepositoryPath): string {
  const primaryPath = join(projectRoot, ALEXANDRIA_DIRS.PRIMARY);
  const legacyPath = join(projectRoot, ALEXANDRIA_DIRS.LEGACY);

  // Check if legacy directory exists
  if (existsSync(legacyPath) && !existsSync(primaryPath)) {
    return legacyPath;
  }

  // Default to primary (new standard)
  return primaryPath;
}

/**
 * Gets a specific subdirectory within the Alexandria directory
 */
export function getAlexandriaSubdir(projectRoot: ValidatedRepositoryPath, subdir: string): string {
  return join(getAlexandriaDir(projectRoot), subdir);
}

/**
 * Gets the views directory with fallback support
 */
export function getViewsDir(projectRoot: ValidatedRepositoryPath): string {
  return getAlexandriaSubdir(projectRoot, ALEXANDRIA_DIRS.VIEWS);
}

/**
 * Gets the notes directory with fallback support
 */
export function getNotesDir(projectRoot: ValidatedRepositoryPath): string {
  return getAlexandriaSubdir(projectRoot, ALEXANDRIA_DIRS.NOTES);
}

/**
 * Gets the overviews directory with fallback support
 */
export function getOverviewsDir(projectRoot: ValidatedRepositoryPath): string {
  return getAlexandriaSubdir(projectRoot, ALEXANDRIA_DIRS.OVERVIEWS);
}
