import { FileSystemAdapter } from '../pure-core/abstractions/filesystem';
import { ALEXANDRIA_DIRS } from '../constants/paths';

/**
 * Check if a project has the Alexandria workflow installed
 * @param fs - File system adapter
 * @param projectPath - The path to the git repository
 * @returns True if the workflow exists
 */
export function hasAlexandriaWorkflow(fs: FileSystemAdapter, projectPath: string): boolean {
  const workflowPath = fs.join(projectPath, '.github', 'workflows', 'alexandria.yml');
  return fs.exists(workflowPath);
}

/**
 * Check if a project has alexandria memory notes
 * @param fs - File system adapter
 * @param projectPath - The path to the git repository
 * @returns True if alexandria directory exists with notes
 */
export function hasMemoryNotes(fs: FileSystemAdapter, projectPath: string): boolean {
  const notesPath = fs.join(projectPath, ALEXANDRIA_DIRS.PRIMARY, ALEXANDRIA_DIRS.NOTES);
  return fs.exists(notesPath);
}
