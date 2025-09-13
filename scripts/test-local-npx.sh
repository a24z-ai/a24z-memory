#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing a24z-memory as npm package locally${NC}"
echo "================================================"

# 1. Build the project first
echo -e "\n${YELLOW}📦 Building project...${NC}"
npm run build
echo -e "${GREEN}✅ Build complete${NC}"

# 2. Create a test directory outside the project
TEST_DIR=$(mktemp -d)
echo -e "\n${YELLOW}📁 Created test directory: $TEST_DIR${NC}"
cd "$TEST_DIR"

# 3. Pack the npm package
echo -e "\n${YELLOW}📦 Creating npm package...${NC}"
PACKAGE_PATH=$(npm pack "$OLDPWD" 2>&1 | tail -1)
echo -e "${GREEN}✅ Package created: $PACKAGE_PATH${NC}"

# 4. Install the package globally (simulating npx)
echo -e "\n${YELLOW}🔧 Installing package locally...${NC}"
npm install -g "$PACKAGE_PATH"
echo -e "${GREEN}✅ Package installed${NC}"

# 5. Test the MCP server with various commands
echo -e "\n${YELLOW}🚀 Testing MCP server commands...${NC}"

# Test help command
echo -e "\n${BLUE}Testing: a24z-memory help${NC}"
if a24z-memory help | grep -q "Commands:"; then
    echo -e "${GREEN}✅ Help command works${NC}"
else
    echo -e "${RED}❌ Help command failed${NC}"
    npm uninstall -g a24z-memory
    cd - > /dev/null
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test MCP handshake
echo -e "\n${BLUE}Testing: MCP protocol handshake${NC}"
INIT_RESPONSE=$(echo '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}' | timeout 2s a24z-memory 2>&1 | grep '"id":1')

if echo "$INIT_RESPONSE" | grep -q '"result".*"protocolVersion"'; then
    echo -e "${GREEN}✅ MCP handshake successful${NC}"
else
    echo -e "${RED}❌ MCP handshake failed${NC}"
    npm uninstall -g a24z-memory
    cd - > /dev/null
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test tool listing
echo -e "\n${BLUE}Testing: Tool registration${NC}"
TOOLS_RESPONSE=$(echo -e '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}\n{"method":"tools/list","jsonrpc":"2.0","id":2}' | timeout 2s a24z-memory 2>&1 | grep '"id":2')

if echo "$TOOLS_RESPONSE" | grep -q '"tools":\['; then
    TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | grep -o '"name":' | wc -l)
    echo -e "${GREEN}✅ ${TOOL_COUNT} tools registered${NC}"
else
    echo -e "${RED}❌ Tools not registered${NC}"
    npm uninstall -g a24z-memory
    cd - > /dev/null
    rm -rf "$TEST_DIR"
    exit 1
fi

# 6. Test with npx (if available)
echo -e "\n${YELLOW}📦 Testing with npx...${NC}"
npm uninstall -g a24z-memory

# Extract the package for npx testing
tar -xzf "$PACKAGE_PATH"
PACKAGE_DIR="$TEST_DIR/package"

# Test npx with the local package
echo -e "\n${BLUE}Testing: npx with local package${NC}"
NPXTEST=$(echo '{"method":"initialize","jsonrpc":"2.0","id":1,"params":{"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"0.1.0","capabilities":{}}}' | timeout 2s npx "$PACKAGE_PATH" 2>&1 | grep '"id":1' || true)

if echo "$NPXTEST" | grep -q '"result".*"protocolVersion"'; then
    echo -e "${GREEN}✅ npx command works with local package${NC}"
else
    echo -e "${YELLOW}⚠️ npx test skipped or failed (non-critical)${NC}"
fi

# 7. Cleanup
echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
cd - > /dev/null
rm -rf "$TEST_DIR"
echo -e "${GREEN}✅ Cleanup complete${NC}"

# 8. Summary
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Local npm package testing complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}The package works correctly when installed via npm.${NC}"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/test-prerelease.sh for full validation"
echo "  2. To test cursor integration: npm run build && node dist/mcp-cli.js install-cursor"
echo "  3. Restart Cursor and check if 'a24z-memory' appears in MCP servers"