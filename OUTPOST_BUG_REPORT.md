# Bug Report: Alexandria Outpost v0.1.0 - path-to-regexp Error

## Issue Summary
The `@a24z/alexandria-outpost` package (v0.1.0) crashes immediately on startup with a `path-to-regexp` error when trying to start the server.

## Environment
- **Package Version**: @a24z/alexandria-outpost@0.1.0
- **Node Version**: v23.11.0
- **Platform**: macOS Darwin 24.5.0
- **Installation Method**: npm install @a24z/alexandria-outpost

## Error Details

### Error Message
```
TypeError: Missing parameter name at 1: https://git.new/pathToRegexpError
    at name (/node_modules/path-to-regexp/dist/index.js:73:19)
    at lexer (/node_modules/path-to-regexp/dist/index.js:91:27)
    at lexer.next (<anonymous>)
    at Iter.peek (/node_modules/path-to-regexp/dist/index.js:106:38)
    at Iter.tryConsume (/node_modules/path-to-regexp/dist/index.js:112:28)
    at Iter.text (/node_modules/path-to-regexp/dist/index.js:128:30)
    at consume (/node_modules/path-to-regexp/dist/index.js:152:29)
    at parse (/node_modules/path-to-regexp/dist/index.js:183:20)
```

### Full Output
```bash
$ alexandria outpost serve -p 3007 --no-open
🚀 Starting Alexandria Outpost server...
   Port: 3007
   API: https://git-gallery.com
🏛️  Starting Alexandria Outpost...
   Port: 3007
   API: https://git-gallery.com

/Users/griever/Developer/a24z-Memory/node_modules/path-to-regexp/dist/index.js:73
            throw new TypeError(`Missing parameter name at ${i}: ${DEBUG_URL}`);
                  ^

TypeError: Missing parameter name at 1: https://git.new/pathToRegexpError
```

## Steps to Reproduce

### Method 1: Direct Execution
```bash
# Install the package
npm install @a24z/alexandria-outpost

# Try to run the CLI directly
node node_modules/@a24z/alexandria-outpost/dist/cli.js serve --port 3000 --no-open
```

### Method 2: Programmatic Execution
```javascript
// test-outpost.js
const { spawn } = require('child_process');
const path = require('path');

const outpostPath = path.join(__dirname, 'node_modules/@a24z/alexandria-outpost/dist/cli.js');

const child = spawn('node', [
  outpostPath,
  'serve',
  '--port', '3000',
  '--api-url', 'https://git-gallery.com',
  '--no-open'
], {
  stdio: 'inherit'
});

child.on('error', (error) => {
  console.error('Failed to start:', error);
});

child.on('exit', (code) => {
  console.log('Process exited with code:', code);
});
```

Run with:
```bash
node test-outpost.js
```

### Method 3: Minimal Test Case
```bash
# Create a minimal test project
mkdir outpost-test && cd outpost-test
npm init -y
npm install @a24z/alexandria-outpost

# Create a test script
cat > test.js << 'EOF'
const { execSync } = require('child_process');
try {
  execSync('npx alexandria-outpost serve --port 3000 --no-open', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed with exit code:', error.status);
}
EOF

# Run the test
node test.js
```

## Expected Behavior
The server should start successfully and listen on the specified port, serving the Alexandria Outpost UI.

## Actual Behavior
The server crashes immediately with a `path-to-regexp` error before it can start listening.

## Likely Cause
The error suggests there's an issue with Express route configuration, specifically with how routes are being defined. The `path-to-regexp` library is used by Express to parse route patterns, and the error "Missing parameter name at 1" typically occurs when there's a malformed route pattern, such as:

- A route with an unnamed parameter (e.g., `/users/:` instead of `/users/:id`)
- A route with invalid parameter syntax
- Incompatible version of `path-to-regexp` with the version of Express being used

## Suggested Fix
1. Check all Express route definitions in the server code for malformed patterns
2. Verify compatibility between Express version (5.1.0) and path-to-regexp version
3. Look for routes that might have empty or invalid parameter names

## Dependencies from package.json
```json
{
  "dependencies": {
    "chalk": "^5.6.2",
    "commander": "^14.0.0",
    "express": "^5.1.0",
    "open": "^10.2.0"
  }
}
```

Note: Express 5.x is still in beta/alpha and may have compatibility issues with certain versions of path-to-regexp.

## Workaround
Currently, there is no workaround as the error occurs in the package's internal server initialization code.

## Integration Context
This issue was discovered while integrating the Alexandria Outpost command into the `a24z-memory` project. The integration code successfully locates and attempts to launch the outpost package, but the package fails internally.

## Contact
Discovered by: a24z-memory team
Date: 2025-09-10
Integration PR: [pending fix]