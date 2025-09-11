/**
 * Alexandria Outpost CLI Command
 * 
 * Manages the Alexandria Outpost UI server by launching the external
 * @a24z/alexandria-outpost package. Provides commands to start, stop, 
 * and check status of the outpost server.
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { LocalAPIServer } from '../api/server.js';
import { AlexandriaOutpostManager } from '../api/AlexandriaOutpostManager.js';
import { ProjectRegistryStore } from '../../projects-core/ProjectRegistryStore.js';
import { NodeFileSystemAdapter } from '../../node-adapters/NodeFileSystemAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Alexandria directory
const ALEXANDRIA_DIR = join(homedir(), '.alexandria');
const PID_FILE = join(ALEXANDRIA_DIR, 'outpost.pid');
const CONFIG_FILE = join(ALEXANDRIA_DIR, 'outpost.config.json');

interface OutpostConfig {
  port: number;
  apiUrl: string;
  startedAt: string;
}

/**
 * Ensure Alexandria directory exists
 */
function ensureAlexandriaDir() {
  if (!existsSync(ALEXANDRIA_DIR)) {
    mkdirSync(ALEXANDRIA_DIR, { recursive: true });
  }
}

/**
 * Check if outpost server is running
 */
function isOutpostRunning(): { running: boolean; pid?: number; config?: OutpostConfig } {
  if (!existsSync(PID_FILE)) {
    return { running: false };
  }

  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim());
    
    // Check if process is actually running
    process.kill(pid, 0);
    
    // Load config if available
    let config: OutpostConfig | undefined;
    if (existsSync(CONFIG_FILE)) {
      config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
    
    return { running: true, pid, config };
  } catch {
    // Process doesn't exist, clean up stale PID file
    unlinkSync(PID_FILE);
    if (existsSync(CONFIG_FILE)) {
      unlinkSync(CONFIG_FILE);
    }
    return { running: false };
  }
}

/**
 * Save PID and config for running server
 */
function saveServerInfo(pid: number, config: OutpostConfig) {
  ensureAlexandriaDir();
  writeFileSync(PID_FILE, pid.toString());
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Clean up server info files
 */
function cleanupServerInfo() {
  if (existsSync(PID_FILE)) {
    unlinkSync(PID_FILE);
  }
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE);
  }
}

/**
 * Get the path to the alexandria-outpost executable
 */
function getOutpostExecutablePath(): string {
  // In the bundled CLI, __dirname will be the dist folder
  // We need to find the node_modules relative to the project root
  const possiblePaths = [
    // From dist/ folder to node_modules (bundled location)
    join(__dirname, '../node_modules/@a24z/alexandria-outpost/dist/cli.js'),
    // From dist/cli-alexandria/commands/ to node_modules (unbundled location)
    join(__dirname, '../../../node_modules/@a24z/alexandria-outpost/dist/cli.js'),
    // Direct path from cwd
    join(process.cwd(), 'node_modules/@a24z/alexandria-outpost/dist/cli.js'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error('Could not find alexandria-outpost executable. Please ensure @a24z/alexandria-outpost is installed.');
}

/**
 * Create the serve subcommand
 */
function createServeCommand() {
  const command = new Command('serve');
  
  command
    .description('Start the Alexandria Outpost UI server')
    .option('-p, --port <port>', 'Port to run the server on', '3003')
    .option('-a, --api-url <url>', 'API endpoint URL', 'https://git-gallery.com')
    .option('-d, --detached', 'Run server in background (detached mode)')
    .option('--no-open', 'Do not open browser automatically')
    .option('--local', 'Start local API server for serving local repositories')
    .option('--api-port <port>', 'Port for the local API server', '3002')
    .action(async (options) => {
      // Check if already running
      const status = isOutpostRunning();
      if (status.running) {
        console.log(chalk.yellow(`⚠️  Outpost server is already running on PID ${status.pid}`));
        if (status.config) {
          console.log(chalk.dim(`   Port: ${status.config.port}`));
          console.log(chalk.dim(`   API: ${status.config.apiUrl}`));
        }
        process.exit(1);
      }

      const port = parseInt(options.port);
      let apiUrl = options.apiUrl;
      let apiServer: LocalAPIServer | undefined;

      // Start local API server if --local flag is set
      if (options.local) {
        const apiPort = parseInt(options.apiPort);
        
        console.log(chalk.blue('🚀 Starting local API server...'));
        console.log(chalk.dim(`   API Port: ${apiPort}`));
        
        try {
          // Create filesystem adapter
          const fsAdapter = new NodeFileSystemAdapter();
          
          // Use existing ProjectRegistryStore
          const projectRegistry = new ProjectRegistryStore(fsAdapter, homedir());
          
          // Note: MemoryPalace is used within AlexandriaOutpostManager for loading views
          
          // Create manager to handle outpost operations
          const outpostManager = new AlexandriaOutpostManager(
            projectRegistry,
            fsAdapter
          );
          
          // Create and start API server
          apiServer = new LocalAPIServer({
            port: apiPort,
            outpostManager,
            corsOrigins: [`http://localhost:${port}`]
          });
          
          await apiServer.start();
          apiUrl = `http://localhost:${apiPort}`;
          
          const projects = projectRegistry.listProjects();
          console.log(chalk.green(`✅ Local API server started`));
          console.log(chalk.dim(`   Serving ${projects.length} registered repositories`));
        } catch (error) {
          console.error(chalk.red(`❌ Failed to start local API server: ${error}`));
          process.exit(1);
        }
      }

      console.log(chalk.blue('🚀 Starting Alexandria Outpost UI server...'));
      console.log(chalk.dim(`   Port: ${port}`));
      console.log(chalk.dim(`   API: ${apiUrl}`));

      try {
        const outpostPath = getOutpostExecutablePath();
        
        // Build command arguments
        const args = [
          outpostPath,
          'serve',
          '--port', port.toString(),
          '--api-url', apiUrl
        ];
        
        // Add --no-open flag if specified or in detached mode
        if (!options.open || options.detached) {
          args.push('--no-open');
        }

        if (options.detached) {
          // Run in detached mode
          const child = spawn('node', args, {
            detached: true,
            stdio: 'ignore'
          });

          if (child.pid) {
            // Detach from parent
            child.unref();
            
            const config: OutpostConfig = {
              port,
              apiUrl,
              startedAt: new Date().toISOString()
            };
            
            saveServerInfo(child.pid, config);
            
            console.log(chalk.green(`✅ Outpost server started in background (PID: ${child.pid})`));
            console.log(chalk.dim(`   Access the UI at: http://localhost:${port}`));
            console.log(chalk.dim(`   Stop with: alexandria outpost kill`));
          } else {
            throw new Error('Failed to start detached process');
          }
        } else {
          // Run in foreground
          const child = spawn('node', args, {
            stdio: 'inherit'
          });

          // Handle process termination
          child.on('exit', async (code) => {
            // Stop API server if running
            if (apiServer) {
              console.log(chalk.blue('🛑 Stopping local API server...'));
              await apiServer.stop();
            }
            
            if (code !== 0) {
              console.error(chalk.red(`❌ Outpost server exited with code ${code}`));
            }
            process.exit(code || 0);
          });

          // Handle signals for graceful shutdown
          process.on('SIGINT', async () => {
            // Stop API server if running
            if (apiServer) {
              console.log(chalk.blue('🛑 Stopping local API server...'));
              await apiServer.stop();
            }
            child.kill('SIGINT');
          });
          process.on('SIGTERM', async () => {
            // Stop API server if running
            if (apiServer) {
              console.log(chalk.blue('🛑 Stopping local API server...'));
              await apiServer.stop();
            }
            child.kill('SIGTERM');
          });
        }
      } catch (error) {
        console.error(chalk.red(`❌ Failed to start Outpost server: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Create the status subcommand
 */
function createStatusCommand() {
  const command = new Command('status');
  
  command
    .description('Check status of Alexandria Outpost server')
    .action(() => {
      const status = isOutpostRunning();
      
      if (status.running) {
        console.log(chalk.green(`✅ Outpost server is running`));
        console.log(chalk.dim(`   PID: ${status.pid}`));
        
        if (status.config) {
          console.log(chalk.dim(`   Port: ${status.config.port}`));
          console.log(chalk.dim(`   API: ${status.config.apiUrl}`));
          console.log(chalk.dim(`   Started: ${status.config.startedAt}`));
          console.log(chalk.dim(`   URL: http://localhost:${status.config.port}`));
        }
      } else {
        console.log(chalk.yellow('⚠️  No Outpost server is currently running'));
        console.log(chalk.dim('   Start with: alexandria outpost serve'));
      }
    });

  return command;
}

/**
 * Create the kill subcommand
 */
function createKillCommand() {
  const command = new Command('kill');
  
  command
    .description('Stop the running Alexandria Outpost server')
    .action(() => {
      const status = isOutpostRunning();
      
      if (!status.running) {
        console.log(chalk.yellow('⚠️  No Outpost server is currently running'));
        return;
      }

      try {
        console.log(chalk.blue(`🛑 Stopping Outpost server (PID: ${status.pid})...`));
        
        // Send SIGTERM to gracefully shutdown
        process.kill(status.pid!, 'SIGTERM');
        
        // Wait a moment for process to terminate
        global.setTimeout(() => {
          try {
            // Check if still running
            process.kill(status.pid!, 0);
            // If we get here, process is still running, force kill
            console.log(chalk.yellow('   Process did not terminate, forcing...'));
            process.kill(status.pid!, 'SIGKILL');
          } catch {
            // Process is gone, good
          }
          
          // Clean up files
          cleanupServerInfo();
          console.log(chalk.green('✅ Outpost server stopped successfully'));
        }, 1000);
        
      } catch (error) {
        console.error(chalk.red(`❌ Failed to stop server: ${error}`));
        
        // Try to clean up files anyway
        cleanupServerInfo();
      }
    });

  return command;
}

/**
 * Create the main outpost command
 */
export function createOutpostCommand() {
  const command = new Command('outpost');
  
  command
    .description('Manage Alexandria Outpost UI server')
    .addCommand(createServeCommand())
    .addCommand(createStatusCommand())
    .addCommand(createKillCommand());

  return command;
}