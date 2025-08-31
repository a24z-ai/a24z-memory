# a24z-Memory Tool Workflows - Markov Chain Analysis

## Primary Knowledge Workflow

```mermaid
stateDiagram-v2
    [*] --> askA24zMemory: Start research
    askA24zMemory --> get_repository_note: Need details
    askA24zMemory --> create_repository_note: Found knowledge gap
    askA24zMemory --> get_repository_guidance: Need documentation standards

    get_repository_note --> create_repository_note: Add missing context
    get_repository_note --> askA24zMemory: Ask follow-up questions

    get_repository_guidance --> create_repository_note: Apply guidance
    get_repository_guidance --> get_repository_tags: Check available tags

    create_repository_note --> [*]: Complete documentation

    note right of askA24zMemory
        Entry point for most
        knowledge-seeking workflows
    end note

    note right of create_repository_note
        Terminal state for
        knowledge creation
    end note
```

## Maintenance & Cleanup Workflow

```mermaid
stateDiagram-v2
    [*] --> check_stale_notes: Periodic maintenance
    [*] --> review_duplicates: Content audit

    check_stale_notes --> delete_note: Remove stale notes
    check_stale_notes --> get_repository_note: Review before deletion

    review_duplicates --> merge_notes: Consolidate similar content
    review_duplicates --> delete_note: Remove duplicates

    get_repository_note --> delete_note: Confirm deletion
    get_repository_note --> merge_notes: Use in consolidation

    merge_notes --> delete_note: Clean up originals
    delete_note --> [*]: Maintenance complete

    note right of check_stale_notes
        Detects broken file references
        in existing notes
    end note

    note right of review_duplicates
        Identifies content overlap
        and redundancy
    end note
```

## Tool Discovery & Setup Workflow

```mermaid
stateDiagram-v2
    [*] --> discover_a24z_tools: Explore capabilities
    [*] --> get_repository_guidance: Learn documentation standards

    discover_a24z_tools --> get_repository_tags: Understand categorization
    discover_a24z_tools --> askA24zMemory: Get usage examples

    get_repository_guidance --> get_repository_tags: See tag guidance
    get_repository_guidance --> create_repository_note: Document new patterns

    get_repository_tags --> create_repository_note: Apply proper tagging
    get_repository_tags --> askA24zMemory: Find tagging examples

    note right of discover_a24z_tools
        New user onboarding
        and tool exploration
    end note
```

## Transition Probability Matrix

Based on typical usage patterns:

| From → To                   | askA24zMemory | create_note | get_note | get_guidance | get_tags | delete_note | merge_notes | check_stale | review_dup | discover |
| --------------------------- | ------------- | ----------- | -------- | ------------ | -------- | ----------- | ----------- | ----------- | ---------- | -------- |
| **askA24zMemory**           | -             | 0.4         | 0.3      | 0.2          | 0.1      | -           | -           | -           | -          | -        |
| **create_repository_note**  | -             | -           | -        | -            | -        | -           | -           | -           | -          | -        |
| **get_repository_note**     | 0.3           | 0.4         | -        | -            | -        | 0.3         | -           | -           | -          | -        |
| **get_repository_guidance** | -             | 0.6         | -        | -            | 0.4      | -           | -           | -           | -          | -        |
| **get_repository_tags**     | 0.2           | 0.5         | -        | -            | -        | -           | -           | -           | -          | -        |
| **delete_note**             | -             | -           | -        | -            | -        | -           | -           | -           | -          | -        |
| **merge_notes**             | -             | -           | -        | -            | -        | 0.7         | -           | -           | -          | -        |
| **check_stale_notes**       | -             | -           | 0.4      | -            | -        | 0.6         | -           | -           | -          | -        |
| **review_duplicates**       | -             | -           | -        | -            | -        | 0.3         | 0.7         | -           | -          | -        |
| **discover_a24z_tools**     | 0.4           | -           | -        | 0.3          | 0.3      | -           | -           | -           | -          | -        |

**Legend:**

- **Terminal States**: create_repository_note, delete_note (end workflows)
- **Entry States**: askA24zMemory, discover_a24z_tools, check_stale_notes, review_duplicates
- **Transition States**: get_repository_note, get_repository_guidance, get_repository_tags, merge_notes
