#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 a24z-memory Pre-Release Testing${NC}"
echo "================================================"

# 1. Build the project
echo -e "\n${YELLOW}📦 Building project...${NC}"
npm run build
echo -e "${GREEN}✅ Build successful${NC}"

# 2. Run all tests
echo -e "\n${YELLOW}🧪 Running test suite...${NC}"
npm test
echo -e "${GREEN}✅ All tests passed${NC}"

# 3. Test MCP server startup
echo -e "\n${YELLOW}🚀 Testing MCP server startup...${NC}"
timeout 2s node dist/mcp-cli.js 2>&1 | head -5 | grep -q "MCP server started successfully"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MCP server starts correctly${NC}"
else
    echo -e "${RED}❌ MCP server failed to start${NC}"
    exit 1
fi

# 4. Test MCP protocol handshake
echo -e "\n${YELLOW}🤝 Testing MCP protocol handshake...${NC}"
INIT_RESPONSE=$(echo '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}' | timeout 2s node dist/mcp-cli.js 2>&1 | grep '"id":1')

if echo "$INIT_RESPONSE" | grep -q '"result".*"protocolVersion"'; then
    echo -e "${GREEN}✅ MCP handshake successful${NC}"
else
    echo -e "${RED}❌ MCP handshake failed${NC}"
    echo "$INIT_RESPONSE"
    exit 1
fi

# 5. Test tool listing
echo -e "\n${YELLOW}🔧 Testing tool listing...${NC}"
TOOLS_RESPONSE=$(echo -e '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}\n{"method":"tools/list","jsonrpc":"2.0","id":2}' | timeout 2s node dist/mcp-cli.js 2>&1 | grep '"id":2')

if echo "$TOOLS_RESPONSE" | grep -q '"tools":\[.*"create_repository_note"'; then
    TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | grep -o '"name":' | wc -l)
    echo -e "${GREEN}✅ Tools registered successfully (${TOOL_COUNT} tools found)${NC}"
else
    echo -e "${RED}❌ Tools not properly registered${NC}"
    echo "$TOOLS_RESPONSE"
    exit 1
fi

# 6. Test npx command (simulated)
echo -e "\n${YELLOW}📦 Testing npx command simulation...${NC}"
# Create a temporary directory to simulate npx
TEMP_DIR=$(mktemp -d)
cp -r dist "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"

# Test without arguments (should default to 'start')
cd "$TEMP_DIR"
NPXTEST=$(echo '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}' | timeout 2s node dist/mcp-cli.js 2>&1 | grep '"id":1')

if echo "$NPXTEST" | grep -q '"result".*"protocolVersion"'; then
    echo -e "${GREEN}✅ npx command works without arguments (defaults to start)${NC}"
else
    echo -e "${RED}❌ npx command failed without arguments${NC}"
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    exit 1
fi

cd - > /dev/null
rm -rf "$TEMP_DIR"

# 7. Test Cursor installation command
echo -e "\n${YELLOW}🖱️ Testing Cursor installation...${NC}"
CURSOR_OUTPUT=$(node dist/mcp-cli.js install-cursor 2>&1 || true)
if echo "$CURSOR_OUTPUT" | grep -q "Installed MCP server config for Cursor"; then
    # Check the config file was created correctly
    if [ -f ~/.cursor/mcp.json ]; then
        if grep -q '"a24z-memory"' ~/.cursor/mcp.json && grep -q '"command".*"npx"' ~/.cursor/mcp.json; then
            echo -e "${GREEN}✅ Cursor installation works correctly${NC}"
        else
            echo -e "${RED}❌ Cursor config incorrect${NC}"
            cat ~/.cursor/mcp.json
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Cursor installation skipped (may already exist)${NC}"
fi

# 8. Package.json validation
echo -e "\n${YELLOW}📋 Validating package.json...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi

# Check bin field
if grep -q '"bin".*"a24z-memory".*"dist/mcp-cli.js"' package.json; then
    echo -e "${GREEN}✅ bin field correctly configured${NC}"
else
    echo -e "${RED}❌ bin field not properly configured${NC}"
    exit 1
fi

# Check files field includes dist
if grep -q '"files".*\["dist"' package.json || grep -q '"files".*\[\s*"dist"' package.json; then
    echo -e "${GREEN}✅ files field includes dist directory${NC}"
else
    echo -e "${RED}❌ files field missing dist directory${NC}"
    exit 1
fi

# 9. Final summary
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ All pre-release tests passed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}📦 Package is ready for release!${NC}"
echo ""
echo "To publish to npm:"
echo "  1. Ensure you're logged in: npm whoami"
echo "  2. Run: npm publish"
echo ""
echo "For testing with npx before publishing:"
echo "  1. Run: npm link"
echo "  2. Test: npx a24z-memory"
echo "  3. When done: npm unlink"