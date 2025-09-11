# Bug Report: Alexandria Outpost Not Using Custom API URL

## Issue Summary
The Alexandria Outpost UI (@a24z/alexandria-outpost v0.1.2) ignores the `--api-url` parameter and always fetches from the production API at `https://git-gallery.com` instead of using the specified custom API endpoint.

## Expected Behavior
When launching the outpost with a custom API URL (e.g., `--api-url http://localhost:3002`), the frontend should use that URL for all API calls.

## Actual Behavior
Despite passing `--api-url http://localhost:3002`, the frontend continues to make requests to `https://git-gallery.com/api/alexandria/repos`.

## Root Cause Analysis

### Problem Location
File: `node_modules/@a24z/alexandria-outpost/dist/server.js`

The issue is in how the Express server handles static file serving and configuration injection:

1. **Static middleware serves files first** (line 21-22):
   ```javascript
   const publicPath = path.join(__dirname, '..', 'outpost-dist');
   app.use(express.static(publicPath));
   ```

2. **Configuration injection only happens in fallback route** (lines 26-41):
   ```javascript
   app.use((req, res) => {
     const indexPath = path.join(publicPath, 'index.html');
     let html = fs.readFileSync(indexPath, 'utf-8');
     
     // Inject the API URL into the HTML
     const configScript = `
       <script>
         window.ALEXANDRIA_CONFIG = {
           apiUrl: '${apiUrl}'
         };
       </script>
     `;
     
     html = html.replace('</head>', `${configScript}</head>`);
     res.send(html);
   });
   ```

### The Problem
When a user navigates to `http://localhost:3003/`, the Express static middleware serves the `index.html` file directly from `outpost-dist/` **before** the configuration injection middleware can run. This means `window.ALEXANDRIA_CONFIG` is never set, and the frontend falls back to its default API URL.

## Steps to Reproduce

1. Start the outpost with local API:
   ```bash
   alexandria outpost serve --local --no-open
   # Or explicitly:
   alexandria outpost serve --api-url http://localhost:3002 --no-open
   ```

2. Open browser developer tools and navigate to `http://localhost:3003`

3. Check the Network tab - observe requests going to `https://git-gallery.com` instead of `http://localhost:3002`

4. Check the Console - `window.ALEXANDRIA_CONFIG` is undefined

## Verification
Running `curl -s http://localhost:3003 | grep "ALEXANDRIA_CONFIG"` returns no results, confirming the configuration script is not being injected into the served HTML.

## Suggested Fix

### Option 1: Remove static middleware for HTML files
```javascript
// Only serve non-HTML files statically
app.use(express.static(publicPath, {
  index: false,
  extensions: ['js', 'css', 'svg', 'png', 'jpg', 'json']
}));
```

### Option 2: Custom middleware before static
```javascript
// Intercept index.html requests before static middleware
app.get(['/', '/index.html'], (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  const configScript = `
    <script>
      window.ALEXANDRIA_CONFIG = {
        apiUrl: '${apiUrl}'
      };
    </script>
  `;
  
  html = html.replace('</head>', `${configScript}</head>`);
  res.send(html);
});

// Then serve other static files
app.use(express.static(publicPath));
```

### Option 3: Middleware to transform HTML responses
```javascript
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    const indexPath = path.join(publicPath, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    
    const configScript = `
      <script>
        window.ALEXANDRIA_CONFIG = {
          apiUrl: '${apiUrl}'
        };
      </script>
    `;
    
    html = html.replace('</head>', `${configScript}</head>`);
    res.send(html);
  } else {
    next();
  }
});

app.use(express.static(publicPath));
```

## Impact
This bug prevents users from using the Alexandria Outpost with local API servers or any custom API endpoints, limiting its usefulness for local development and testing scenarios.

## Environment
- Package: @a24z/alexandria-outpost
- Version: 0.1.2
- Node: (current environment)
- OS: Darwin 24.5.0 (macOS)

## Additional Context
The CLI correctly passes the API URL to the outpost package (verified in logs), but the server.js middleware ordering prevents the configuration from being injected into the served HTML.