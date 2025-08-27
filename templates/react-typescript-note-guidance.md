# React TypeScript Project Note Guidelines

## Preferred Note Types

### 🏗️ Architecture Decisions

- Document component architecture choices (hooks vs classes, state management)
- Type system decisions (strict vs permissive, utility types used)
- Build and bundling choices (Webpack, Vite, etc.)
- **Tags**: `architecture`, `decision`, `react`, `typescript`

### 🔧 React Patterns

- Document custom hook patterns and when to use them
- Component composition strategies
- State management patterns (Context, Redux, Zustand)
- **Tags**: `pattern`, `react`, `hooks`, `state-management`

### 📝 TypeScript Insights

- Complex type definitions and their reasoning
- Generic patterns used across the codebase
- Integration with React (component props, refs, etc.)
- **Tags**: `typescript`, `pattern`, `types`

### 🐛 Common Gotchas

- React rendering issues and solutions
- TypeScript compiler quirks and workarounds
- Integration issues between React and TypeScript
- **Tags**: `gotcha`, `react`, `typescript`

### ⚡ Performance Optimizations

- React performance patterns (useMemo, useCallback, React.memo)
- Bundle size optimizations
- Render optimization strategies
- **Tags**: `performance`, `react`, `optimization`

## Preferred Tags

### React Specific

- `react`, `hooks`, `components`, `jsx`
- `state-management`, `context`, `props`
- `lifecycle`, `effects`, `memo`

### TypeScript Specific

- `typescript`, `types`, `interfaces`, `generics`
- `utility-types`, `type-guards`, `enums`

### Testing & Quality

- `testing`, `jest`, `react-testing-library`
- `storybook`, `cypress`, `e2e`

### Build & Tooling

- `webpack`, `vite`, `babel`, `eslint`
- `bundling`, `optimization`, `hot-reload`

## React TypeScript Specific Guidelines

### Component Notes

```markdown
## Custom Hook Pattern: useApiData

Located in `src/hooks/useApiData.ts` - provides consistent error handling and loading states for API calls.

**Usage**: `const { data, loading, error } = useApiData('/api/users')`

**Why**: Eliminates boilerplate and ensures consistent error handling across components.

**Type Safety**: Supports generic return types - `useApiData<User[]>('/api/users')`
```

### Type Definition Notes

```markdown
## Utility Type: ComponentProps

Defined in `src/types/utils.ts` - extracts props from existing components for composition.

**Example**: `type ButtonProps = ComponentProps<typeof Button> & { variant: 'primary' | 'secondary' }`

**Benefits**: Maintains type safety when extending component interfaces.
```

## Note Quality Guidelines

- **Include TypeScript snippets**: Show type definitions and usage
- **Reference component files**: Link to actual React components
- **Explain type reasoning**: Why specific types were chosen
- **Show before/after**: Especially for refactoring notes
- **Link related patterns**: Connect hooks, components, and types
