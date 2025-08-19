import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Create a temporary directory for tests that need it
const TEST_DIR = path.join(os.tmpdir(), 'a24z-memory-tests');

beforeEach(() => {
  // Clean up test directory before each test
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  // Clean up after each test
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

export { TEST_DIR };