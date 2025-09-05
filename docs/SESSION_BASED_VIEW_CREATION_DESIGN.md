# Session-Based View Creation Design Document

## Overview

Replace the guidance token system with automatic, just-in-time CodebaseView creation based on user's file anchors. When users create notes without specifying a view, the system automatically generates a session view and logs activity for future customization.

## Problem Statement

### Current Issues
- **Guidance Token Complexity**: Users must understand and manage guidance tokens
- **View Barrier**: Users must manually create views before creating notes
- **Poor Onboarding**: New users face setup friction before they can start documenting

### User Pain Points
- "I just want to document this bug fix, why do I need to create a spatial view first?"
- "What patterns should I use for my view cells?"
- "How do I know if my view organization makes sense?"

## Solution: Session-Based Auto-Creation

### Core Concept
When users create notes without a `codebaseViewId`, automatically:
1. **Analyze their file anchors** to infer organizational patterns
2. **Generate a session view** with smart default cell structure
3. **Return the view ID** for continued use in that session
4. **Log all activity** in an overview document for future customization

### Key Benefits
- ✅ **Zero Friction**: Users can start documenting immediately
- ✅ **Context-Aware**: Views are based on actual files being documented
- ✅ **Educational**: Users learn spatial organization through usage
- ✅ **Customizable**: Full activity log provides context for optimization

## Technical Design

### 1. Note Creation Flow

```typescript
// Current: User must provide codebaseViewId
interface CreateNoteInput {
  note: string;
  anchors: string[];
  tags: string[];
  codebaseViewId: string; // Required - causes friction
}

// Proposed: codebaseViewId becomes optional
interface CreateNoteInput {
  note: string;
  anchors: string[];
  tags: string[];
  codebaseViewId?: string; // Optional - auto-generated if missing
}
```

### 2. Session View Generation

```typescript
interface SessionViewCreator {
  createFromAnchors(
    repositoryPath: string,
    anchors: string[],
    sessionId?: string
  ): {
    viewId: string;
    view: CodebaseView;
    inferredPatterns: string[];
  };
}

function createSessionView(anchors: string[]): CodebaseView {
  const patterns = inferPatternsFromAnchors(anchors);
  const sessionId = generateSessionId();
  
  return {
    id: `session-${sessionId}`,
    name: `Session View (${path.basename(anchors[0])})`,
    version: '1.0.0',
    description: 'Auto-generated from note creation',
    cells: generateCellsFromPatterns(patterns),
    overviewPath: `.a24z/overviews/session-${sessionId}.md`,
    metadata: {
      session: true,
      createdAt: new Date().toISOString(),
      sourceAnchors: anchors
    }
  };
}
```

### 3. Pattern Inference Logic

```typescript
function inferPatternsFromAnchors(anchors: string[]): PatternInference {
  const analysis = analyzeFilePaths(anchors);
  
  return {
    cells: [
      // Common patterns based on path analysis
      {
        name: 'source',
        patterns: [`${analysis.commonPrefix}/**/*`],
        coordinates: [0, 0],
        confidence: analysis.sourceConfidence
      },
      {
        name: 'tests', 
        patterns: ['test*/**/*', '**/*.test.*'],
        coordinates: [0, 1],
        confidence: analysis.testConfidence
      },
      {
        name: 'config',
        patterns: ['*.config.*', 'config/**/*', '.env*'],
        coordinates: [1, 0], 
        confidence: analysis.configConfidence
      },
      {
        name: 'docs',
        patterns: ['*.md', 'docs/**/*'],
        coordinates: [1, 1],
        confidence: analysis.docsConfidence
      }
    ]
  };
}
```

### 4. Activity Log Overview

```typescript
interface ActivityLogEntry {
  timestamp: string;
  noteId: string;
  noteContent: string; // First 100 chars
  anchors: string[];
  tags: string[];
  inferredCell: string;
  matchedPatterns: string[];
}

function appendToActivityLog(
  viewId: string, 
  entry: ActivityLogEntry
): void {
  const overviewPath = getOverviewPath(viewId);
  const logEntry = formatLogEntry(entry);
  
  // Append to markdown log
  appendToMarkdownLog(overviewPath, logEntry);
  
  // Update grid state summary
  updateGridStateSummary(overviewPath, viewId);
}
```

## Implementation Plan

### ✅ Phase 0: Remove Guidance Token System (COMPLETED)
- [x] Remove guidance token requirement from all MCP tool interfaces
- [x] Remove GuidanceTokenManager class and validation logic
- [x] Update CreateRepositoryAnchoredNoteTool to work without tokens
- [x] Clean up test files and fix linting/typechecking issues

### ✅ Phase 1: Core Auto-Creation (COMPLETED)
- [x] Add `generationType` field to CodebaseView metadata to distinguish session vs user views
- [x] Make `codebaseViewId` optional in CreateRepositoryAnchoredNoteTool input schema
- [x] Implement `SessionViewCreator` service with pattern inference
- [x] Add session view auto-creation in note creation flow when codebaseViewId is missing
- [x] Basic pattern inference (directory-based with source/tests/config/docs cells)

### ✅ Phase 2: Activity Logging (COMPLETED)
- [x] Create basic session log template with markdown format
- [x] Implement simple activity append system for session views
- [x] Add activity logging when notes are created in session views
- [x] Include timestamp and note summary in activity entries

### Phase 3: Smart Pattern Inference
- [ ] Enhance pattern detection (file extensions, common structures)
- [ ] Add confidence scoring for pattern suggestions
- [ ] Implement conflict resolution for overlapping patterns
- [ ] Add support for monorepo structures

### Phase 4: View Management
- [ ] Add session view promotion (temporary → permanent)
- [ ] Implement view merging capabilities
- [ ] Add view cleanup for unused sessions
- [ ] Create view customization guidance

## API Changes

### Before (Required View)
```typescript
// User must create view first
const viewId = createCodebaseView(repo, viewConfig);
const note = createNote({
  note: "Bug fix for auth",
  anchors: ["src/auth/middleware.ts"], 
  tags: ["bugfix"],
  codebaseViewId: viewId  // Required
});
```

### After (Optional View)
```typescript
// System auto-creates view
const note = createNote({
  note: "Bug fix for auth",
  anchors: ["src/auth/middleware.ts"],
  tags: ["bugfix"]
  // codebaseViewId auto-generated and returned
});

console.log(note.codebaseViewId); // "session-abc123"
```

## File Structure

```
.a24z/
├── views/
│   ├── session-abc123.json         # Auto-generated view config
│   └── user-frontend.json          # User-created views
├── overviews/
│   ├── session-abc123.md           # Activity log
│   └── user-frontend.md            # User documentation  
└── notes/
    └── 2025/01/
        └── note-xyz.json           # Notes reference view IDs
```

## Success Metrics

### User Experience
- **Time to First Note**: < 30 seconds (down from ~5 minutes with manual setup)
- **Setup Friction**: Zero required configuration
- **Learning Curve**: Spatial concepts learned through usage, not documentation

### System Health
- **View Quality**: 80% of auto-generated patterns provide good file organization
- **User Retention**: Users continue using spatial features after auto-onboarding
- **Customization Rate**: 40% of users eventually customize their session views

## Migration Strategy

### Backward Compatibility
- Existing notes with explicit `codebaseViewId` continue working unchanged
- Manual view creation remains fully supported
- All current MCP tools maintain existing behavior

### Gradual Rollout
1. **Phase 1**: Add optional behavior alongside current required behavior
2. **Phase 2**: Update documentation to show optional pattern
3. **Phase 3**: Deprecate guidance token system
4. **Phase 4**: Remove guidance token code (major version bump)

## Risk Mitigation

### Poor Pattern Inference
- **Risk**: Auto-generated patterns don't match user expectations
- **Mitigation**: Provide clear activity logs showing inference reasoning
- **Fallback**: Users can immediately customize patterns based on log context

### Session View Pollution  
- **Risk**: Too many temporary session views clutter the system
- **Mitigation**: Implement cleanup policies (unused for 30 days)
- **Monitoring**: Track session view usage patterns

### Loss of Intentionality
- **Risk**: Users become passive about spatial organization
- **Mitigation**: Activity logs encourage reflection and customization
- **Education**: Overview documents explain spatial concepts and benefits

## Future Enhancements

### Smart Pattern Learning
- Learn from user customizations to improve auto-generation
- Suggest pattern improvements based on actual usage
- Community pattern sharing for common project types

### Multi-Repository Intelligence
- Detect similar project structures across repositories
- Suggest proven patterns from similar codebases
- Learn organizational preferences per user/team

### Advanced Spatial Features
- Auto-detect related views that should be linked
- Suggest view hierarchies for complex projects  
- Provide spatial navigation recommendations

---

**Next Steps**: Begin Phase 1 implementation with core auto-creation functionality.