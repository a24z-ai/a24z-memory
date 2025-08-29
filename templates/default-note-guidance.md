# Repository Note Guidelines

## What Makes a Good Note

Notes should capture knowledge that isn't obvious from reading the code itself. Focus on:

- **Why** decisions were made (not just what was done)
- **Context** that influenced the implementation
- **Trade-offs** that were considered
- **Gotchas** that might trip up future developers

## Preferred Note Types

### Architecture Decisions

Document significant architectural choices and their rationale:

- System design patterns and why they were chosen
- Technology selections and alternatives considered
- Performance vs. maintainability trade-offs
- Integration points and their constraints

### Bug Fixes & Gotchas

Capture non-obvious issues and their solutions:

- Root causes that weren't immediately apparent
- Workarounds for third-party limitations
- Edge cases that required special handling
- Performance bottlenecks and their fixes

### Implementation Patterns

Share reusable solutions and best practices:

- Common patterns used throughout the codebase
- Helper functions and their intended use cases
- Configuration strategies
- Testing approaches for complex scenarios

### Technical Debt & TODOs

Track areas needing future attention:

- Temporary solutions that need revisiting
- Refactoring opportunities
- Upgrade paths for deprecated dependencies
- Performance optimizations to consider

### Performance Insights

Document performance-related discoveries:

- Bottlenecks and their solutions
- Optimization strategies that worked
- Caching decisions and invalidation strategies
- Scaling considerations

## Note Quality Guidelines

**Be specific**: Reference exact files, functions, or line numbers.

**Add context**: Include links to relevant issues, PRs, or external documentation.

**Use examples**: Show code snippets when explaining complex concepts.

```typescript
// Example: Document why a specific pattern was chosen
// Using factory pattern here because we need different
// implementations based on runtime configuration
const handler = HandlerFactory.create(config.type);
```

**Tags**: Use consistent tags to make notes discoverable.

## Best Practices

1. **Be Specific**: Reference specific files, functions, or line numbers
2. **Add Context**: Include links to issues, PRs, or documentation
3. **Keep It Fresh**: Update notes when implementations change
4. **Be Concise**: Get to the point quickly while providing necessary detail
5. **Think Future**: Write for someone (maybe you) debugging at 3 AM

## Preferred Tags

Use tags to categorize and make notes discoverable:

### Technical Categories

- `architecture`: High-level design decisions
- `bug-fix`: Solutions to reported bugs
- `performance`: Optimizations and bottlenecks
- `security`: Security considerations and fixes
- `authentication`: Auth flows and access control
- `refactor`: Code improvement decisions
- `workaround`: Temporary solutions
- `gotcha`: Non-obvious behaviors
- `pattern`: Reusable implementation patterns

### Component Categories

- `frontend`: UI/UX related notes
- `backend`: Server-side logic and APIs
- `database`: Data storage and queries
- `infrastructure`: Deployment and DevOps
- `testing`: Test strategies and utilities
- `documentation`: Documentation decisions

## Example Note

```markdown
# OAuth Token Refresh Strategy

**Tags**: `architecture`, `security`, `backend`

## Context

Implemented automatic token refresh to prevent user logouts during active sessions.

## Decision

Using interceptor pattern to catch 401 responses and retry with refreshed token.
Chose this over proactive refresh to minimize unnecessary API calls.

## Trade-offs

- Pro: Reduces server load
- Pro: Simpler implementation
- Con: First failed request adds latency

## Implementation

See `src/auth/tokenInterceptor.ts:45-72`
```
