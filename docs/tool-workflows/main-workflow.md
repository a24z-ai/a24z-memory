# a24z-Memory Spatial Workflows - CodebaseView Architecture

## Primary Spatial Knowledge Workflow

```mermaid
stateDiagram-v2
    [*] --> askA24zMemory: Navigate memory palace
    askA24zMemory --> get_repository_note: Explore spatial context
    askA24zMemory --> create_repository_note: Found knowledge gap in view
    askA24zMemory --> get_repository_guidance: Need spatial patterns

    get_repository_note --> create_repository_note: Add spatial context
    get_repository_note --> askA24zMemory: Cross-view exploration

    get_repository_guidance --> create_repository_note: Apply view guidance
    get_repository_guidance --> get_repository_tags: Check spatial tagging

    create_repository_note --> [*]: Anchor knowledge spatially

    note right of askA24zMemory
        Spatial entry point across
        all CodebaseViews and cells
    end note

    note right of create_repository_note
        Terminal state: knowledge
        anchored to view coordinates
    end note
```

## Spatial Memory Palace Maintenance Workflow

```mermaid
stateDiagram-v2
    [*] --> check_stale_notes: Validate spatial anchors
    [*] --> review_duplicates: Cross-view content audit

    check_stale_notes --> delete_repository_note: Remove invalid anchors
    check_stale_notes --> get_repository_note: Review spatial context

    review_duplicates --> merge_notes: Consolidate across views
    review_duplicates --> delete_repository_note: Remove spatial duplicates

    get_repository_note --> delete_repository_note: Confirm spatial deletion
    get_repository_note --> merge_notes: Preserve view context

    merge_notes --> delete_repository_note: Clean up view originals
    delete_repository_note --> [*]: Spatial maintenance complete

    note right of check_stale_notes
        Validates grid coordinates and
        file anchors across all views
    end note

    note right of review_duplicates
        Identifies content overlap
        across different CodebaseViews
    end note
```

## Spatial Discovery & View Creation Workflow

```mermaid
stateDiagram-v2
    [*] --> discover_a24z_tools: Explore spatial capabilities
    [*] --> get_repository_guidance: Learn view patterns

    discover_a24z_tools --> get_repository_tags: Understand spatial tagging
    discover_a24z_tools --> askA24zMemory: Explore existing views

    get_repository_guidance --> get_repository_tags: See spatial tag guidance
    get_repository_guidance --> create_repository_note: Document view patterns

    get_repository_tags --> create_repository_note: Apply spatial tagging
    get_repository_tags --> askA24zMemory: Find view examples

    note right of discover_a24z_tools
        Spatial onboarding: learning
        CodebaseView navigation
    end note

    note left of get_repository_guidance
        Understanding memory palace
        organizational principles
    end note
```

## Spatial Transition Probability Matrix

Based on CodebaseView-aware usage patterns:

| From → To                     | askA24z | create_note | get_note | guidance | tags | delete_note | merge | stale | duplicates | discover | similar |
| ----------------------------- | ------- | ----------- | -------- | -------- | ---- | ----------- | ----- | ----- | ---------- | -------- | ------- |
| **askA24zMemory**             | -       | 0.35        | 0.25     | 0.2      | 0.1  | -           | -     | -     | -          | -        | 0.1     |
| **create_repository_note**    | -       | -           | -        | -        | -    | -           | -     | -     | -          | -        | -       |
| **get_repository_note**       | 0.3     | 0.4         | -        | -        | -    | 0.3         | -     | -     | -          | -        | -       |
| **get_repository_guidance**   | -       | 0.6         | -        | -        | 0.4  | -           | -     | -     | -          | -        | -       |
| **get_repository_tags**       | 0.2     | 0.5         | -        | -        | -    | -           | -     | -     | -          | -        | 0.3     |
| **delete_repository_note**    | -       | -           | -        | -        | -    | -           | -     | -     | -          | -        | -       |
| **merge_notes**               | -       | -           | -        | -        | -    | 0.7         | -     | -     | -          | -        | -       |
| **check_stale_notes**         | -       | -           | 0.4      | -        | -    | 0.6         | -     | -     | -          | -        | -       |
| **review_duplicates**         | -       | -           | -        | -        | -    | 0.3         | 0.7   | -     | -          | -        | -       |
| **discover_a24z_tools**       | 0.4     | -           | -        | 0.3      | 0.3  | -           | -     | -     | -          | -        | -       |
| **find_similar_notes**        | 0.2     | 0.4         | 0.2      | -        | -    | -           | 0.2   | -     | -          | -        | -       |

**Spatial Architecture Legend:**

- **Terminal States**: create_repository_note, delete_repository_note (spatially anchored endpoints)
- **Entry States**: askA24zMemory, discover_a24z_tools, check_stale_notes, review_duplicates
- **Transition States**: get_repository_note, get_repository_guidance, get_repository_tags, merge_notes, find_similar_notes
- **Spatial Context**: All transitions now consider CodebaseView associations and grid coordinates

## New Spatial-Aware Tool Behaviors

### Enhanced Spatial Navigation
- **askA24zMemory**: Now searches across CodebaseViews and respects grid positioning
- **create_repository_note**: Requires CodebaseView association, supports cell coordinates
- **find_similar_notes**: Considers spatial proximity in similarity scoring
- **check_stale_notes**: Validates both file anchors and view configurations
