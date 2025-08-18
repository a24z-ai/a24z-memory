import * as http from 'http';
import type { HttpBridgeRequest, HttpBridgeResponse } from '../types';

export interface HttpBridgeConfig {
  host: string;
  port: number;
  path: string;
  timeout?: number;
}

export class HttpBridgeClient {
  private config: HttpBridgeConfig;
  constructor(config: Partial<HttpBridgeConfig> = {}) {
    this.config = {
      host: config.host || process.env.HTTP_BRIDGE_HOST || 'localhost',
      port: config.port || parseInt(process.env.HTTP_BRIDGE_PORT || '3042'),
      path: config.path || '/mcp-message',
      timeout: config.timeout || 5000,
    };
  }

  async sendRequest(body: HttpBridgeRequest): Promise<HttpBridgeResponse> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(body);
      const options: http.RequestOptions = {
        hostname: this.config.host,
        port: this.config.port,
        path: this.config.path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        timeout: this.config.timeout,
      };
      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON response: ${data}`)); }
        });
      });
      req.on('error', error => reject(error));
      req.on('timeout', () => { req.destroy(); reject(new Error(`Request timeout after ${this.config.timeout}ms`)); });
      req.write(postData); req.end();
    });
  }
}


