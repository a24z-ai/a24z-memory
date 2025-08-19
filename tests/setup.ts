import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Create a temporary directory for tests
const TEST_DIR = path.join(os.tmpdir(), 'a24z-memory-tests');

beforeEach(() => {
  // Clean up test directory before each test
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  
  // Set test environment variable for data directory
  process.env.A24Z_TEST_DATA_DIR = TEST_DIR;
});

afterEach(() => {
  // Clean up after each test
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  delete process.env.A24Z_TEST_DATA_DIR;
});

export { TEST_DIR };