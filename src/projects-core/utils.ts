import { execSync } from 'child_process';

/**
 * Get the git remote URL for a repository
 * @param projectPath - The path to the git repository
 * @returns The remote URL or undefined if not found
 */
export function getGitRemoteUrl(projectPath: string): string | undefined {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: projectPath,
      encoding: 'utf-8',
    }).trim();

    return remoteUrl || undefined;
  } catch {
    // No remote URL or not a git repo
    return undefined;
  }
}
