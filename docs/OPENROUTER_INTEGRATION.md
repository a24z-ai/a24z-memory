# OpenRouter Integration for Enhanced Note Synthesis

The a24z-memory system now supports OpenRouter, enabling access to hundreds of AI models through a single API. This provides more flexibility than Ollama while maintaining the same secure, grounded approach to knowledge synthesis.

## 🚀 New in 2025: MCP Server-Side Configuration

The MCP server now handles LLM configuration automatically on startup and provides an interactive configuration tool. **API keys are stored securely in the OS keychain and persist across server restarts.**

## Features

- **Access to 100+ Models**: Use models from OpenAI, Anthropic, Google, Meta, and more
- **Secure API Key Storage**: Uses Bun.secrets or encrypted local storage
- **Automatic Fallback**: Gracefully falls back to local synthesis if unavailable
- **Cost-Effective**: OpenRouter automatically selects the most cost-effective model

## Provider Selection and Control

### Default Provider Setting

The `defaultProvider` field in `.a24z/llm-config.json` controls which LLM provider is used:

```json
{
  "defaultProvider": "openrouter",  // Use OpenRouter
  "model": "meta-llama/llama-3.2-3b-instruct"
}
```

**Special Values:**
- `"none"` - Disables all LLM features (uses local synthesis only)
- `"<provider-name>"` - Uses the specified provider
- Not specified - No provider is active (explicit configuration required)

### Disabling LLM Features

To completely disable LLM features:

```json
// Via config file
{
  "defaultProvider": "none"
}

// Via MCP tool
{
  "action": "set-default",
  "provider": "none"
}
```

When disabled, the system uses local synthesis only.

## Configuration Methods

### Method 1: MCP Server Configuration Tool (Recommended) 

The easiest way is to use the built-in `configure_llm` tool through your MCP client (Claude Desktop, etc.):

```json
// List available providers
{
  "action": "list"
}

// Check current status
{
  "action": "status"
}

// Configure OpenRouter
{
  "action": "configure", 
  "provider": "openrouter",
  "apiKey": "sk-or-v1-...",
  "model": "meta-llama/llama-3.2-3b-instruct",
  "siteName": "My Application",
  "siteUrl": "https://myapp.com"
}

// Set as default provider
{
  "action": "set-default",
  "provider": "openrouter"
}

// Test the configuration
{
  "action": "test",
  "provider": "openrouter" 
}

// Disable LLM features
{
  "action": "set-default",
  "provider": "none"
}
```

**Benefits:**
- ✅ **Secure setup** - API keys are stored securely and persist across server restarts
- ✅ **No manual file editing** - Everything configured through Claude interface
- ✅ **Built-in testing** - Verify your configuration works immediately
- ✅ **Secure storage** - API keys stored in OS keychain via Bun.secrets

### Method 2: Repository Configuration File

Create `.a24z/llm-config.json` in your repository:

```json
{
  "defaultProvider": "openrouter",  // Explicitly set provider
  "model": "meta-llama/llama-3.2-3b-instruct", 
  "temperature": 0.3,
  "maxTokens": 1000,
  "timeout": 30000
}
```

**Note:** The `defaultProvider` field explicitly sets which provider to use. Use `"none"` to disable LLM features.

Then use the `configure_llm` tool to add the API key.

### Method 3: Library API (Advanced)

```javascript
import { ApiKeyManager, LLMService } from 'a24z-memory';

// Requires Bun runtime
if (!ApiKeyManager.isBunSecretsAvailable()) {
  throw new Error('Bun runtime required for OpenRouter integration');
}

// Store API key securely in OS keychain
await ApiKeyManager.storeApiKey('openrouter', {
  apiKey: 'sk-or-v1-...',
  model: 'meta-llama/llama-3.2-3b-instruct',
  siteUrl: 'https://your-app.com',
  siteName: 'Your App Name'
});
```

## Secure API Key Storage

### Requirements

**Bun runtime is required** for secure API key storage. API keys are stored in the OS keychain:
- **macOS**: Keychain Services
- **Linux**: GNOME Keyring / KWallet  
- **Windows**: Windows Credential Manager

There is no fallback storage mechanism. If Bun is not available, the OpenRouter integration cannot be used.

## Managing LLM Providers

### Through MCP Tools (Recommended)

```json
// List all available providers and their capabilities
{
  "action": "list"
}

// Configure OpenRouter with API key
{
  "action": "configure",
  "provider": "openrouter",
  "apiKey": "sk-or-v1-...",
  "model": "anthropic/claude-3.5-sonnet",
  "siteName": "My App",
  "temperature": 0.7
}

// Configure Ollama (no API key needed)
{
  "action": "configure",
  "provider": "ollama",
  "model": "llama3.2:3b",
  "endpoint": "http://localhost:11434"
}

// Test any provider
{
  "action": "test",
  "provider": "openrouter"
}

// Remove configuration
{
  "action": "remove",
  "provider": "openrouter"
}
```

### Programmatically (Advanced)

```javascript
import { ApiKeyManager, McpLLMConfigurator, SUPPORTED_PROVIDERS } from 'a24z-memory';

// Check available providers
console.log(SUPPORTED_PROVIDERS.map(p => p.name));
// ['ollama', 'openrouter', 'openai']

// Configure with secure key storage (requires Bun)
if (ApiKeyManager.isBunSecretsAvailable()) {
  await ApiKeyManager.storeApiKey('openrouter', {
    apiKey: 'sk-or-v1-...',
    model: 'meta-llama/llama-3.2-3b-instruct'
  });
}

// List configured providers
const providers = await ApiKeyManager.listStoredProviders();
console.log('Configured:', providers);

// Set a default provider in config
const config = {
  defaultProvider: 'openrouter',
  model: 'meta-llama/llama-3.2-3b-instruct'
};
// Write to .a24z/llm-config.json
```

## Available Models

Popular models available through OpenRouter:

### Fast & Economical
- `meta-llama/llama-3.2-3b-instruct` - Fast, good for code (default)
- `google/gemini-flash-1.5` - Very fast, multimodal
- `mistralai/mistral-7b-instruct` - Balanced performance

### High Quality
- `anthropic/claude-3.5-sonnet` - Excellent for complex reasoning
- `openai/gpt-4o` - Strong general purpose
- `google/gemini-pro-1.5` - Good for long context

### Specialized for Code
- `deepseek/deepseek-coder` - Optimized for programming
- `phind/phind-codellama-34b` - Code-focused
- `codellama/codellama-70b-instruct` - Large code model

## Getting Started

### Quick Setup (5 minutes)

1. **Install Bun** (required for secure key storage):
   ```bash
   # macOS/Linux
   curl -fsSL https://bun.sh/install | bash
   
   # Windows
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

2. **Start the MCP server** with Bun:
   ```bash
   bun run a24z-memory
   ```
   
   You'll see:
   ```
   ✅ a24z Memory MCP server started successfully
   🧠 Initializing AI-enhanced synthesis...
   ⚠️  Interactive configuration not yet implemented.
      Please configure using one of these methods:
   ```

3. **Get an OpenRouter API Key**: 
   - Sign up at [OpenRouter.ai](https://openrouter.ai/) 
   - Create an API key

4. **Configure through Claude**:
   Use the `configure_llm` tool in Claude Desktop:
   ```json
   {
     "action": "configure",
     "provider": "openrouter", 
     "apiKey": "sk-or-v1-your-key-here",
     "model": "meta-llama/llama-3.2-3b-instruct"
   }
   ```

5. **Done!** Your API key is now stored securely. The next time you restart the MCP server, it will automatically load your configuration:
   ```
   ✅ LLM configured: openrouter (meta-llama/llama-3.2-3b-instruct)
      AI-enhanced note synthesis enabled
   ```

## VSCode Extension Integration

The VSCode extension should check for Bun runtime and guide users:

```javascript
// In your VSCode extension
import { ApiKeyManager } from 'a24z-memory';

// Show configuration UI
async function configureOpenRouter() {
  // Check for Bun runtime
  if (!ApiKeyManager.isBunSecretsAvailable()) {
    const result = await vscode.window.showErrorMessage(
      'OpenRouter configuration requires Bun runtime for secure key storage.',
      'Install Bun'
    );
    
    if (result === 'Install Bun') {
      vscode.env.openExternal(vscode.Uri.parse('https://bun.sh'));
    }
    return;
  }
  
  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your OpenRouter API key',
    password: true,
    placeHolder: 'sk-or-v1-...'
  });
  
  if (apiKey) {
    const model = await vscode.window.showQuickPick([
      'meta-llama/llama-3.2-3b-instruct',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'google/gemini-flash-1.5'
    ], {
      placeHolder: 'Select a model'
    });
    
    await ApiKeyManager.storeApiKey('openrouter', {
      apiKey,
      model,
      siteUrl: 'vscode://a24z-memory',
      siteName: 'a24z-Memory VSCode'
    });
    
    vscode.window.showInformationMessage('OpenRouter configured successfully!');
  }
}

// Check if configured
async function isOpenRouterConfigured() {
  const stored = await ApiKeyManager.getApiKey('openrouter');
  return stored !== null;
}
```

## Example Response with OpenRouter

```
🤖 AI-Enhanced Synthesis (via openrouter:meta-llama/llama-3.2-3b-instruct)

Based on your repository's documented patterns, authentication is implemented using a JWT-based system with several key considerations:

**Core Implementation** (Note 1): Your authentication system uses JWT tokens with automatic refresh rotation. Access tokens expire in 30 minutes while refresh tokens last 7 days. The implementation in `src/auth/jwt.ts` includes proper signature validation and token blacklisting.

**Critical Race Condition** (Note 2): There's a documented issue when multiple browser tabs attempt token refresh simultaneously. The solution implemented in `src/auth/refresh.ts` uses a localStorage-based mutex to prevent concurrent refresh attempts.

**Security Considerations** (Note 3): Always validate tokens server-side. The team chose JWT over session-based auth for better microservice scalability, as documented in your architecture decisions.

The typical flow: validate credentials → generate token pair → store refresh token as httpOnly cookie → return access token to client.

---

📚 Source Notes Referenced:
[Note 1] note-1734567890123-abc123def
[Note 2] note-1734567890124-def456ghi  
[Note 3] note-1734567890125-ghi789jkl
```

## Cost Management

OpenRouter provides transparent pricing:

- Track usage: `GET https://openrouter.ai/api/v1/auth/key`
- Set credit limits when creating API keys
- Monitor costs in the OpenRouter dashboard

## Privacy & Security

- **API Key Security**: Never commit API keys to version control
- **Secure Storage**: Keys are stored in OS keychains via Bun.secrets (no plaintext files)
- **Runtime Requirement**: Bun required for secure key management operations
- **No Training**: Your notes are never used to train models
- **Request Timeout**: Default 30-second timeout for all requests

## Troubleshooting

### "API key not found"
```javascript
// Check if key is stored
const stored = await ApiKeyManager.getApiKey('openrouter');
console.log('Key stored:', stored !== null);
```

### "Model not available"
Some models require specific access. Check available models at [openrouter.ai/models](https://openrouter.ai/models)

### Rate Limiting
OpenRouter has generous rate limits. If you hit them:
- Check your usage: `GET https://openrouter.ai/api/v1/auth/key`
- Consider upgrading your account
- Use a smaller/faster model

## Comparison with Ollama

| Feature | Ollama | OpenRouter |
|---------|--------|------------|
| Setup | Install locally | API key only |
| Models | Download individually | 100+ available instantly |
| Privacy | Fully local | API-based |
| Cost | Free (local compute) | Pay per token |
| Speed | Depends on hardware | Consistent, fast |
| Offline | Yes | No |

Choose **Ollama** for complete privacy and offline use.
Choose **OpenRouter** for model variety and zero setup.