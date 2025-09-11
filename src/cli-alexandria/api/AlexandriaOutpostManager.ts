import { ProjectRegistryStore } from '../../projects-core/ProjectRegistryStore.js';
import { MemoryPalace } from '../../MemoryPalace.js';
import type { AlexandriaRepository, AlexandriaEntry } from '../../pure-core/types/repository.js';
import type { CodebaseViewSummary } from '../../pure-core/types/summary.js';
import { extractCodebaseViewSummary } from '../../pure-core/types/summary.js';
import type { ValidatedRepositoryPath } from '../../pure-core/types/index.js';

import { FileSystemAdapter } from '../../pure-core/abstractions/filesystem.js';

export class AlexandriaOutpostManager {
  constructor(
    private readonly projectRegistry: ProjectRegistryStore,
    private readonly fsAdapter: FileSystemAdapter
  ) {}

  async getAllRepositories(): Promise<AlexandriaRepository[]> {
    // Get all registered projects from existing registry
    const entries = this.projectRegistry.listProjects();
    
    // Transform each to API format
    const repositories = await Promise.all(
      entries.map(entry => this.transformToRepository(entry))
    );
    
    return repositories.filter(repo => repo !== null) as AlexandriaRepository[];
  }

  async getRepository(name: string): Promise<AlexandriaRepository | null> {
    const entry = this.projectRegistry.getProject(name);
    if (!entry) return null;
    
    return this.transformToRepository(entry);
  }

  async registerRepository(name: string, path: string): Promise<AlexandriaRepository> {
    // Use existing registry's register method
    this.projectRegistry.registerProject(name, path as ValidatedRepositoryPath);
    
    // Return the transformed repository
    const entry = this.projectRegistry.getProject(name);
    if (!entry) {
      throw new Error(`Failed to register repository ${name}`);
    }
    return this.transformToRepository(entry);
  }

  async getRepositoryByPath(path: string): Promise<AlexandriaRepository | null> {
    // Find repository by path
    const entries = this.projectRegistry.listProjects();
    const entry = entries.find(e => e.path === path);
    
    if (!entry) return null;
    return this.transformToRepository(entry);
  }

  private async transformToRepository(entry: AlexandriaEntry): Promise<AlexandriaRepository> {
    // Load views if not already loaded
    let views: CodebaseViewSummary[] = entry.views || [];
    
    if (views.length === 0) {
      try {
        // Create a new MemoryPalace instance for this repository
        const memoryPalace = new MemoryPalace(entry.path, this.fsAdapter);
        
        // Get views from the memory palace
        views = memoryPalace.listViews().map(v => extractCodebaseViewSummary(v));
      } catch (error) {
        // If we can't load views, continue with empty array
        console.debug(`Could not load views for ${entry.name}:`, error);
        views = [];
      }
    }
    
    // Extract owner from remote URL or use 'local'
    const owner = this.extractOwner(entry.remoteUrl) || 'local';
    
    // Return the transformed repository data compatible with AlexandriaRepository
    const repo: AlexandriaRepository = {
      name: entry.name,
      remoteUrl: entry.remoteUrl,
      registeredAt: entry.registeredAt,
      github: entry.github,
      hasViews: views.length > 0,
      viewCount: views.length,
      views
    };
    
    // Add additional properties for the API response
    return {
      ...repo,
      owner,
      path: entry.path,
      description: '', // Could be loaded from package.json or README
      stars: 0,
      tags: []
    } as AlexandriaRepository & { owner: string; path: string; description: string; stars: number; tags: string[] };
  }

  private extractOwner(remoteUrl?: string): string | null {
    if (!remoteUrl) return null;
    // Extract owner from git URL
    const match = remoteUrl.match(/github\.com[:/]([^/]+)/);
    return match ? match[1] : null;
  }
}