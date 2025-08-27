# Repository Note Guidelines

## Preferred Note Types

### 🏗️ Architecture Decisions

- Document major design choices and their rationale
- Include alternatives considered and why they were rejected
- Example: "Chose React over Vue for better TypeScript support and team familiarity"
- **Tags**: `architecture`, `decision`

### 🐛 Bug Fixes & Gotchas

- Document tricky bugs and their solutions
- Include reproduction steps and root cause analysis
- Example: "Race condition in async data loading - always check component mount status"
- **Tags**: `bugfix`, `gotcha`

### 🔧 Implementation Patterns

- Document preferred code patterns and conventions
- Include examples of good and bad practices
- Example: "Use custom hooks for data fetching to ensure consistent error handling"
- **Tags**: `pattern`, relevant tech tags

### ⚡ Performance Insights

- Document performance optimizations and bottlenecks discovered
- Include metrics before/after where applicable
- Example: "Lazy loading components reduced initial bundle size by 40%"
- **Tags**: `performance`, `optimization`

## Preferred Tags

### Technical Areas

- `frontend`, `backend`, `database`, `api`
- `authentication`, `security`, `performance`
- `testing`, `deployment`, `configuration`

### Common Frameworks & Tools

- `react`, `typescript`, `node`, `express`
- `prisma`, `postgresql`, `jest`, `cypress`
- Add project-specific technologies here

## Note Quality Guidelines

- **Be specific**: Include code examples and file paths
- **Be actionable**: Focus on what future developers should know
- **Be concise**: Aim for 1-3 paragraphs per note
- **Include context**: Explain why, not just what
- **Link to related code**: Use `[filename.ts](path/to/file.ts)` format

## Example Note Structure

```markdown
## Component State Management Pattern

When creating new React components that need shared state, use the custom `useSharedState` hook located in `src/hooks/useSharedState.ts` instead of prop drilling.

**Why**: Reduces component coupling and makes state updates more predictable.

**Example**: See `src/components/UserProfile.tsx` for proper implementation.

**Tags**: react, pattern, state-management
```
