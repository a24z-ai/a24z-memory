# Migration Guide: JSON to File-Based Storage

## Overview

Starting from version 0.2.0, a24z-Memory uses a file-based storage system instead of a single JSON file. This provides better git compatibility, improved performance, and eliminates merge conflicts when multiple users work with the same repository.

## Automatic Migration

Notes are automatically migrated when you first access them through the MCP server. However, you can also manually trigger migration using the CLI.

## Manual Migration Command

### Basic Usage

```bash
npx a24z-memory migrate [path]
```

- `[path]` - Repository path to migrate (defaults to current directory)

### Options

- `--verbose` - Show detailed progress during migration
- `--force` - Force re-migration even if already migrated

### Examples

#### Migrate current repository
```bash
npx a24z-memory migrate
```

#### Migrate specific repository with verbose output
```bash
npx a24z-memory migrate /path/to/repo --verbose
```

#### Force re-migration
```bash
npx a24z-memory migrate --force
```

## What Happens During Migration

1. **Reads** all notes from `repository-notes.json`
2. **Creates** date-based directory structure:
   ```
   .a24z/
   └── notes/
       └── 2024/
           └── 11/
               ├── note-1234567890-abc.json
               └── note-1234567891-def.json
   ```
3. **Writes** each note to an individual JSON file
4. **Creates backup** of original file as `repository-notes.json.backup-{timestamp}`
5. **Removes** original `repository-notes.json` file

## Storage Structure

### Old Format (Single File)
```
.a24z/
└── repository-notes.json  # All notes in one file
```

### New Format (File-Based)
```
.a24z/
├── configuration.json      # Repository configuration
├── notes/                  # Individual note files
│   └── YYYY/              # Year directory
│       └── MM/            # Month directory
│           └── note-{timestamp}-{id}.json
└── note-guidance.md       # Optional guidance file
```

## Configuration

After migration, you can customize note limits via `.a24z/configuration.json`:

```json
{
  "version": 1,
  "limits": {
    "noteMaxLength": 10000,
    "maxTagsPerNote": 10,
    "maxTagLength": 50,
    "maxAnchorsPerNote": 20
  },
  "storage": {
    "backupOnMigration": true,
    "compressionEnabled": false
  }
}
```

## Troubleshooting

### Migration Status Check

To check if a repository has been migrated:
```bash
npx a24z-memory migrate /path/to/repo
```

This will report:
- ✅ "Repository already migrated" if using file-based storage
- ✅ "Successfully migrated X notes" if migration was performed
- ❌ Error message if migration failed

### Recovery from Failed Migration

If migration fails partially:

1. Check for backup files:
   ```bash
   ls -la .a24z/repository-notes.json.backup-*
   ```

2. Restore from backup if needed:
   ```bash
   cp .a24z/repository-notes.json.backup-* .a24z/repository-notes.json
   ```

3. Retry migration with force flag:
   ```bash
   npx a24z-memory migrate --force --verbose
   ```

### Verifying Migration Success

After migration, verify:

1. **Check notes directory exists:**
   ```bash
   ls -la .a24z/notes/
   ```

2. **Count migrated notes:**
   ```bash
   find .a24z/notes -name "*.json" -type f | wc -l
   ```

3. **Verify backup was created:**
   ```bash
   ls -la .a24z/repository-notes.json.backup-*
   ```

## Benefits of File-Based Storage

1. **Git-Friendly**: Each note change is an isolated diff
2. **No Merge Conflicts**: Multiple users can add notes simultaneously
3. **Better Performance**: Only modified files need to be read/written
4. **Atomic Operations**: Each note write is atomic (temp file + rename)
5. **Easy Searching**: Use standard tools like `grep` directly on note files
6. **Incremental Sync**: Git only syncs changed files

## Backward Compatibility

The migration is transparent to the MCP API - all existing integrations continue to work without changes. The system automatically detects and uses the appropriate storage format.

## Support

If you encounter issues with migration:

1. Check the [GitHub Issues](https://github.com/a24z-ai/a24z-Memory/issues)
2. Include the error message and output of `npx a24z-memory migrate --verbose`
3. Mention your repository size (number of notes)