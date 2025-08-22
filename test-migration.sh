#!/bin/bash

# Test migration command script
echo "Testing a24z-memory migration command"
echo "======================================"

# Create a test directory with legacy notes
TEST_DIR="/tmp/test-a24z-migration"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR/.git"
mkdir -p "$TEST_DIR/.a24z"

# Create a sample legacy notes file
cat > "$TEST_DIR/.a24z/repository-notes.json" << 'EOF'
{
  "version": 1,
  "notes": [
    {
      "id": "test-note-1",
      "note": "This is a test note from the legacy format",
      "anchors": ["src/test.ts"],
      "tags": ["migration", "test"],
      "confidence": "high",
      "type": "explanation",
      "metadata": {},
      "timestamp": 1700000000000
    },
    {
      "id": "test-note-2",
      "note": "Another test note to be migrated",
      "anchors": ["src/other.ts", "docs/readme.md"],
      "tags": ["documentation"],
      "confidence": "medium",
      "type": "pattern",
      "metadata": {"author": "test"},
      "timestamp": 1700000100000
    }
  ]
}
EOF

echo "Created test repository at: $TEST_DIR"
echo ""

# Build the project first
echo "Building project..."
npm run build > /dev/null 2>&1

# Test 1: Check migration status (should show legacy exists)
echo "Test 1: Check initial status"
echo "----------------------------"
node dist/cli.js migrate "$TEST_DIR" --verbose

echo ""
echo "Test 2: Check post-migration status"
echo "------------------------------------"
node dist/cli.js migrate "$TEST_DIR"

echo ""
echo "Test 3: Verify migrated files"
echo "------------------------------"
if [ -d "$TEST_DIR/.a24z/notes" ]; then
    echo "✅ Notes directory created"
    echo "Files created:"
    find "$TEST_DIR/.a24z/notes" -name "*.json" -type f | while read -r file; do
        echo "  - $(basename "$file")"
    done
else
    echo "❌ Notes directory not found"
fi

echo ""
echo "Test 4: Check backup file"
echo "--------------------------"
if ls "$TEST_DIR/.a24z"/repository-notes.json.backup-* 1> /dev/null 2>&1; then
    echo "✅ Backup file created:"
    ls -la "$TEST_DIR/.a24z"/repository-notes.json.backup-*
else
    echo "❌ No backup file found"
fi

echo ""
echo "Test 5: Test force re-migration"
echo "--------------------------------"
# Recreate the legacy file to test force migration
cp "$TEST_DIR/.a24z"/repository-notes.json.backup-* "$TEST_DIR/.a24z/repository-notes.json" 2>/dev/null || echo "No backup to restore"
node dist/cli.js migrate "$TEST_DIR" --force --verbose

echo ""
echo "Cleanup"
echo "-------"
echo "Test directory preserved at: $TEST_DIR"
echo "Run 'rm -rf $TEST_DIR' to clean up"