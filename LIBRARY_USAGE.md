# Using a24z-memory as a Library

The a24z-memory package can be used as a library in your Node.js applications, not just as an MCP server.

## Installation

```bash
npm install a24z-memory
# or
yarn add a24z-memory
# or
pnpm add a24z-memory
```

## Basic Usage

### High-Level API

The simplest way to use a24z-memory is through the `A24zMemory` class:

```typescript
import { A24zMemory } from 'a24z-memory';

// Initialize for current directory
const memory = new A24zMemory();

// Or specify a repository path
const memory = new A24zMemory('/path/to/your/repo');

// Save a note
const note = memory.saveNote({
  note: 'This function handles user authentication',
  anchors: ['src/auth.ts', 'src/middleware/auth.ts'],
  tags: ['authentication', 'security'],
  confidence: 'high',
  type: 'explanation',
  metadata: {
    author: 'john.doe',
    jiraTicket: 'AUTH-123'
  }
});

// Retrieve notes for a path
const notes = memory.getNotesForPath('src/auth.ts');

// Get all used tags
const tags = memory.getUsedTags();

// Get repository guidance
const guidance = memory.getGuidance();
```

### Low-Level API

For more control, you can use the individual functions:

```typescript
import {
  saveNote,
  getNotesForPath,
  normalizeRepositoryPath,
  findGitRoot
} from 'a24z-memory';

// Find the git repository root
const repoRoot = findGitRoot(process.cwd());

// Save a note directly
const note = saveNote({
  note: 'Important implementation detail',
  directoryPath: repoRoot,
  anchors: ['src/core/engine.ts'],
  tags: ['core', 'engine'],
  confidence: 'medium',
  type: 'gotcha',
  metadata: {}
});

// Query notes with filters
const notes = getNotesForPath(
  '/path/to/file.ts',
  true,  // includeParentNotes
  10     // maxResults
);
```

### Using the Tools Directly

You can also use the MCP tools programmatically:

```typescript
import { RepositoryNoteTool, AskA24zMemoryTool } from 'a24z-memory';

// Create a note using the tool
const createTool = new RepositoryNoteTool();
const result = await createTool.execute({
  note: 'Database connection pooling configuration',
  directoryPath: '/absolute/path/to/repo',
  anchors: ['src/db/config.ts'],
  tags: ['database', 'configuration'],
  confidence: 'high',
  type: 'decision'
});

// Query notes using the tool
const queryTool = new AskA24zMemoryTool();
const queryResult = await queryTool.execute({
  query: 'How does authentication work?',
  path: '/path/to/repo',
  filterTags: ['authentication'],
  filterTypes: ['explanation', 'pattern']
});
```

## Type Definitions

### StoredNote

```typescript
interface StoredNote {
  id: string;
  note: string;
  anchors: string[];
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
  type: 'decision' | 'pattern' | 'gotcha' | 'explanation';
  metadata: Record<string, unknown>;
  timestamp: number;
}
```

### Note Types

- **decision**: Architectural or design decisions
- **pattern**: Reusable patterns or best practices
- **gotcha**: Tricky issues, bugs, or non-obvious behaviors
- **explanation**: General documentation or explanations

### Confidence Levels

- **high**: Well-tested, production-proven information
- **medium**: Reasonable assumptions, likely correct
- **low**: Experimental or uncertain information

## Path Handling

All paths are handled intelligently:

```typescript
import { normalizeRepositoryPath, findGitRoot } from 'a24z-memory';

// Find the repository root from any path
const repoRoot = normalizeRepositoryPath('/path/to/repo/src/file.ts');
// Returns: /path/to/repo

// Find git root specifically
const gitRoot = findGitRoot('/path/to/repo/deep/nested/file.ts');
// Returns: /path/to/repo (if it contains .git)
```

## Storage Location

Notes are stored in a `.a24z` directory at the repository root:
- `.a24z/repository-notes.json` - All notes for the repository
- `.a24z/note-guidance.md` - Custom guidance for note creation

## Advanced Usage

### Custom Metadata

You can attach any metadata to notes:

```typescript
const note = memory.saveNote({
  note: 'Redis caching implementation',
  anchors: ['src/cache/redis.ts'],
  tags: ['cache', 'redis'],
  metadata: {
    performanceImpact: 'high',
    complexity: 'medium',
    relatedPRs: ['#123', '#456'],
    benchmarks: {
      before: '500ms',
      after: '50ms'
    }
  }
});
```

### Filtering and Searching

```typescript
// Get notes for multiple paths
const paths = ['src/auth.ts', 'src/middleware/auth.ts'];
const allNotes = paths.flatMap(p => 
  getNotesForPath(p, false, 5)
);

// Filter by confidence
const highConfidenceNotes = allNotes.filter(n => 
  n.confidence === 'high'
);

// Filter by type
const patterns = allNotes.filter(n => 
  n.type === 'pattern'
);

// Search by tags
const securityNotes = allNotes.filter(n => 
  n.tags.includes('security')
);
```

### Embedding the MCP Server

You can also programmatically run the MCP server:

```typescript
import { McpServer } from 'a24z-memory';

const server = new McpServer({
  name: 'Custom Memory Server',
  version: '1.0.0'
});

// Add custom tools if needed
// server.addTool(new MyCustomTool());

// Start the server
await server.start();
```

## Examples

### Building a Documentation Generator

```typescript
import { A24zMemory } from 'a24z-memory';
import * as fs from 'fs';

const memory = new A24zMemory();
const notes = memory.getNotesForPath('/', true, 1000);

// Group notes by type
const grouped = notes.reduce((acc, note) => {
  if (!acc[note.type]) acc[note.type] = [];
  acc[note.type].push(note);
  return acc;
}, {});

// Generate markdown documentation
let doc = '# Repository Knowledge Base\n\n';

if (grouped.decision) {
  doc += '## Architectural Decisions\n\n';
  grouped.decision.forEach(note => {
    doc += `### ${note.tags.join(', ')}\n`;
    doc += `${note.note}\n\n`;
  });
}

fs.writeFileSync('KNOWLEDGE.md', doc);
```

### Git Hook Integration

```typescript
// .git/hooks/post-commit
import { A24zMemory } from 'a24z-memory';
import { execSync } from 'child_process';

const memory = new A24zMemory();
const changedFiles = execSync('git diff --name-only HEAD~1')
  .toString()
  .split('\n')
  .filter(Boolean);

// Check if any notes need updating
changedFiles.forEach(file => {
  const notes = memory.getNotesForPath(file);
  if (notes.length > 0) {
    console.log(`Consider updating notes for ${file}`);
    notes.forEach(note => {
      console.log(`  - ${note.id}: ${note.tags.join(', ')}`);
    });
  }
});
```

## Error Handling

The library includes comprehensive error handling:

```typescript
try {
  const note = memory.saveNote({
    note: 'My note',
    anchors: [],  // Will throw - at least one anchor required
    tags: []       // Will throw - at least one tag required
  });
} catch (error) {
  console.error('Failed to save note:', error.message);
}
```

## Contributing

See the main README for contribution guidelines.