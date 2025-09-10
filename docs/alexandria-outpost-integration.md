# Alexandria Outpost Integration

## Overview

Alexandria Outpost is a local UI server for browsing and managing Alexandria repository documentation. This document covers the implementation of the `alexandria outpost` command that integrates with the `@a24z/alexandria-outpost` npm package.

## Architecture

### Command Structure

The outpost command provides three subcommands:

```bash
alexandria outpost serve   # Start the UI server
alexandria outpost status  # Check if server is running
alexandria outpost kill    # Stop the running server
```

### Implementation Details

#### 1. Command Module (`src/cli-alexandria/commands/outpost.ts`)

The main command module implements:

- **Process Management**: Uses PID files stored in `~/.alexandria/` to track running instances
- **Package Resolution**: Dynamically locates the installed `@a24z/alexandria-outpost` package
- **Server Lifecycle**: Handles starting, monitoring, and stopping the outpost server

#### 2. Process Tracking

```typescript
// Files used for tracking
~/.alexandria/outpost.pid        # Process ID of running server
~/.alexandria/outpost.config.json # Configuration of running instance
```

The implementation checks if a process is actually running (not just if PID file exists) to handle stale files gracefully.

#### 3. Package Resolution Strategy

The command uses multiple fallback paths to locate the outpost executable:

1. First tries from the bundled dist location
2. Falls back to unbundled location
3. Finally checks relative to current working directory

This ensures the command works whether run from source, dist, or as an installed package.

## Usage

### Starting the Server

```bash
# Start with defaults (port 3003, opens browser)
alexandria outpost serve

# Custom port without opening browser
alexandria outpost serve -p 8080 --no-open

# Custom API endpoint
alexandria outpost serve --api-url http://localhost:3000

# Run in background (detached mode)
alexandria outpost serve -d
```

### Checking Status

```bash
alexandria outpost status
```

Output shows:
- Process ID
- Port number
- API URL configuration
- Start time
- Access URL

### Stopping the Server

```bash
alexandria outpost kill
```

Sends SIGTERM for graceful shutdown, with SIGKILL fallback after 1 second if needed.

## Configuration

### Runtime Configuration

The server accepts configuration through command-line options:

- `--port, -p`: Port to run the server on (default: 3003)
- `--api-url, -a`: API endpoint URL (default: https://git-gallery.com)
- `--no-open`: Don't automatically open browser
- `--detached, -d`: Run server in background mode

### API URL Injection

The API URL is injected into the served UI through:
1. Command-line parameter to the outpost server
2. Server injects configuration into HTML via `window.ALEXANDRIA_CONFIG`
3. UI reads this configuration at runtime

## Technical Implementation

### Dependencies

- `@a24z/alexandria-outpost`: The UI package containing the Astro-built interface
- `commander`: Command-line interface framework
- `child_process`: Node.js process spawning for server management

### Error Handling

The implementation handles several edge cases:

1. **Stale PID files**: Automatically cleaned up if process no longer exists
2. **Port conflicts**: Error message if server already running
3. **Missing package**: Clear error if outpost package not installed
4. **Process termination**: Graceful shutdown with fallback to force kill

### File System Integration

```typescript
// Check if process is running
try {
  process.kill(pid, 0); // Signal 0 = check if alive
  return { running: true, pid, config };
} catch {
  // Process doesn't exist, clean up stale files
  unlinkSync(PID_FILE);
  unlinkSync(CONFIG_FILE);
  return { running: false };
}
```

## Development Notes

### Building

The command is built as part of the main alexandria-cli:

```bash
bun run build:alexandria-cli
```

### Testing

Test the implementation with:

```bash
# Build first
bun run build

# Test commands
./dist/alexandria-cli.js outpost serve -p 3005 --no-open
./dist/alexandria-cli.js outpost status
./dist/alexandria-cli.js outpost kill
```

## Known Issues

### Outpost Package v0.1.1

The `@a24z/alexandria-outpost` package has a minor issue with `require('fs')` in an ESM module (line 27 of server.js). This causes errors for non-static routes but doesn't affect the main UI functionality.

## Future Enhancements

1. **Local API Implementation**: When the updated API spec is available, implement local repository registry endpoints
2. **Multiple Instances**: Support running multiple outpost servers on different ports
3. **Configuration Persistence**: Save and restore last-used configuration
4. **Health Monitoring**: Add proper health check endpoint when available in outpost package
5. **Logs**: Capture and display server logs for debugging

## Integration Points

### With Alexandria CLI

The outpost command is registered in `src/alexandria-cli.ts`:

```typescript
import { createOutpostCommand } from './cli-alexandria/commands/outpost.js';
program.addCommand(createOutpostCommand());
```

### With Local Repository

Future integration will connect to the local Memory Palace for serving repository data:
- List local repositories
- Browse codebase views
- Access documentation offline

## Security Considerations

- Server binds to localhost only (not exposed to network)
- No authentication required for local access
- Configuration injection is read-only
- Process management requires local file system access

## References

- [Alexandria Outpost Specification](https://raw.githubusercontent.com/a24z-ai/Alexandria/main/docs/ALEXANDRIA_OUTPOST.md)
- [Outpost API Specification](https://raw.githubusercontent.com/a24z-ai/Alexandria/main/docs/OUTPOST_API_SPEC.md)
- [@a24z/alexandria-outpost npm package](https://www.npmjs.com/package/@a24z/alexandria-outpost)