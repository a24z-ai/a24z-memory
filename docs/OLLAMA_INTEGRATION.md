# Ollama Integration for Enhanced Note Synthesis

The a24z-memory system can optionally use Ollama (or other LLMs) to provide AI-enhanced synthesis of your repository notes. When configured, the system will use the LLM to provide more intelligent, context-aware responses while still grounding everything in your actual documented knowledge.

## How It Works

1. **Graceful Enhancement**: If Ollama is configured and available, responses are enhanced with AI synthesis
2. **Automatic Fallback**: If Ollama is unavailable or not configured, the system uses local synthesis
3. **Always Grounded**: The LLM only synthesizes from your actual notes - it doesn't make things up

## Configuration Methods

### Method 1: Repository Configuration (Recommended)

Create `.a24z/llm-config.json` in your repository:

```json
{
  "provider": "ollama",
  "endpoint": "http://localhost:11434",
  "model": "codellama:13b",
  "temperature": 0.3,
  "maxTokens": 1000,
  "timeout": 30000,
  "includeFileContents": false,  // Set to true to include actual code in prompts
  "fileContentBudget": 2000      // Max tokens to use for file contents
}
```

#### Including File Contents

When `includeFileContents` is enabled, the system will:
1. Read the actual files referenced in note anchors
2. Include relevant code snippets in the LLM prompt
3. Provide better context for more accurate synthesis

**Pros of including files:**
- More accurate, code-aware responses
- Better understanding of actual implementation
- Can reference specific code patterns

**Cons of including files:**
- Larger prompts (more tokens/cost)
- Slower response times
- May hit context limits with large files

**Recommended settings by model size:**
```json
// For smaller models (7B)
{
  "includeFileContents": false,
  "maxTokens": 500
}

// For medium models (13B)
{
  "includeFileContents": true,
  "fileContentBudget": 1000,
  "maxTokens": 1000
}

// For large models (70B+)
{
  "includeFileContents": true,
  "fileContentBudget": 3000,
  "maxTokens": 2000
}
```

### Method 2: Environment Variables

```bash
export A24Z_LLM_PROVIDER=ollama
export A24Z_LLM_ENDPOINT=http://localhost:11434
export A24Z_LLM_MODEL=codellama:13b
export A24Z_LLM_TEMPERATURE=0.3
export A24Z_LLM_MAX_TOKENS=1000
export A24Z_LLM_TIMEOUT=30000
```

### Method 3: Disable LLM

To explicitly disable LLM integration:

```json
{
  "provider": "none"
}
```

Or via environment:
```bash
export A24Z_LLM_PROVIDER=none
```

## Custom Prompt Templates

You can customize how the LLM is prompted to match your team's needs:

```json
{
  "provider": "ollama",
  "model": "codellama:13b",
  "promptTemplate": "You are a {{role}}.\n\nQuestion: {{query}}\nFile: {{filePath}}\n\nRelevant notes:\n{{notes}}\n\nProvide a concise answer with note citations.",
  "includeSourceNotes": true
}
```

See [templates/llm-prompt-template.md](../templates/llm-prompt-template.md) for detailed examples.

## Available Models

Recommended Ollama models for code synthesis:
- `codellama:13b` - Best for code understanding
- `mistral:7b` - Good general purpose, faster
- `llama2:13b` - Good for explanations
- `deepseek-coder:6.7b` - Specialized for code

## Example Setup

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Pull a model**:
   ```bash
   ollama pull codellama:13b
   ```

3. **Start Ollama** (if not already running):
   ```bash
   ollama serve
   ```

4. **Configure a24z-memory**:
   ```bash
   echo '{
     "provider": "ollama",
     "model": "codellama:13b",
     "temperature": 0.3
   }' > .a24z/llm-config.json
   ```

## How Responses Differ

### Without LLM (Local Synthesis)
```
🎯 Context-aware guidance for: /src/auth/login.ts
❓ Your question: How does authentication work?

📚 Found 3 related notes (showing top 3):

1. PATTERN [high confidence]
   Use JWT tokens with refresh token rotation...

2. GOTCHA [medium confidence]  
   Session timeout is 30 minutes but refresh...

3. DECISION [high confidence]
   We chose JWT over sessions because...
```

### With LLM (Enhanced Synthesis)
```
🤖 AI-Enhanced Synthesis (via ollama:codellama)

Based on the documented patterns in your codebase, authentication works through a JWT-based system with the following key aspects:

1. **Token Management** (Note 1): The system uses JWT tokens with automatic refresh token rotation. When a user logs in, they receive both an access token (30-minute expiry) and a refresh token (7-day expiry).

2. **Critical Gotcha** (Note 2): There's a known race condition when multiple tabs attempt to refresh simultaneously. The documented solution is to implement a mutex lock using localStorage.

3. **Best Practice** (Note 3): Always validate tokens server-side and never trust client-side validation alone. The team decided on JWT over sessions for better scalability with microservices.

The login flow follows: validate credentials → generate token pair → store refresh token in httpOnly cookie → return access token to client.

---

📚 Source Notes Referenced:

[Note 1] `note-1234567-abc`
📁 Anchored to: `src/auth/jwt.ts`, `src/middleware/auth.ts`
🏷️ Tags: authentication, jwt, security | Type: pattern | Confidence: high
💡 Use JWT tokens with refresh token rotation. Access tokens expire in 30 minutes, refresh tokens in 7 days...

[Note 2] `note-2345678-def`
📁 Anchored to: `src/auth/refresh.ts`
🏷️ Tags: authentication, gotcha, race-condition | Type: gotcha | Confidence: medium
💡 Multiple browser tabs can cause race conditions during token refresh. Implement mutex with localStorage...

[Note 3] `note-3456789-ghi`
📁 Anchored to: `docs/decisions/auth.md`
🏷️ Tags: authentication, architecture, decision | Type: decision | Confidence: high
💡 Chose JWT over session-based auth for better microservice scalability...
```

## Privacy & Security

- **Local by default**: Ollama runs on your machine - no data leaves your system
- **No training**: Your notes are never used to train any models
- **Configurable timeout**: Requests timeout after 30 seconds by default
- **Graceful degradation**: System works perfectly without any LLM

## Troubleshooting

### Check if Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

### Test the integration:
```bash
# With Ollama running
askA24zMemory "How does authentication work?" /path/to/your/code

# Should show "AI-Enhanced Synthesis" if working
```

### Common Issues:

1. **"Connection refused"**: Ollama isn't running. Start it with `ollama serve`
2. **Slow responses**: Try a smaller model like `mistral:7b`
3. **Out of memory**: Reduce `maxTokens` in config or use a smaller model
4. **Wrong answers**: The LLM only knows what's in your notes - add more documentation!

## Advanced Configuration

### Custom Endpoints

Use a remote Ollama instance:
```json
{
  "provider": "ollama",
  "endpoint": "https://ollama.company.internal:11434",
  "model": "codellama:13b"
}
```

### Fine-tuning Response Style

Adjust temperature for different styles:
- `0.1` - Very focused, deterministic
- `0.3` - Balanced (default)
- `0.7` - More creative, varied responses

### Performance Tuning

```json
{
  "provider": "ollama",
  "model": "codellama:7b",  // Smaller = faster
  "maxTokens": 500,         // Limit response length
  "timeout": 10000          // Fail fast if slow
}
```