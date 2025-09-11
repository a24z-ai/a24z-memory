# Alexandria Outpost Local API

The Alexandria Outpost can now work with locally registered repositories through a built-in API server.

## Quick Start

To start the Outpost UI with local repository support:

```bash
# Start both UI and API server
alexandria outpost serve --local

# With custom ports
alexandria outpost serve --local --port 3003 --api-port 3002
```

## How It Works

When you use the `--local` flag:

1. **API Server Starts**: A local Express server starts on port 3002 (configurable)
2. **UI Server Starts**: The Outpost UI starts on port 3003 (configurable) 
3. **Repository Loading**: The API serves all repositories registered with `alexandria projects`
4. **View Loading**: Repository views are automatically loaded using MemoryPalace

## API Endpoints

The local API server provides these endpoints:

### List All Repositories
```
GET /api/alexandria/repos
```
Returns all registered repositories with their views.

### Get Specific Repository
```
GET /api/alexandria/repos/:name
```
Returns details for a specific repository by name.

### Register New Repository
```
POST /api/alexandria/repos
Body: { "name": "repo-name", "path": "/absolute/path" }
```
Registers a new repository to the system.

### Serve Raw Files
```
GET /raw/:repo/*
```
Serves raw file contents from a repository.

### Health Check
```
GET /health
```
Returns server health status.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Alexandria Outpost UI                │
│                    (Astro Frontend)                  │
│                     Port: 3003                       │
└────────────────────┬───────────────────────────────┘
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────────────────┐
│              Local API Server (Express)              │
│                     Port: 3002                       │
├─────────────────────────────────────────────────────┤
│            AlexandriaOutpostManager                  │
│         (Transforms ProjectRegistry data)            │
└────────────────────┬───────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              ProjectRegistryStore                    │
│         (~/.alexandria/projects.json)                │
└─────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

- `PORT`: UI server port (default: 3003)
- `API_PORT`: API server port (default: 3002)

### Command Line Options

```bash
alexandria outpost serve [options]

Options:
  -p, --port <port>        Port to run the UI on (default: 3003)
  -a, --api-url <url>      API endpoint URL (default: https://git-gallery.com)
  -d, --detached           Run server in background
  --no-open                Do not open browser automatically
  --local                  Start local API server for local repositories
  --api-port <port>        Port for the local API server (default: 3002)
```

## Example Usage

### Start with local repositories
```bash
# Register a repository first
alexandria projects register myapp /path/to/myapp

# Start Outpost with local API
alexandria outpost serve --local

# The UI will be available at http://localhost:3003
# The API will be available at http://localhost:3002
```

### Run in detached mode
```bash
# Start in background
alexandria outpost serve --local --detached

# Check status
alexandria outpost status

# Stop the server
alexandria outpost kill
```

## Integration with Git Gallery

When not using the `--local` flag, the Outpost UI connects to the remote Git Gallery service at https://git-gallery.com. The local mode is useful for:

- Working with private repositories
- Testing before publishing
- Offline development
- Corporate environments with restricted internet access

## Troubleshooting

### Port Already in Use
If you see "Port already in use" errors:
```bash
# Check what's running
alexandria outpost status

# Kill existing server
alexandria outpost kill

# Start fresh
alexandria outpost serve --local
```

### No Repositories Showing
Make sure you have registered repositories:
```bash
# List registered projects
alexandria projects list

# Register a new one
alexandria projects register <name> <path>
```

### CORS Issues
The API server is configured to accept connections from the UI server. If you're running on custom ports, make sure both servers are using the correct ports.

## API Response Examples

### GET /api/alexandria/repos
```json
{
  "repositories": [
    {
      "name": "my-project",
      "path": "/Users/me/projects/my-project",
      "remoteUrl": "https://github.com/user/my-project",
      "hasViews": true,
      "viewCount": 3,
      "views": [...]
    }
  ],
  "total": 1,
  "lastUpdated": "2025-01-09T12:00:00Z"
}
```

### GET /api/alexandria/repos/my-project
```json
{
  "name": "my-project",
  "owner": "user",
  "path": "/Users/me/projects/my-project",
  "remoteUrl": "https://github.com/user/my-project",
  "description": "",
  "stars": 0,
  "tags": [],
  "hasViews": true,
  "viewCount": 3,
  "views": [...]
}
```

## Security Considerations

- The API server only serves files from registered repository paths
- Path traversal attacks are prevented
- CORS is configured to only accept requests from the UI server
- No authentication is required for local mode (runs on localhost only)

## Next Steps

- Register your repositories with `alexandria projects register`
- Create views for your code with `alexandria init`
- Start the Outpost UI with `alexandria outpost serve --local`
- Access your local repository gallery at http://localhost:3003