# Alexandria Outpost Quick Start Guide

## Overview
Alexandria Outpost provides a web-based UI for browsing and exploring your Alexandria-registered repositories. This guide helps you get started quickly with both local and production API configurations.

## Installation
```bash
npm install -g a24z-memory
# or
npm install a24z-memory
```

## Running the Outpost

### Option 1: Local API Server (Recommended for Development)
Use the `--local` flag to run both the UI and a local API server:

```bash
npx alexandria outpost serve --local
```

This will:
- Start a local API server on port 3002
- Start the Outpost UI on port 3003
- Configure the UI to use the local API automatically
- Serve data from your locally registered repositories

### Option 2: Production API
To use the production API at git-gallery.com:

```bash
npx alexandria outpost serve
```

### Option 3: Custom API URL
To use a custom API endpoint:

```bash
npx alexandria outpost serve --api-url https://your-api.com
```

## Command Options

```bash
npx alexandria outpost serve [options]
```

Options:
- `--local` - Use local API server (recommended for development)
- `--port <number>` - UI server port (default: 3003)
- `--api-port <number>` - Local API port when using --local (default: 3002)
- `--api-url <url>` - Custom API URL (default: https://git-gallery.com)
- `--no-open` - Don't open browser automatically
- `--help` - Show help information

## Local Development Setup

### Prerequisites
1. Register repositories with Alexandria:
   ```bash
   npx alexandria init
   npx alexandria register [repository-path]
   ```

2. Verify registered repositories:
   ```bash
   npx alexandria list
   ```

### Starting the Local Outpost
```bash
# Start with local API (recommended)
npx alexandria outpost serve --local

# Or with specific ports
npx alexandria outpost serve --local --port 4003 --api-port 4002
```

### Accessing the UI
Open your browser to:
- UI: http://localhost:3003
- API: http://localhost:3002 (when using --local)

## API Endpoints (Local Server)

When running with `--local`, these endpoints are available:

### List All Repositories
```bash
GET http://localhost:3002/api/alexandria/repos
```

### Get Specific Repository
```bash
GET http://localhost:3002/api/alexandria/repos/:name
GET http://localhost:3002/api/alexandria/repos/:owner/:name
```

### Serve Raw Files
```bash
GET http://localhost:3002/raw/:repo/path/to/file
```

### Health Check
```bash
GET http://localhost:3002/health
```

## Testing the Setup

### Verify API is Running
```bash
curl http://localhost:3002/api/alexandria/repos
```

### Check CORS Configuration
```bash
curl -H "Origin: http://localhost:3003" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3002/api/alexandria/repos -I
```

## Troubleshooting

### Port Already in Use
If you get a port conflict error:
```bash
# Use different ports
npx alexandria outpost serve --local --port 4003 --api-port 4002
```

### No Repositories Showing
1. Ensure repositories are registered:
   ```bash
   npx alexandria list
   ```

2. Register a repository if needed:
   ```bash
   npx alexandria register .
   ```

3. Restart the outpost server

### API Connection Issues
1. Check if the API server is running:
   ```bash
   curl http://localhost:3002/health
   ```

2. Verify CORS headers are present:
   ```bash
   curl -I http://localhost:3002/api/alexandria/repos
   ```

3. Check browser console for errors

### Browser Not Opening
Use the `--no-open` flag if you prefer to open the browser manually:
```bash
npx alexandria outpost serve --local --no-open
```

## Advanced Configuration

### Running UI and API Separately
You can run the API and UI servers independently:

1. Start the API server only:
   ```bash
   # This feature may require additional implementation
   npx alexandria api serve --port 3002
   ```

2. Start the UI with custom API:
   ```bash
   npx alexandria outpost serve --api-url http://localhost:3002
   ```

### Using with Docker
```dockerfile
# Dockerfile example
FROM node:18
WORKDIR /app
RUN npm install -g a24z-memory
EXPOSE 3002 3003
CMD ["npx", "alexandria", "outpost", "serve", "--local"]
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Start Alexandria Outpost
  run: |
    npm install a24z-memory
    npx alexandria init
    npx alexandria register .
    npx alexandria outpost serve --local --no-open &
    sleep 5
    curl http://localhost:3002/health
```

## Security Considerations

### CORS Configuration
The local API server is configured with CORS to allow:
- Origins: http://localhost:3003, http://localhost:3000
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Credentials: Enabled

### Production Deployment
For production deployments:
1. Configure appropriate CORS origins
2. Use HTTPS for API endpoints
3. Implement authentication if needed
4. Set up rate limiting

## Version Information

### Checking Version Compatibility
```bash
# Check a24z-memory version
npx alexandria --version

# Check outpost package version
npm list @a24z/alexandria-outpost
```

### Minimum Required Versions
- a24z-memory: >= 0.5.68
- @a24z/alexandria-outpost: >= 0.1.6

## Support

For issues or questions:
- GitHub Issues: https://github.com/a24z-ai/a24z-Memory/issues
- Documentation: https://docs.a24z.ai
- Discord: https://discord.gg/a24z

## Next Steps

1. Explore your repositories in the UI
2. Create and manage views for your codebase
3. Share repository documentation with your team
4. Integrate Alexandria into your development workflow

---

**Note**: The Alexandria Outpost is actively developed. Update regularly for the latest features and fixes:

```bash
npm update a24z-memory
```