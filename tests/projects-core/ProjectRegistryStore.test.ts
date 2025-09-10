import { describe, it, expect, beforeEach } from 'bun:test';
import { ProjectRegistryStore } from '../../src/projects-core/ProjectRegistryStore';
import { InMemoryFileSystemAdapter } from '../test-adapters/InMemoryFileSystemAdapter';
import { ValidatedRepositoryPath } from '../../src/pure-core/types';

describe('ProjectRegistryStore', () => {
  let fs: InMemoryFileSystemAdapter;
  let store: ProjectRegistryStore;
  const homeDir = '/home/user';

  beforeEach(() => {
    fs = new InMemoryFileSystemAdapter();
    store = new ProjectRegistryStore(fs, homeDir);
  });

  describe('registerProject', () => {
    it('should register a new project', () => {
      const projectPath = '/home/user/projects/test-repo' as ValidatedRepositoryPath;
      const projectName = 'test-repo';
      const remoteUrl = 'https://github.com/user/test-repo.git';

      store.registerProject(projectName, projectPath, remoteUrl);

      const projects = store.listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        name: projectName,
        path: projectPath,
        remoteUrl: remoteUrl,
      });
      expect(projects[0].registeredAt).toBeDefined();
    });

    it('should register a project without remote URL', () => {
      const projectPath = '/home/user/projects/local-repo' as ValidatedRepositoryPath;
      const projectName = 'local-repo';

      store.registerProject(projectName, projectPath);

      const projects = store.listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe(projectName);
      expect(projects[0].path).toBe(projectPath);
      expect(projects[0].remoteUrl).toBeUndefined();
      expect(projects[0].registeredAt).toBeDefined();
    });

    it('should throw error for duplicate project name', () => {
      const projectPath1 = '/home/user/projects/repo1' as ValidatedRepositoryPath;
      const projectPath2 = '/home/user/projects/repo2' as ValidatedRepositoryPath;
      const projectName = 'my-project';

      store.registerProject(projectName, projectPath1);

      expect(() => {
        store.registerProject(projectName, projectPath2);
      }).toThrow(`Project with name '${projectName}' already exists`);
    });

    it('should throw error for duplicate project path', () => {
      const projectPath = '/home/user/projects/repo' as ValidatedRepositoryPath;
      const projectName1 = 'project1';
      const projectName2 = 'project2';

      store.registerProject(projectName1, projectPath);

      expect(() => {
        store.registerProject(projectName2, projectPath);
      }).toThrow(`Path already registered as '${projectName1}'`);
    });
  });

  describe('listProjects', () => {
    it('should return empty array when no projects registered', () => {
      const projects = store.listProjects();
      expect(projects).toEqual([]);
    });

    it('should return all registered projects', () => {
      const project1 = {
        name: 'project1',
        path: '/home/user/projects/project1' as ValidatedRepositoryPath,
        remoteUrl: 'https://github.com/user/project1.git',
      };
      const project2 = {
        name: 'project2',
        path: '/home/user/projects/project2' as ValidatedRepositoryPath,
      };

      store.registerProject(project1.name, project1.path, project1.remoteUrl);
      store.registerProject(project2.name, project2.path);

      const projects = store.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0]).toMatchObject(project1);
      expect(projects[1].name).toBe(project2.name);
      expect(projects[1].path).toBe(project2.path);
      expect(projects[1].remoteUrl).toBeUndefined();
    });
  });

  describe('getProject', () => {
    it('should return project by name', () => {
      const projectName = 'my-project';
      const projectPath = '/home/user/projects/my-project' as ValidatedRepositoryPath;
      const remoteUrl = 'https://github.com/user/my-project.git';

      store.registerProject(projectName, projectPath, remoteUrl);

      const project = store.getProject(projectName);
      expect(project).toBeDefined();
      expect(project).toMatchObject({
        name: projectName,
        path: projectPath,
        remoteUrl: remoteUrl,
      });
    });

    it('should return undefined for non-existent project', () => {
      const project = store.getProject('non-existent');
      expect(project).toBeUndefined();
    });
  });

  describe('removeProject', () => {
    it('should remove existing project', () => {
      const projectName = 'to-remove';
      const projectPath = '/home/user/projects/to-remove' as ValidatedRepositoryPath;

      store.registerProject(projectName, projectPath);
      expect(store.listProjects()).toHaveLength(1);

      const removed = store.removeProject(projectName);
      expect(removed).toBe(true);
      expect(store.listProjects()).toHaveLength(0);
    });

    it('should return false for non-existent project', () => {
      const removed = store.removeProject('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('updateProject', () => {
    it('should update project path', () => {
      const projectName = 'my-project';
      const oldPath = '/home/user/projects/old-location' as ValidatedRepositoryPath;
      const newPath = '/home/user/projects/new-location' as ValidatedRepositoryPath;

      store.registerProject(projectName, oldPath);
      store.updateProject(projectName, { path: newPath });

      const project = store.getProject(projectName);
      expect(project?.path).toBe(newPath);
    });

    it('should update project remote URL', () => {
      const projectName = 'my-project';
      const projectPath = '/home/user/projects/my-project' as ValidatedRepositoryPath;
      const oldRemote = 'https://github.com/user/old.git';
      const newRemote = 'https://github.com/user/new.git';

      store.registerProject(projectName, projectPath, oldRemote);
      store.updateProject(projectName, { remoteUrl: newRemote });

      const project = store.getProject(projectName);
      expect(project?.remoteUrl).toBe(newRemote);
    });

    it('should clear remote URL when undefined passed', () => {
      const projectName = 'my-project';
      const projectPath = '/home/user/projects/my-project' as ValidatedRepositoryPath;
      const remoteUrl = 'https://github.com/user/project.git';

      store.registerProject(projectName, projectPath, remoteUrl);
      store.updateProject(projectName, { remoteUrl: undefined });

      const project = store.getProject(projectName);
      expect(project?.remoteUrl).toBeUndefined();
    });

    it('should throw error for non-existent project', () => {
      expect(() => {
        store.updateProject('non-existent', { path: '/new/path' as ValidatedRepositoryPath });
      }).toThrow(`Project 'non-existent' not found`);
    });

    it('should throw error when new path already registered', () => {
      const project1 = {
        name: 'project1',
        path: '/home/user/projects/project1' as ValidatedRepositoryPath,
      };
      const project2 = {
        name: 'project2',
        path: '/home/user/projects/project2' as ValidatedRepositoryPath,
      };

      store.registerProject(project1.name, project1.path);
      store.registerProject(project2.name, project2.path);

      expect(() => {
        store.updateProject(project2.name, { path: project1.path });
      }).toThrow(`Path already registered as '${project1.name}'`);
    });
  });

  describe('persistence', () => {
    it('should persist projects across store instances', () => {
      const projectName = 'persistent-project';
      const projectPath = '/home/user/projects/persistent' as ValidatedRepositoryPath;

      store.registerProject(projectName, projectPath);

      // Create new store instance with same filesystem
      const newStore = new ProjectRegistryStore(fs, homeDir);
      const projects = newStore.listProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe(projectName);
      expect(projects[0].path).toBe(projectPath);
    });

    it('should handle corrupted registry file gracefully', () => {
      // Write invalid JSON to registry file
      const registryPath = '/home/user/.alexandria-memory/projects.json';
      fs.createDir('/home/user/.alexandria-memory');
      fs.writeFile(registryPath, 'invalid json content');

      // Should start with empty registry
      const projects = store.listProjects();
      expect(projects).toEqual([]);

      // Should be able to register new project
      const projectName = 'test';
      const projectPath = '/home/user/projects/test' as ValidatedRepositoryPath;
      store.registerProject(projectName, projectPath);

      expect(store.listProjects()).toHaveLength(1);
    });
  });
});
