# MCP Server Testing and Debugging Guide

## Overview
This guide explains how to test the a24z-memory MCP server before release and debug issues with Cursor integration.

## Pre-Release Testing

### Quick Test
```bash
# Run the comprehensive pre-release test
npm run test:prerelease
```

This will:
1. Build the project
2. Run all unit tests
3. Test MCP server startup
4. Verify protocol handshake
5. Check tool registration (should show 12+ tools)
6. Test npx command simulation
7. Validate package.json configuration

### Local NPX Testing
```bash
# Test the package as if installed from npm
npm run test:local-npx
```

This creates a local npm package and tests it in isolation, simulating the real npm installation experience.

## Manual Testing

### 1. Test MCP Server Directly
```bash
# Build first
npm run build

# Test with default command (should start server)
echo '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}' | node dist/mcp-cli.js

# Test listing tools
echo -e '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}\n{"method":"tools/list","jsonrpc":"2.0","id":2}' | node dist/mcp-cli.js
```

### 2. Test with NPX
```bash
# Test without publishing (after building)
echo '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}' | npx -y a24z-memory
```

## Cursor Integration

### Installation
The MCP server configuration for Cursor should be:
```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["-y", "a24z-memory"],
      "env": {}
    }
  }
}
```

Or simpler (since 'start' is the default):
```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx -y a24z-memory",
      "env": {}
    }
  }
}
```

### Debugging Cursor Issues

#### "No tools" Error
If Cursor shows "no tools" for the MCP server:

1. **Check the server starts correctly:**
   ```bash
   npx -y a24z-memory help
   ```
   Should show the help menu.

2. **Verify tools are registered:**
   ```bash
   echo -e '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}\n{"method":"tools/list","jsonrpc":"2.0","id":2}' | npx -y a24z-memory 2>/dev/null | grep '"tools"'
   ```
   Should show a JSON array with 12+ tools.

3. **Check Cursor logs:**
   - Open Cursor Developer Tools: `View > Toggle Developer Tools`
   - Check Console for MCP-related errors
   - Look for connection or initialization failures

4. **Verify Cursor config:**
   ```bash
   cat ~/.cursor/mcp.json
   ```
   Ensure the a24z-memory server is configured correctly.

5. **Test with local development version:**
   ```bash
   # In the a24z-memory directory
   npm run build

   # Update Cursor config to use local version
   {
     "mcpServers": {
       "a24z-memory": {
         "command": "node",
         "args": ["/absolute/path/to/a24z-memory/dist/mcp-cli.js"],
         "env": {}
       }
     }
   }
   ```

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "No tools" in Cursor | Ensure the command includes `start` or relies on default |
| Server doesn't start | Check Node.js version (>=18 required) |
| Tools not listed | Verify dist/mcp-cli.js exists after build |
| Permission denied | Make sure scripts are executable: `chmod +x dist/mcp-cli.js` |
| Module not found | Run `npm install` and `npm run build` |

## Testing Workflow for New Releases

1. **Make changes to the code**
2. **Run tests:**
   ```bash
   npm test
   npm run test:mcp-all
   ```
3. **Test pre-release:**
   ```bash
   npm run test:prerelease
   ```
4. **Test local NPX:**
   ```bash
   npm run test:local-npx
   ```
5. **Test in Cursor (optional):**
   - Install locally: `node dist/mcp-cli.js install-cursor`
   - Restart Cursor
   - Check MCP servers list
6. **Publish to npm:**
   ```bash
   npm publish
   ```

## Expected Output

### Successful MCP Initialization
```json
{
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": {},
      "resources": {}
    },
    "serverInfo": {
      "name": "a24z-memory",
      "version": "1.0.0"
    }
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

### Tools List (abbreviated)
```json
{
  "result": {
    "tools": [
      {
        "name": "create_repository_note",
        "description": "Document tribal knowledge...",
        "inputSchema": {...}
      },
      {
        "name": "get_notes",
        "description": "Retrieve raw notes...",
        "inputSchema": {...}
      },
      // ... 10+ more tools
    ]
  },
  "jsonrpc": "2.0",
  "id": 2
}
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/a24z-ai/a24z-memory/issues
- Documentation: See README.md and USAGE_GUIDE.md