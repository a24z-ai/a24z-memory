#!/usr/bin/env node
/* eslint-env node */

import { spawn } from 'child_process';

const TIMEOUT = 10000; // 10 seconds timeout

async function testMCPServer() {
  console.log('🧪 Testing MCP server build and startup...');
  
  return new Promise((resolve, reject) => {
    // Start the MCP server
    const server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    let output = '';
    let errorOutput = '';
    let resolved = false;
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        server.kill();
        reject(new Error(`Server failed to start within ${TIMEOUT}ms`));
      }
    }, TIMEOUT);
    
    // Send initial MCP handshake
    const initMessage = JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      },
      id: 1
    }) + '\n';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      
      // Check if server is ready (look for MCP response)
      if (!resolved && (output.includes('"jsonrpc"') && output.includes('"result"'))) {
        resolved = true;
        clearTimeout(timeoutId);
        console.log('✅ MCP server started successfully and responded to initialization');
        server.kill();
        resolve(true);
      }
    });
    
    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // MCP servers may output debug info to stderr, which is normal
      if (errorOutput.includes('error') || errorOutput.includes('Error')) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          server.kill();
          reject(new Error(`Server error: ${errorOutput}`));
        }
      }
    });
    
    server.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        reject(new Error(`Failed to start server: ${error.message}`));
      }
    });
    
    server.on('exit', (code, signal) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        if (code !== 0 && code !== null) {
          reject(new Error(`Server exited with code ${code}\nStderr: ${errorOutput}`));
        }
      }
    });
    
    // Send initialization after a brief delay to ensure server is listening
    setTimeout(() => {
      try {
        server.stdin.write(initMessage);
      } catch (error) {
        // Ignore write errors as server might have already responded
      }
    }, 500);
  });
}

// Run the test
testMCPServer()
  .then(() => {
    console.log('✅ MCP server test passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MCP server test failed:', error.message);
    process.exit(1);
  });