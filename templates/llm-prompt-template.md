# Custom LLM Prompt Template Example

This file shows how to create a custom prompt template for the Ollama integration.

## Available Variables

- `{{query}}` - The user's question
- `{{filePath}}` - The file/directory being queried
- `{{taskContext}}` - Additional context (if provided)
- `{{noteCount}}` - Number of notes found
- `{{notes}}` - The formatted notes section

## Example Custom Template

Save this in `.a24z/llm-prompt-template.txt`:

```
You are an experienced developer familiar with this codebase.

USER QUESTION: {{query}}
CURRENT FILE: {{filePath}}
CONTEXT: {{taskContext}}

I found {{noteCount}} relevant notes from our knowledge base:

{{notes}}

Based on these notes, provide:
1. A direct answer to the question
2. Any warnings or gotchas to be aware of
3. Reference specific Note numbers when citing information

Keep your response concise and practical.
```

## Configuration

Reference your template in `.a24z/llm-config.json`:

```json
{
  "provider": "ollama",
  "model": "codellama:13b",
  "promptTemplate": "{{TEMPLATE_CONTENT_HERE}}",
  "includeSourceNotes": true
}
```

Or load from file programmatically:

```javascript
const fs = require('fs');
const template = fs.readFileSync('.a24z/llm-prompt-template.txt', 'utf8');

const config = {
  provider: 'ollama',
  model: 'codellama:13b',
  promptTemplate: template,
  includeSourceNotes: true,
};
```

## Domain-Specific Templates

### For Security-Focused Repositories

```
You are a security engineer reviewing code for vulnerabilities.

Question: {{query}}
File under review: {{filePath}}

Security-relevant notes from our knowledge base:
{{notes}}

Analyze the question with a security mindset:
1. Identify any security implications
2. Reference specific vulnerabilities from the notes (cite Note numbers)
3. Suggest secure coding practices
4. Flag any potential risks

Be paranoid but practical.
```

### For Performance-Critical Code

```
You are a performance engineer optimizing hot paths.

Query: {{query}}
Performance-critical path: {{filePath}}

Performance notes and benchmarks:
{{notes}}

Provide performance-focused guidance:
1. Answer the question with performance in mind
2. Cite specific benchmarks or measurements from notes (use Note numbers)
3. Suggest optimization opportunities
4. Warn about performance pitfalls

Focus on measurable improvements.
```

### For API Documentation

```
You are creating developer-friendly API documentation.

Question: {{query}}
API endpoint or module: {{filePath}}

Existing documentation and patterns:
{{notes}}

Provide clear API guidance:
1. Answer in a documentation style
2. Include code examples where relevant
3. Reference existing patterns from notes (cite Note numbers)
4. Highlight breaking changes or deprecations

Write as if for public documentation.
```

## Tips for Custom Templates

1. **Be specific about output format** - Tell the LLM exactly how to structure responses
2. **Emphasize note citations** - Always ask for Note number references for traceability
3. **Set the right tone** - Match your team's communication style
4. **Include domain context** - Add specific terminology or conventions
5. **Control length** - Be explicit about conciseness vs detail

## Testing Your Template

Test your template with different scenarios:

```bash
# Test with a simple query
askA24zMemory "How does this work?" /src/auth.ts

# Test with complex context
askA24zMemory "How do I refactor this?" /src/api/handlers.ts \
  --task-context "Migrating to TypeScript"

# Test with filters
askA24zMemory "What are the gotchas?" /src/database.ts \
  --filter-types gotcha,pattern
```
