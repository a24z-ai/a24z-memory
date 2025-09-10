/**
 * Alexandria path constants for consistent directory structure
 */

export const ALEXANDRIA_DIRS = {
  // Primary directory name
  PRIMARY: '.alexandria',

  // Subdirectories
  VIEWS: 'views',
  NOTES: 'notes',
  OVERVIEWS: 'overviews',
  CONFIG: 'config',

  // Global paths
  GLOBAL_DIR: '~/.alexandria',
  GLOBAL_PROJECTS_FILE: 'projects.json',

  // Config filenames
  CONFIG_FILES: ['.alexandriarc.json', '.alexandriarc', 'alexandria.json'],
} as const;

export type AlexandriaDir = (typeof ALEXANDRIA_DIRS)[keyof typeof ALEXANDRIA_DIRS];
