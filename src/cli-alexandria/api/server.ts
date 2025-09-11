import express, { type Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import { createRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error.js';
import type { AlexandriaOutpostManager } from './AlexandriaOutpostManager.js';

export interface LocalAPIServerOptions {
  port: number;
  outpostManager: AlexandriaOutpostManager;
  corsOrigins?: string[];
}

export class LocalAPIServer {
  private app: Express;
  private port: number;
  private outpostManager: AlexandriaOutpostManager;
  private server: ReturnType<Express['listen']> | undefined;

  constructor(options: LocalAPIServerOptions) {
    this.port = options.port;
    this.outpostManager = options.outpostManager;
    this.app = express();
    
    this.setupMiddleware(options.corsOrigins);
    this.setupRoutes();
  }

  private setupMiddleware(corsOrigins?: string[]): void {
    // Enable CORS with explicit OPTIONS handling
    this.app.use(cors({
      origin: corsOrigins || ['http://localhost:3003', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204
    }));

    // Enable compression
    this.app.use(compression());

    // Parse JSON bodies
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Mount API routes
    const routes = createRoutes(this.outpostManager);
    this.app.use('/api/alexandria', routes);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Error handling middleware (must be last)
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Alexandria Outpost API server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err?: Error) => {
          if (err) {
            reject(err);
          } else {
            console.log('Alexandria Outpost API server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}