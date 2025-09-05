# CodebaseView Integration Plan for a24z-Memory

## Overview
This document outlines the plan for integrating CodebaseView configurations into the a24z-memory library, replacing the deprecated type system with a spatial organization approach where notes are associated with visual grid layouts.

## Core Concepts

### ViewFileCell
A cell in the grid that contains files matching specific patterns. Each cell has:
- Required file/directory patterns
- Grid position (coordinates)
- Optional priority for conflict resolution
- Optional visual properties (color, label)
- Optional navigation links to other views

### CodebaseView
A complete grid-based layout configuration that organizes a repository's files into spatial cells. Notes can be associated with specific views and cells, creating a "memory palace" where knowledge is organized spatially.

## Implementation Phases

### Phase 1: Core Type Definitions
**Location:** `src/core-mcp/store/viewsStore.ts`

Define the fundamental types:
- `ViewFileCell` - Individual cell configuration
- `ViewScope` - Filtering configuration
- `CodebaseView` - Complete view configuration
- `ViewSummary` - Lightweight view metadata

### Phase 2: Core Validation Functions
**Location:** `src/core-mcp/validation/viewValidator.ts`

Implement validation functions without external dependencies:
- `validateViewFileCell()` - Validate individual cell configuration
- `validateCodebaseView()` - Validate complete view configuration
- `validatePatterns()` - Validate glob patterns
- `validateGridDimensions()` - Ensure grid dimensions are valid
- `detectPatternConflicts()` - Find overlapping patterns between cells

### Phase 3: Enhanced Note Storage
**Location:** `src/core-mcp/store/notesStore.ts`

Modify the StoredNote interface to add:
- `viewId?: string` - Associated view identifier
- `cellCoordinates?: [number, number]` - Specific cell location

### Phase 4: Storage Implementation
**Location:** `src/core-mcp/store/viewsStore.ts`

Implement ViewsStore class:
- `saveView()` - Persist view configuration
- `getView()` - Retrieve view by ID
- `listViews()` - List all available views
- `deleteView()` - Remove a view
- `updateView()` - Update existing view

Storage location: `.a24z/views/` directory to keep all a24z data organized together

### Phase 5: Note-View Association API
**Location:** `src/core-mcp/store/notesStore.ts`

New functions:
- `saveNoteWithView()` - Create note with view association
- `getNotesForView()` - Query notes by view/cell
- `getNotesForCell()` - Get notes in specific cell
- `detectCellForAnchors()` - Auto-detect cell based on file anchors
- `updateNoteView()` - Change note's view association

### Phase 6: View-Based Querying
**Location:** `src/core-mcp/services/viewQueryService.ts`

Query capabilities:
- Get all notes in a view
- Get notes by cell coordinates
- Find orphaned notes (no view association)
- Get view statistics (notes per cell)
- Search across views

### Phase 7: MCP Tools Integration
**Location:** `src/core-mcp/tools/`

New tools:
- `CreateViewNoteTool` - Create note with view context
- `GetViewNotesTool` - Query notes by view
- `ListViewsTool` - List available views
- `ViewStatsTool` - Get view statistics and coverage analysis

## File Structure

```
a24z-Memory/
├── src/
│   └── core-mcp/
│       ├── store/
│       │   ├── notesStore.ts      (modified)
│       │   └── viewsStore.ts      (new)
│       ├── validation/
│       │   └── viewValidator.ts   (new)
│       ├── services/
│       │   └── viewQueryService.ts (new)
│       └── tools/
│           ├── CreateViewNoteTool.ts (new)
│           ├── GetViewNotesTool.ts   (new)
│           └── ListViewsTool.ts      (new)
└── .a24z/
    ├── views/
    │   ├── default.json
    │   └── [other-views].json
    ├── notes/
    │   └── [year]/[month]/
    └── configuration.json
```

## Backward Compatibility

- Existing notes without viewId will continue to work as "orphaned" notes
- Original anchor-based queries remain fully functional
- No migration required - views are purely additive functionality

## Benefits

1. **Spatial Organization**: Notes are organized in a visual grid
2. **Multiple Perspectives**: Same code can be viewed through different lenses
3. **Better Context**: Notes are associated with architectural areas
4. **Visual Memory**: Leverage spatial memory for knowledge retrieval
5. **Team Alignment**: Shared mental models through shared views

## Implementation Order

1. **Type Definitions** - Create core interfaces (ViewFileCell, CodebaseView)
2. **Validation Functions** - Build validation without external dependencies
3. **Update StoredNote** - Add view association fields
4. **Storage Layer** - Implement ViewsStore class
5. **Association APIs** - Functions to link notes with views
6. **Query Service** - View-based note retrieval
7. **MCP Tools** - User-facing interface

## Success Criteria

- [ ] All TypeScript types defined and compile
- [ ] Validation functions have 100% test coverage
- [ ] Existing notes continue to work without modification  
- [ ] View-based queries perform efficiently
- [ ] MCP tools integrate seamlessly with existing workflow
- [ ] Documentation updated with examples

## Next Steps

1. Begin with Phase 1: Define ViewFileCell and CodebaseView types
2. Implement core validation functions
3. Create MCP tools for user interaction
4. Test with existing .city-layouts configurations