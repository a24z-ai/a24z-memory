# Design Document: Save with Validation for Codebase Views

## Overview
The Memory Palace CLI will support saving codebase views with validation feedback. The system will always save the view (even if invalid) but provide clear feedback about validation issues, allowing users to iteratively improve their views.

## Architecture Principle
**The CLI must only interact with the codebase through the MemoryPalace class.** The MemoryPalace class serves as the single interface for all operations. The CLI should never directly access stores, file systems, or any internal implementation details.

## User Experience

### Command Structure
```bash
# Save a new view from a JSON file
memory-palace save <view-file.json>

# Save and set as default
memory-palace save <view-file.json> --default

# Validate an existing saved view
memory-palace validate <view-name-or-path>
```

### Save Flow
1. User runs `memory-palace save my-view.json`
2. CLI reads the JSON file
3. CLI uses MemoryPalace to validate and save the view
4. View is saved to `.a24z/views/` regardless of validation status
5. **CLI deletes the original input file** (since it's now stored in `.a24z/views/`)
6. CLI displays formatted validation results

### Important: File Handling
- The original JSON file provided by the user is **moved** to `.a24z/views/`
- After successful save, the original file is deleted by the CLI
- The view is now managed in `.a24z/views/<view-id>.json`
- Users can edit the saved view directly in `.a24z/views/` for updates

### Example Output

#### Successful save with warnings:
```
✅ View 'architecture-overview' saved to .a24z/views/architecture-overview.json
📄 Original file 'my-view.json' has been removed (now stored in .a24z/views/)

⚠️  Validation Warnings:
[Validation issues listed here...]

💡 To fix these issues:
   - Edit: .a24z/views/architecture-overview.json
   - Run: memory-palace validate architecture-overview
```

#### Critical errors (still saves):
```
✅ View 'my-view' saved to .a24z/views/my-view.json
📄 Original file 'broken-view.json' has been removed (now stored in .a24z/views/)

❌ Critical Issues:
[Critical issues listed here...]

⚠️  This view may not render properly until these issues are fixed.

💡 Edit the saved view at: .a24z/views/my-view.json
```

## Implementation Plan

### Phase 1: Extend MemoryPalace
- Add validation capabilities to MemoryPalace
- Add save with validation functionality
- Ensure all operations go through MemoryPalace interface

### Phase 2: CLI Commands
1. Create `save` command
   - Read JSON file
   - Call MemoryPalace to save with validation
   - Delete original file on success
   - Format and display results

2. Create `validate` command
   - Use MemoryPalace to validate views
   - Format and display results

### Phase 3: Output Formatting
- Create formatting utilities for terminal display
- Use colors and symbols for better readability
- Provide clear, actionable feedback

## Separation of Concerns

### CLI Responsibilities:
- Reading input files
- Managing original file deletion
- Formatting output for terminal
- Command-line argument parsing
- User interaction and feedback

### MemoryPalace Responsibilities:
- All validation logic
- Saving and retrieving views
- Managing view storage
- Ensuring data integrity
- All business logic

## Error Recovery

The system ensures:
1. Views are always saved to preserve user's work
2. Validation never prevents saving
3. Original files are only deleted after successful save
4. Clear messaging about what happened and where files are

## User Workflow

1. User creates a view JSON file anywhere in their filesystem
2. User runs `memory-palace save path/to/view.json`
3. View is validated and saved to `.a24z/views/`
4. Original file is removed
5. User can iterate by editing `.a24z/views/<view-id>.json`
6. User can re-validate with `memory-palace validate <view-id>`

## Success Metrics

- Clean architecture with MemoryPalace as the single interface
- CLI remains a thin presentation layer
- Users never lose work (always saves)
- Clear feedback about validation issues
- Smooth iterative improvement workflow