# Spatial User Journey Workflows - CodebaseView Architecture

## New Developer Memory Palace Onboarding

```mermaid
journey
    title Spatial Memory Palace Onboarding
    section Spatial Discovery
        Discover spatial tools: 5: Developer
        Learn view patterns: 4: Developer
        Understand grid navigation: 3: Developer
    section Memory Palace Exploration
        Navigate existing views: 4: Developer
        Explore grid coordinates: 3: Developer
        Find spatial patterns: 4: Developer
    section Spatial Contribution
        Create view-anchored notes: 5: Developer
        Document spatial decisions: 4: Developer
        Share memory palace knowledge: 5: Developer
```

## Spatial Bug Investigation Journey

```mermaid
journey
    title Spatial Bug Investigation Workflow
    section Spatial Investigation
        Search across views: 5: Developer
        Check grid patterns: 4: Developer
        Navigate spatial gotchas: 3: Developer
    section View-Aware Analysis
        Get spatial context: 4: Developer
        Find similar in views: 3: Developer
        Validate view anchors: 2: Developer
    section Spatial Resolution
        Document in correct cell: 5: Developer
        Update view patterns: 4: Developer
        Anchor prevention knowledge: 4: Developer
```

## Spatial Architecture Decision Journey

```mermaid
journey
    title Spatial Architecture Decision Process
    section View-Based Research
        Search precedents across views: 5: Architect
        Check spatial patterns: 4: Architect
        Review view-anchored decisions: 4: Architect
    section Spatial Evaluation
        Get view guidance: 3: Architect
        Compare across grid cells: 4: Architect
        Assess spatial impact: 5: Architect
    section Memory Palace Documentation
        Record in appropriate view: 5: Architect
        Update spatial patterns: 4: Architect
        Share view-contextualized rationale: 4: Architect
```

## Spatial Code Review Journey

```mermaid
journey
    title Spatial Code Review Enhancement
    section Spatial Preparation
        Understand view context: 4: Reviewer
        Check grid patterns: 3: Reviewer
        Review spatial decisions: 3: Reviewer
    section View-Aware Review
        Apply spatial standards: 4: Reviewer
        Find view improvements: 4: Reviewer
        Suggest grid patterns: 3: Reviewer
    section Memory Palace Feedback
        Document in correct view: 4: Reviewer
        Update spatial knowledge: 3: Reviewer
        Improve view processes: 4: Reviewer
```

## Spatial State Transition Flow - Memory Palace Navigation

```mermaid
flowchart TD
    A[Start Memory Palace Navigation] --> B{What spatial operation?}
    B -->|Navigate existing views| C[askA24zMemory]
    B -->|Create spatial knowledge| D[get_repository_guidance]
    B -->|Maintain memory palace| E[check_stale_notes]
    B -->|Explore spatial tools| F[discover_a24z_tools]

    C --> G{Need spatial details?}
    G -->|Yes, view context| H[get_repository_note]
    G -->|Found view gap| I[create_repository_note]
    G -->|Need spatial standards| D
    G -->|Find similar in views| S[find_similar_notes]

    D --> J[get_repository_tags]
    J --> I

    H --> K{Spatial action needed?}
    K -->|Update view content| I
    K -->|Remove from view| L[delete_repository_note]
    K -->|Consolidate across views| M[merge_notes]

    S --> T{Similar notes found?}
    T -->|Merge across views| M
    T -->|Create in new view| I
    T -->|Navigate to existing| H

    E --> N{Found spatial issues?}
    N -->|Stale view anchors| L
    N -->|Cross-view duplicates| O[review_duplicates]

    O --> P{View action needed?}
    P -->|Merge views| M
    P -->|Delete from views| L

    M --> L
    L --> Q[End - Memory Palace Updated]
    I --> Q

    F --> R{Spatial interest?}
    R -->|View tagging| J
    R -->|Spatial guidance| D
    R -->|View examples| C

    classDef startEnd fill:#e1f5fe,stroke:#01579b
    classDef decision fill:#fff3e0,stroke:#ef6c00
    classDef action fill:#e8f5e8,stroke:#2e7d32
    classDef terminal fill:#fce4ec,stroke:#c2185b
    classDef spatial fill:#f3e5f5,stroke:#7b1fa2

    class A,Q startEnd
    class B,G,K,N,P,R,T decision
    class C,D,E,F,H,I,J,L,M,O,S action
    class Q terminal
    class I,S spatial
```

## New CodebaseView Journey: Memory Palace Creation

```mermaid
journey
    title Creating a New Memory Palace View
    section View Planning
        Analyze codebase structure: 4: Architect
        Design grid layout: 5: Architect
        Map files to cells: 3: Architect
    section View Implementation
        Create view configuration: 4: Architect
        Test spatial patterns: 3: Architect
        Validate grid coordinates: 4: Architect
    section Knowledge Migration
        Migrate existing notes: 3: Architect
        Establish spatial anchors: 5: Architect
        Update cross-view links: 4: Architect
```
