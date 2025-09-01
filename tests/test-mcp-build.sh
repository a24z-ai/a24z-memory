#!/bin/bash
set -e

echo "🧪 Testing MCP server build..."

# Build the project
echo "📦 Building project..."
npm run build > /dev/null 2>&1 || {
    echo "❌ Build failed!"
    exit 1
}

echo "✅ Build successful!"

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ dist/index.js not found!"
    exit 1
fi

echo "✅ MCP server entry point exists!"

# Try to start the server and check for immediate errors
echo "🚀 Testing server startup..."
timeout 2s node dist/index.js 2>&1 | head -20 > /tmp/mcp-test.log || true

# Check if there were any immediate errors
if grep -i "error\|cannot find module\|syntaxerror\|referenceerror" /tmp/mcp-test.log > /dev/null 2>&1; then
    echo "❌ Server startup failed with errors:"
    cat /tmp/mcp-test.log
    rm -f /tmp/mcp-test.log
    exit 1
fi

rm -f /tmp/mcp-test.log
echo "✅ MCP server can start without immediate errors!"
echo "✅ All MCP server tests passed!"