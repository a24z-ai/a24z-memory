/**
 * Pure ProjectRegistryStore - Platform-agnostic project registry management
 *
 * Manages a registry of local project paths with their git remotes
 */

import { FileSystemAdapter } from '../pure-core/abstractions/filesystem';
import { ValidatedRepositoryPath } from '../pure-core/types';
import { ProjectEntry, ProjectRegistryData } from './types';

export class ProjectRegistryStore {
  private fs: FileSystemAdapter;
  private registryPath: string;

  constructor(fileSystemAdapter: FileSystemAdapter, homeDir: string) {
    this.fs = fileSystemAdapter;
    this.registryPath = this.fs.join(homeDir, '.alexandria', 'projects.json');
  }

  /**
   * Ensure the registry directory exists
   */
  private ensureRegistryDir(): void {
    const registryDir = this.fs.dirname(this.registryPath);
    if (!this.fs.exists(registryDir)) {
      this.fs.createDir(registryDir);
    }
  }

  /**
   * Load the project registry
   */
  private loadRegistry(): ProjectRegistryData {
    this.ensureRegistryDir();

    if (!this.fs.exists(this.registryPath)) {
      return {
        version: '1.0.0',
        projects: [],
      };
    }

    try {
      const content = this.fs.readFile(this.registryPath);
      return JSON.parse(content) as ProjectRegistryData;
    } catch {
      return {
        version: '1.0.0',
        projects: [],
      };
    }
  }

  /**
   * Save the project registry
   */
  private saveRegistry(registry: ProjectRegistryData): void {
    this.ensureRegistryDir();
    this.fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
  }

  /**
   * Register a new project
   */
  public registerProject(
    name: string,
    projectPath: ValidatedRepositoryPath,
    remoteUrl?: string
  ): void {
    const registry = this.loadRegistry();

    // Check if name already exists
    if (registry.projects.some((p) => p.name === name)) {
      throw new Error(`Project with name '${name}' already exists`);
    }

    // Check if path already registered
    const existingProject = registry.projects.find((p) => p.path === projectPath);
    if (existingProject) {
      throw new Error(`Path already registered as '${existingProject.name}'`);
    }

    registry.projects.push({
      name,
      path: projectPath,
      remoteUrl,
      registeredAt: new Date().toISOString(),
    });

    this.saveRegistry(registry);
  }

  /**
   * List all registered projects
   */
  public listProjects(): ProjectEntry[] {
    const registry = this.loadRegistry();
    return registry.projects;
  }

  /**
   * Get a project by name
   */
  public getProject(name: string): ProjectEntry | undefined {
    const registry = this.loadRegistry();
    return registry.projects.find((p) => p.name === name);
  }

  /**
   * Remove a project from the registry
   */
  public removeProject(name: string): boolean {
    const registry = this.loadRegistry();
    const initialLength = registry.projects.length;
    registry.projects = registry.projects.filter((p) => p.name !== name);

    if (registry.projects.length < initialLength) {
      this.saveRegistry(registry);
      return true;
    }

    return false;
  }

  /**
   * Update a project's path or remote URL
   */
  public updateProject(
    name: string,
    updates: Partial<Omit<ProjectEntry, 'name' | 'registeredAt'>>
  ): void {
    const registry = this.loadRegistry();
    const project = registry.projects.find((p) => p.name === name);

    if (!project) {
      throw new Error(`Project '${name}' not found`);
    }

    if (updates.path) {
      // Check if new path is already registered
      const existingWithPath = registry.projects.find(
        (p) => p.path === updates.path && p.name !== name
      );
      if (existingWithPath) {
        throw new Error(`Path already registered as '${existingWithPath.name}'`);
      }
      project.path = updates.path;
    }

    if ('remoteUrl' in updates) {
      if (updates.remoteUrl === undefined) {
        delete project.remoteUrl;
      } else {
        project.remoteUrl = updates.remoteUrl;
      }
    }

    this.saveRegistry(registry);
  }
}
