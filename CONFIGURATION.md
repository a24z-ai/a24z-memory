# a24z-Memory Configuration Overview

## Configuration System

The a24z-memory system uses a flexible configuration approach that keeps your team's knowledge organized and accessible.

### Directory Structure

```
.a24z/
├── configuration.json    # Repository configuration
├── notes/                # Notes organized by year/month
│   └── 2024/
│       └── 01/
│           └── note-*.json
├── tags/                 # Tag descriptions (markdown files)
│   ├── bug.md
│   ├── feature.md
│   └── gotcha.md
└── note-guidance.md      # Team-specific note guidelines
```

## Configuration File (`.a24z/configuration.json`)

### Default Configuration

```json
{
  "version": 1,
  "limits": {
    "noteMaxLength": 10000,
    "maxTagsPerNote": 10,
    "maxAnchorsPerNote": 20,
    "tagDescriptionMaxLength": 2000
  },
  "storage": {
    "notesDirectory": ".a24z/notes",
    "backupOnMigration": true,
    "compressionEnabled": false
  },
  "tags": {
    "enforceAllowedTags": false
  },
  "types": {
    "enforceAllowedTypes": false
  }
}
```

### Configuration Options

#### **Limits Section**
Controls size constraints to keep notes manageable:

| Field | Default | Description |
|-------|---------|-------------|
| `noteMaxLength` | 10000 | Maximum characters per note content |
| `maxTagsPerNote` | 10 | Maximum tags allowed per note |
| `maxAnchorsPerNote` | 20 | Maximum file/directory anchors per note |
| `tagDescriptionMaxLength` | 2000 | Maximum characters per tag description markdown file |

#### **Storage Section**
Where and how notes are stored:

| Field | Default | Description |
|-------|---------|-------------|
| `notesDirectory` | `.a24z/notes` | Directory for note storage |
| `backupOnMigration` | true | Keep backups when migrating storage formats |
| `compressionEnabled` | false | Enable compression for note storage (future feature) |

#### **Tags Section**
Optional tag restrictions:

| Field | Default | Description |
|-------|---------|-------------|
| `enforceAllowedTags` | `false` | Whether to restrict tags to those with descriptions in `.a24z/tags/` |

#### **Types Section**
Optional type restrictions:

| Field | Default | Description |
|-------|---------|-------------|
| `enforceAllowedTypes` | `false` | Whether to restrict types to those with descriptions in `.a24z/types/` |

## Tag Descriptions (`.a24z/tags/`)

Tag descriptions are stored as individual markdown files in the `.a24z/tags/` directory. This allows for rich documentation of what each tag means and when to use it.

### Example: `.a24z/tags/bug.md`

```markdown
# Bug Tag

Used for documenting known issues and their workarounds.

## When to Use
- When you discover a bug that can't be immediately fixed
- When documenting a workaround for a known issue
- When explaining why certain defensive code exists

## Examples
- "Database connection pool exhaustion under high load"
- "React hook dependency causes infinite re-renders"
- "API returns 500 instead of 404 for missing resources"
```

### Benefits of Markdown Files
- **Rich formatting** - Use headers, lists, code blocks, etc.
- **Controlled length** - Descriptions limited to 2000 characters by default (configurable)
- **Flexible naming** - Tag names can be any length
- **Version controlled** - Track changes to tag definitions over time
- **Easy to edit** - Use any text editor or IDE
- **Composable** - Each tag has its own file, making it easy to add/remove tags

## Type Descriptions (`.a24z/types/`)

Type descriptions are stored as individual markdown files in the `.a24z/types/` directory. This allows teams to define custom note types beyond the built-in types.

### Example: `.a24z/types/incident.md`

```markdown
# Incident Type

For documenting production incidents and post-mortems.

## When to Use
- Production outages and their root causes
- Performance degradations
- Security incidents
- Data corruption events

## Required Information
- Timeline of events
- Root cause analysis
- Remediation steps taken
- Prevention measures implemented
```

### Benefits
- **Custom Types** - Define types specific to your team's needs
- **Rich Documentation** - Use markdown to explain when and how to use each type
- **Enforcement** - Optionally restrict notes to only use documented types
- **Flexibility** - Mix standard types (decision, pattern, gotcha, explanation) with custom ones

## Note Guidance (`.a24z/note-guidance.md`)

Optional markdown file with team-specific guidelines for creating effective notes.

### Example: `.a24z/note-guidance.md`

```markdown
# Repository Note Guidelines

## What Makes a Good Note
- Focus on "why" not "what" (the code shows what)
- Include context about decisions
- Reference related issues/PRs
- Explain non-obvious gotchas

## Required Information
- Problem statement
- Solution approach
- Trade-offs considered
- Future considerations

## Tag Usage
- `bug`: Known issues with workarounds
- `feature`: Implementation decisions
- `gotcha`: Non-obvious behaviors
- `pattern`: Reusable solutions
- `architecture`: High-level design decisions
```

## Configuration Management

### Via Library (TypeScript/JavaScript)

```typescript
import { A24zMemory } from 'a24z-memory';

const memory = new A24zMemory('/path/to/repo');

// Get current configuration
const config = memory.getConfiguration();

// Update configuration
memory.updateConfiguration({
  limits: { 
    noteMaxLength: 15000,
    tagDescriptionMaxLength: 3000
  },
  tags: { 
    enforceAllowedTags: true
  },
  types: {
    enforceAllowedTypes: true
  }
});

// Manage tag descriptions (stored as markdown files)
memory.saveTagDescription('security', '# Security Tag\n\nFor security-related issues...');
memory.getTagDescriptions(); // Returns all descriptions
memory.deleteTagDescription('deprecated-tag');

// Manage type descriptions (stored as markdown files)
memory.saveTypeDescription('incident', '# Incident Type\n\nFor production incidents...');
memory.getTypeDescriptions(); // Returns all type descriptions
memory.deleteTypeDescription('deprecated-type');
```

### Via MCP Tools

- `get_repository_guidance` - Shows comprehensive configuration including limits, restrictions, and descriptions
- `get_repository_tags` - Shows available/allowed tags with their descriptions
- `create_repository_note` - Creates notes that are validated against configuration
- `askA24zMemory` - Queries notes with tag filtering

## Best Practices

### 1. Start Simple
- Use default configuration
- Add tag descriptions as you discover patterns
- Let the system grow organically with your team's needs

### 2. Tag Descriptions
- Create markdown files for commonly used tags
- Include examples of when to use each tag
- Document any team-specific meanings

### 3. Tag & Type Enforcement (Optional)
```json
{
  "tags": {
    "enforceAllowedTags": true
  },
  "types": {
    "enforceAllowedTypes": true
  }
}
```
- Useful for larger teams to maintain consistency
- Prevents tag/type proliferation
- Ensures everyone uses the same vocabulary
- Tags/types are defined by creating description files in `.a24z/tags/` and `.a24z/types/`

### 4. Note Guidance
- Document team-specific practices
- Include examples of good notes
- Explain your team's tagging philosophy

### 5. Version Control
- Commit all `.a24z/` files to git
- Track how your team's understanding evolves
- Share knowledge across the entire team

## Example Configurations

### Small Team/Personal Project
```json
{
  "version": 1,
  "limits": {
    "noteMaxLength": 10000,
    "maxTagsPerNote": 10,
    "maxAnchorsPerNote": 20,
    "tagDescriptionMaxLength": 2000
  },
  "tags": {
    "enforceAllowedTags": false
  }
}
```

### Large Team/Enterprise
```json
{
  "version": 1,
  "limits": {
    "noteMaxLength": 20000,
    "maxTagsPerNote": 5,
    "maxAnchorsPerNote": 10,
    "tagDescriptionMaxLength": 1000
  },
  "tags": {
    "allowedTags": ["bug", "feature", "security", "performance", "architecture"],
    "enforceAllowedTags": true
  }
}
```

### Open Source Project
```json
{
  "version": 1,
  "limits": {
    "noteMaxLength": 15000,
    "maxTagsPerNote": 8,
    "maxAnchorsPerNote": 15,
    "tagDescriptionMaxLength": 3000
  },
  "tags": {
    "allowedTags": ["bug", "feature", "breaking-change", "migration", "api", "documentation"],
    "enforceAllowedTags": false
  }
}
```

## Viewing Configuration

Use the MCP tool to see your current configuration:

```
get_repository_guidance path: /your/repo
```

This returns:
- Configuration limits
- Tag restrictions (if any)
- Tag descriptions (from markdown files)
- Note guidance
- File locations summary