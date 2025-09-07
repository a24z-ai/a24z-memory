/**
 * Guidance generation utilities
 */

import { RepositoryConfiguration } from '../types';

export interface GuidanceContent {
  guidance: string;
  configuration: {
    allowedTags: string[];
    tagDescriptions: Record<string, string>;
  };
}

/**
 * Default guidance content when no custom guidance exists
 */
const DEFAULT_GUIDANCE = `# Note Creation Guidelines

## What Makes a Good Note
- **Be Specific**: Focus on concrete implementation details, decisions, or gotchas
- **Add Context**: Explain why something is done a certain way, not just what
- **Include Examples**: Code snippets or commands when relevant
- **Think Future**: Write for someone (including future you) who has no context

## Recommended Tags
- **architecture**: System design decisions and patterns
- **bug-fix**: Solutions to specific bugs and their root causes
- **performance**: Optimization techniques and bottlenecks
- **security**: Security considerations and implementations
- **testing**: Test strategies and edge cases
- **gotcha**: Non-obvious issues and their solutions`;

/**
 * Generate full guidance content including configuration
 */
export function generateFullGuidanceContent(
  guidance: string | null,
  configuration: RepositoryConfiguration,
  tagDescriptions: Record<string, string> = {}
): GuidanceContent {
  const result: GuidanceContent = {
    guidance: guidance || DEFAULT_GUIDANCE,
    configuration: {
      allowedTags: Object.keys(tagDescriptions),
      tagDescriptions: tagDescriptions,
    },
  };

  return result;
}
