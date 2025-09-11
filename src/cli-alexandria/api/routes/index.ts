import { Router } from 'express';
import type { AlexandriaOutpostManager } from '../AlexandriaOutpostManager.js';
import type { AlexandriaRepository } from '../../../pure-core/types/repository.js';
import { existsSync, createReadStream } from 'fs';
import { join } from 'path';

export function createRoutes(outpostManager: AlexandriaOutpostManager): Router {
  const router = Router();

  // GET /api/alexandria/repos - List all repositories
  router.get('/repos', async (req, res, next) => {
    try {
      const repos = await outpostManager.getAllRepositories();
      res.json({
        repositories: repos,
        total: repos.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/alexandria/repos/:owner/:name - Get a specific repository (with owner)
  router.get('/repos/:owner/:name', async (req, res, next) => {
    try {
      // For local repos, we ignore the owner param and just use the name
      // This supports the frontend's expectation of owner/repo pattern
      const repo = await outpostManager.getRepository(req.params.name);
      if (!repo) {
        return res.status(404).json({ 
          error: { 
            code: 'REPO_NOT_FOUND', 
            message: `Repository '${req.params.name}' not found` 
          }
        });
      }
      res.json(repo);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/alexandria/repos/:name - Get a specific repository (without owner)
  router.get('/repos/:name', async (req, res, next) => {
    try {
      const repo = await outpostManager.getRepository(req.params.name);
      if (!repo) {
        return res.status(404).json({ 
          error: { 
            code: 'REPO_NOT_FOUND', 
            message: `Repository '${req.params.name}' not found` 
          }
        });
      }
      res.json(repo);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/alexandria/repos - Register a new repository
  router.post('/repos', async (req, res, _next) => {
    try {
      const { name, path } = req.body;
      
      if (!name || !path) {
        return res.status(400).json({
          error: { 
            code: 'INVALID_REQUEST', 
            message: 'Both name and path are required' 
          }
        });
      }
      
      const repo = await outpostManager.registerRepository(name, path);
      res.json({
        success: true,
        repository: {
          ...repo,
          status: 'registered',
          message: 'Repository registered successfully'
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        res.status(409).json({
          error: { 
            code: 'ALREADY_EXISTS', 
            message: errorMessage 
          }
        });
      } else {
        res.status(400).json({
          error: { 
            code: 'REGISTRATION_FAILED', 
            message: errorMessage 
          }
        });
      }
    }
  });

  // GET /raw/:repo/* - Serve raw files from repository  
  // Using a custom route handler to capture the file path
  router.use('/raw/:repo', async (req, res, next) => {
    try {
      const { repo } = req.params;
      // Get the file path by removing the /raw/:repo/ prefix
      const filePath = req.path.substring(1); // Remove leading /
      
      // Get repository by name
      const repository = await outpostManager.getRepository(repo);
      if (!repository) {
        return res.status(404).json({
          error: { 
            code: 'REPO_NOT_FOUND', 
            message: `Repository '${repo}' not found` 
          }
        });
      }
      
      // Get the actual path from the repository data
      const repoPath = (repository as AlexandriaRepository & { path?: string }).path;
      if (!repoPath) {
        return res.status(500).json({
          error: { 
            code: 'NO_PATH', 
            message: 'Repository path not available' 
          }
        });
      }
      
      // Construct full file path
      const fullPath = join(repoPath, filePath);
      
      // Security check - ensure we're not going outside repo directory
      if (!fullPath.startsWith(repoPath)) {
        return res.status(403).json({
          error: { 
            code: 'FORBIDDEN', 
            message: 'Access denied' 
          }
        });
      }
      
      // Check if file exists
      if (!existsSync(fullPath)) {
        return res.status(404).json({
          error: { 
            code: 'FILE_NOT_FOUND', 
            message: `File not found: ${filePath}` 
          }
        });
      }
      
      // Stream the file
      res.type('text/plain');
      createReadStream(fullPath).pipe(res);
    } catch (error) {
      next(error);
    }
  });

  return router;
}