# Rule Implementation Checklist

This checklist guides you through implementing a new rule in Alexandria's rule system. Copy this checklist when creating a new rule and check off items as you complete them.

## Pre-Implementation Planning

- [ ] **Define Rule Purpose**
  - What problem does this rule solve?
  - What impact does it have on documentation quality?
  - Is it enforceable programmatically?

- [ ] **Determine Rule Category**
  - `critical` - Breaks functionality
  - `quality` - Affects documentation quality
  - `performance` - Impacts processing speed
  - `structure` - Relates to organization

- [ ] **Choose Default Severity**
  - `error` - Must be fixed (blocks commits)
  - `warning` - Should be fixed
  - `info` - Nice to fix

- [ ] **Design Configuration Options**
  - What should be configurable?
  - What are sensible defaults?
  - Consider different use cases

## Implementation Steps

### 1. Define Options Interface

**File:** `src/config/types.ts`

- [ ] Create interface for rule options (e.g., `FilenameConventionOptions`)
- [ ] Add interface to `RuleOptions` union type
- [ ] Include JSDoc comments for each option

Example:
```typescript
export interface YourRuleOptions {
  /** Description of option */
  optionName?: string;
  /** Another option description */
  anotherOption?: boolean;
}

// Add to union type:
export type RuleOptions =
  | DocumentOrganizationOptions
  | StaleReferencesOptions
  | RequireReferencesOptions
  | YourRuleOptions  // Add here
  | Record<string, string | number | boolean | string[]>;
```

### 2. Create Rule Implementation

**File:** `src/rules/rules/your-rule-name.ts`

- [ ] Import required types and utilities
- [ ] Define default constants
- [ ] Implement `LibraryRule` interface with all required properties:
  - [ ] `id` - Unique identifier (kebab-case)
  - [ ] `name` - Human-readable name
  - [ ] `severity` - Default severity level
  - [ ] `category` - Rule category
  - [ ] `description` - Brief description
  - [ ] `impact` - Impact statement
  - [ ] `fixable` - Boolean for auto-fix capability
  - [ ] `enabled` - Default enabled state
  - [ ] `options` - Default options object
  - [ ] `check()` - Main validation logic
  - [ ] `fix()` - Auto-fix implementation (if fixable)

Template:
```typescript
import { LibraryRule, LibraryRuleViolation, LibraryRuleContext } from '../types';
import { YourRuleOptions } from '../../config/types';

const DEFAULT_OPTIONS: YourRuleOptions = {
  // defaults
};

export const yourRuleName: LibraryRule = {
  id: 'your-rule-name',
  name: 'Your Rule Name',
  severity: 'warning',
  category: 'structure',
  description: 'Brief description',
  impact: 'Impact statement',
  fixable: false,
  enabled: true,
  options: DEFAULT_OPTIONS,

  async check(context: LibraryRuleContext): Promise<LibraryRuleViolation[]> {
    const violations: LibraryRuleViolation[] = [];
    // Implementation
    return violations;
  },

  async fix(violation: LibraryRuleViolation, context: LibraryRuleContext): Promise<void> {
    // Only if fixable: true
  }
};
```

### 3. Register Rule in Engine

**File:** `src/rules/engine.ts`

- [ ] Import the new rule
- [ ] Add registration in constructor

Example:
```typescript
import { yourRuleName } from './rules/your-rule-name';

// In constructor:
this.registerRule(yourRuleName);
```

### 4. Write Tests

**File:** `tests/rules/your-rule-name.test.ts`

- [ ] Test valid cases (no violations)
- [ ] Test violation cases
- [ ] Test each configuration option
- [ ] Test edge cases
- [ ] Test auto-fix functionality (if applicable)
- [ ] Test with different file structures

Test structure:
```typescript
describe('your-rule-name', () => {
  it('should not report violations for valid files', async () => {
    // Test implementation
  });

  it('should report violations for invalid files', async () => {
    // Test implementation
  });

  it('should respect configuration options', async () => {
    // Test implementation
  });

  if (fixable) {
    it('should fix violations when auto-fix is enabled', async () => {
      // Test implementation
    });
  }
});
```

### 5. Update Documentation

**File:** `docs/RULES.md`

- [ ] Add rule section with:
  - [ ] Rule name and ID
  - [ ] Purpose description
  - [ ] Default severity
  - [ ] "How it works" explanation
  - [ ] Configuration options table
  - [ ] Impact statement
  - [ ] Example violations
  - [ ] "How to Fix" section
  - [ ] Configuration examples

Template:
```markdown
### `your-rule-name`

**Purpose:** Brief purpose description

**Default Severity:** `warning`

**How it works:**
- Step-by-step explanation
- Of how the rule validates

**Configuration Options:**
- `optionName`: Description (default: value)
- `anotherOption`: Description (default: value)

**Impact:** Impact statement

**Example Violation:**
\```
path/to/file.md
    ⚠ Violation message
      rule: your-rule-name
\```

**How to Fix:**
- Instructions for fixing violations
- Multiple steps if needed

**Configuration Example:**
\```json
{
  "id": "your-rule-name",
  "severity": "error",
  "options": {
    "optionName": "value"
  }
}
\```
```

### 6. Update Schema (Optional)

**File:** `schema/alexandriarc.json` (if exists)

- [ ] Add rule configuration to JSON schema
- [ ] Include option definitions
- [ ] Add validation constraints

## Testing Checklist

### Manual Testing

- [ ] Run `alexandria lint` with rule enabled
- [ ] Test with different configurations
- [ ] Verify error messages are clear
- [ ] Test auto-fix if applicable
- [ ] Check performance with large repositories

### Integration Testing

- [ ] Verify rule works with other rules
- [ ] Test with `--enable` and `--disable` flags
- [ ] Test JSON output format
- [ ] Test quiet mode behavior
- [ ] Test errors-only mode

## Documentation Review

- [ ] Rule purpose is clear
- [ ] Configuration options are well-documented
- [ ] Examples are practical and helpful
- [ ] Fix instructions are actionable
- [ ] Impact statement explains importance

## Code Review Checklist

- [ ] Code follows existing patterns
- [ ] Error handling is robust
- [ ] Performance is acceptable
- [ ] Options are properly validated
- [ ] Default values are sensible
- [ ] Code is well-commented where needed

## Final Steps

- [ ] Run all tests: `npm test`
- [ ] Run linting: `npm run lint`
- [ ] Run type checking: `npm run typecheck`
- [ ] Update CHANGELOG if needed
- [ ] Create PR with clear description

## Common Pitfalls to Avoid

1. **Not handling edge cases** - Empty files, special characters, deeply nested structures
2. **Poor performance** - Avoid scanning files multiple times
3. **Unclear messages** - Ensure violation messages clearly explain the problem
4. **Missing null checks** - Always validate options and context
5. **Hardcoded values** - Use configuration options instead
6. **Ignoring gitignore** - Respect project's ignore patterns
7. **Not testing thoroughly** - Test with real-world scenarios

## Example Rules for Reference

Study these existing rules for patterns and best practices:

- `document-organization` - File location validation
- `require-references` - Relationship validation
- `orphaned-references` - Reference integrity
- `stale-references` - Temporal validation

## Questions to Answer

Before considering your rule complete, ensure you can answer:

1. What specific problem does this rule solve?
2. How does it improve documentation quality?
3. Is the default configuration suitable for most projects?
4. Are the violation messages helpful and actionable?
5. Does the rule perform well on large repositories?
6. Is the auto-fix safe and predictable (if applicable)?
7. Will this rule integrate well with existing workflows?