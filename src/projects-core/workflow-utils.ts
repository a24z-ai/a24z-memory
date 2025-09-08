import { FileSystemAdapter } from '../pure-core/abstractions/filesystem';

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
 * Check if a project has .a24z memory notes
 * @param fs - File system adapter
 * @param projectPath - The path to the git repository
 * @returns True if .a24z directory exists with notes
 */
export function hasMemoryNotes(fs: FileSystemAdapter, projectPath: string): boolean {
  const notesPath = fs.join(projectPath, '.a24z', 'notes');
  return fs.exists(notesPath);
}
