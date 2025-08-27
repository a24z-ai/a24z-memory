import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

// Base directory for all tests
const BASE_TEST_DIR = path.join(os.tmpdir(), 'a24z-memory-tests');

// Create a unique directory for this test run to avoid conflicts
const TEST_RUN_ID = crypto.randomUUID().slice(0, 8);
const TEST_DIR = path.join(BASE_TEST_DIR, `run-${TEST_RUN_ID}`);

// Ensure the test directory exists at startup
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Global cleanup function for end of test run
function cleanupAllTestDirs() {
  try {
    if (fs.existsSync(BASE_TEST_DIR)) {
      // Clean up old test run directories (older than 1 hour)
      const entries = fs.readdirSync(BASE_TEST_DIR, { withFileTypes: true });
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('run-')) {
          const dirPath = path.join(BASE_TEST_DIR, entry.name);
          try {
            const stats = fs.statSync(dirPath);
            if (stats.mtime.getTime() < oneHourAgo) {
              fs.rmSync(dirPath, { recursive: true, force: true });
            }
          } catch {
            // Skip directories we can't clean
          }
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Clean up at exit
process.on('exit', cleanupAllTestDirs);
process.on('SIGINT', () => {
  cleanupAllTestDirs();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanupAllTestDirs();
  process.exit();
});

// No global beforeEach/afterEach - let individual tests manage their directories

export { TEST_DIR };
