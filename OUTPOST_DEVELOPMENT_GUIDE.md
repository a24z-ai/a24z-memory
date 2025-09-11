# Alexandria Outpost Development Guide

## Quick Start for UI Development

This guide helps the Alexandria Outpost UI team test their frontend against a local API server.

## Setting Up Local API Server

### Prerequisites
1. Clone the a24z-Memory repository:
   ```bash
   git clone https://github.com/a24z-ai/a24z-Memory.git
   cd a24z-Memory
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Running the Local API Server

Start the Alexandria Outpost with local API:
```bash
npx alexandria outpost serve --local
```

This will:
- Start the local API server on `http://localhost:3002`
- Start the Outpost UI on `http://localhost:3003`
- Automatically configure the UI to use the local API

### API Endpoints Available

The local API server provides these endpoints:

#### 1. List All Repositories
```bash
GET http://localhost:3002/api/alexandria/repos
```

Example response:
```json
{
  "repositories": [
    {
      "name": "test-repo",
      "registeredAt": "2025-09-09T08:34:29.476Z",
      "hasViews": true,
      "viewCount": 5,
      "views": [...],
      "owner": "local",
      "path": "/path/to/repo",
      "description": "Repository description",
      "stars": 0,
      "tags": []
    }
  ],
  "total": 7,
  "lastUpdated": "2025-09-11T17:59:24.980Z"
}
```

#### 2. Get Specific Repository
```bash
GET http://localhost:3002/api/alexandria/repos/:name
```

Example:
```bash
curl http://localhost:3002/api/alexandria/repos/test-repo
```

#### 3. Register New Repository
```bash
POST http://localhost:3002/api/alexandria/repos
Content-Type: application/json

{
  "name": "new-repo",
  "path": "/absolute/path/to/repo"
}
```

#### 4. Serve Raw Files
```bash
GET http://localhost:3002/raw/:repo/path/to/file
```

Example:
```bash
curl http://localhost:3002/raw/test-repo/README.md
```

### Testing CORS

The API server is configured with proper CORS headers:
- Allows origin: `http://localhost:3003`
- Supports credentials
- Handles OPTIONS preflight requests

Test CORS:
```bash
# Test preflight
curl -H "Origin: http://localhost:3003" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3002/api/alexandria/repos -I

# Test actual request with CORS
curl -H "Origin: http://localhost:3003" \
     http://localhost:3002/api/alexandria/repos -I
```

## Current Issue: Repository Navigation

### Problem Description
When clicking on a repository card in the UI:
1. The page briefly flashes
2. Returns to the home page
3. No repository detail view is shown

### Expected Behavior
Clicking a repository should navigate to `/repo/:name` or similar route showing:
- Repository details
- List of views
- View content/cells

### Debugging Steps

1. **Check Browser Console**: Look for JavaScript errors or failed network requests
2. **Check Network Tab**: See if clicking triggers any API calls
3. **Check URL Changes**: Watch if the URL briefly changes before redirecting back

### Testing with Production API

To test if the issue is API-related or UI-related:
```bash
# Use production API
npx alexandria outpost serve

# Use local API
npx alexandria outpost serve --local
```

The issue occurs with both APIs, confirming it's a frontend routing problem.

## Development Setup for Outpost UI Team

### Running UI Against Local API

If you're developing the Outpost UI separately:

1. Ensure the local API is running:
   ```bash
   # In a24z-Memory directory
   npx alexandria outpost serve --local --no-open
   ```

2. In your Outpost UI development:
   ```bash
   # Set the API URL environment variable
   ALEXANDRIA_API_URL=http://localhost:3002 npm run dev
   ```

### Sample Repository Data

The local API provides real repository data including:
- Repository metadata (name, owner, path, registeredAt)
- Views array with view details
- View counts and categories
- Overview paths for documentation

### API Response Structure

Repository object structure:
```typescript
interface AlexandriaRepository {
  name: string;
  remoteUrl?: string;
  registeredAt: string;
  hasViews: boolean;
  viewCount: number;
  views: Array<{
    id: string;
    name: string;
    description: string;
    cellCount: number;
    gridSize: [number, number];
    overviewPath: string;
    category: string;
    displayOrder: number;
  }>;
  owner: string;
  path: string;
  description: string;
  stars: number;
  tags: string[];
}
```

## Contact & Support

For API-related issues or questions about the local server, please refer to the a24z-Memory repository issues.

The local API implementation is in:
- API Server: `src/cli-alexandria/api/server.ts`
- Routes: `src/cli-alexandria/api/routes/index.ts`
- Manager: `src/cli-alexandria/api/AlexandriaOutpostManager.ts`