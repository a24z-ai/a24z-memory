#!/usr/bin/env bun

/**
 * Test if Bun.secrets can be shared across processes
 */

import { spawn } from 'child_process';

const SERVICE_NAME = 'a24z-memory-test';
const KEY_NAME = 'test-api-key';

async function parentProcess() {
  console.log('Parent: Checking if Bun.secrets is available...');
  
  if (typeof Bun === 'undefined' || typeof Bun.secrets === 'undefined') {
    console.error('Parent: Bun.secrets not available. Run with: bun run cross-process-test.js');
    process.exit(1);
  }
  
  console.log('Parent: Storing test key...');
  await Bun.secrets.set({
    service: SERVICE_NAME,
    name: KEY_NAME,
    value: JSON.stringify({ apiKey: 'test-key-123', timestamp: Date.now() })
  });
  
  console.log('Parent: Key stored. Spawning child process...');
  
  // Spawn child process with same script
  const child = spawn('bun', [__filename, '--child'], {
    stdio: 'inherit',
    env: { ...process.env, IS_CHILD: 'true' }
  });
  
  child.on('exit', async (code) => {
    console.log(`\nParent: Child exited with code ${code}`);
    
    // Clean up
    console.log('Parent: Cleaning up test key...');
    await Bun.secrets.delete({
      service: SERVICE_NAME,
      name: KEY_NAME
    });
    
    if (code === 0) {
      console.log('\n✅ SUCCESS: Bun.secrets CAN be shared across processes!');
    } else {
      console.log('\n❌ FAILURE: Bun.secrets CANNOT be shared across processes');
    }
  });
}

async function childProcess() {
  console.log('Child: Starting child process...');
  
  if (typeof Bun === 'undefined' || typeof Bun.secrets === 'undefined') {
    console.error('Child: Bun.secrets not available');
    process.exit(1);
  }
  
  console.log('Child: Attempting to read parent\'s key...');
  
  try {
    const value = await Bun.secrets.get({
      service: SERVICE_NAME,
      name: KEY_NAME
    });
    
    if (value) {
      const data = JSON.parse(value);
      console.log('Child: Successfully read key:', data);
      process.exit(0); // Success
    } else {
      console.log('Child: No key found');
      process.exit(1); // Failure
    }
  } catch (error) {
    console.error('Child: Error reading key:', error);
    process.exit(1); // Failure
  }
}

// Main execution
if (process.env.IS_CHILD === 'true' || process.argv.includes('--child')) {
  childProcess();
} else {
  parentProcess();
}