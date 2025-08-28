#!/usr/bin/env bun

/**
 * Example: Using OpenRouter with a24z-memory library
 *
 * This example shows how to configure and use OpenRouter for AI-enhanced
 * knowledge synthesis with secure API key storage.
 *
 * Requirements: Bun runtime for secure key storage
 * Run with: bun run library-openrouter.js
 */

import { ApiKeyManager, LLMService, AskA24zMemoryTool, saveNote } from 'a24z-memory';
import readline from 'readline';

// Helper to get user input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🚀 a24z-Memory OpenRouter Configuration Example\n');

  // Check for Bun runtime
  if (!ApiKeyManager.isBunSecretsAvailable()) {
    console.error('❌ This example requires Bun runtime for secure API key storage.');
    console.log('\n📦 Install Bun:');
    console.log('   curl -fsSL https://bun.sh/install | bash');
    console.log('\n🚀 Then run:');
    console.log('   bun run library-openrouter.js\n');
    process.exit(1);
  }

  // Check if OpenRouter is already configured
  const existingConfig = await ApiKeyManager.getApiKey('openrouter');

  if (existingConfig) {
    console.log('✅ OpenRouter is already configured');
    console.log(`   Model: ${existingConfig.model || 'default'}`);
    console.log(`   Site: ${existingConfig.siteName || 'not set'}\n`);

    const reconfigure = await prompt('Reconfigure? (y/n): ');
    if (reconfigure.toLowerCase() !== 'y') {
      return demonstrateUsage();
    }
  }

  // Configure OpenRouter
  console.log('\n📝 OpenRouter Configuration');
  console.log('Get your API key from: https://openrouter.ai/\n');

  const apiKey = await prompt('Enter your OpenRouter API key: ');

  if (!apiKey) {
    console.log('❌ API key is required');
    return;
  }

  console.log('\nAvailable models:');
  console.log('1. meta-llama/llama-3.2-3b-instruct (Fast, default)');
  console.log('2. anthropic/claude-3.5-sonnet (High quality)');
  console.log('3. openai/gpt-4o (GPT-4)');
  console.log('4. google/gemini-flash-1.5 (Very fast)');
  console.log('5. deepseek/deepseek-coder (Code-focused)');

  const modelChoice = await prompt('\nSelect model (1-5, or press Enter for default): ');

  const models = {
    1: 'meta-llama/llama-3.2-3b-instruct',
    2: 'anthropic/claude-3.5-sonnet',
    3: 'openai/gpt-4o',
    4: 'google/gemini-flash-1.5',
    5: 'deepseek/deepseek-coder',
  };

  const model = models[modelChoice] || 'meta-llama/llama-3.2-3b-instruct';

  // Optional site configuration (recommended for better rate limits)
  const siteName = await prompt('Your app/site name (optional): ');
  const siteUrl = await prompt('Your app/site URL (optional): ');

  // Store the configuration securely
  console.log('\n💾 Storing configuration securely...');

  await ApiKeyManager.storeApiKey('openrouter', {
    apiKey,
    model,
    siteName: siteName || undefined,
    siteUrl: siteUrl || undefined,
  });

  console.log('✅ OpenRouter configured successfully!\n');

  // Test the configuration
  await demonstrateUsage();
}

async function demonstrateUsage() {
  console.log('\n🧪 Testing OpenRouter Integration\n');

  // First, let's add a sample note
  const repoPath = process.cwd();
  console.log(`Working in: ${repoPath}\n`);

  // Save a sample note
  await saveNote({
    note: `OpenRouter Integration Pattern:
    
When using OpenRouter with a24z-memory:
1. API keys are stored securely using OS keychain (Bun) or encrypted files (Node)
2. The system automatically loads the key when needed
3. Models can be changed without updating code
4. Site URL/name improve rate limiting

Best practice: Always use ApiKeyManager for key storage, never hardcode keys.`,
    directoryPath: repoPath,
    anchors: ['docs/OPENROUTER_INTEGRATION.md'],
    tags: ['openrouter', 'api-keys', 'security', 'pattern'],
    type: 'pattern',
  });

  console.log('📝 Added a sample note about OpenRouter patterns\n');

  // Now test the AskA24zMemory functionality with OpenRouter
  const tool = new AskA24zMemoryTool();

  console.log('🤖 Testing AI-enhanced synthesis with OpenRouter...\n');

  const response = await tool.execute({
    query: 'How should I manage API keys when using OpenRouter?',
    filePath: repoPath,
    taskContext: 'Setting up OpenRouter integration',
  });

  console.log(response.content);

  // Show which provider was used
  const config = await LLMService.loadConfig();
  if (config && config.provider === 'openrouter') {
    console.log(`\n✨ Response enhanced by: ${config.model || 'default model'}`);
  }

  // List all configured providers
  console.log('\n📋 Currently configured LLM providers:');
  const providers = await ApiKeyManager.listStoredProviders();
  providers.forEach((p) => console.log(`   - ${p}`));

  console.log('\n💡 Tips:');
  console.log('- API keys are stored securely in OS keychain');
  console.log('- Keys persist across sessions');
  console.log('- You can switch models by reconfiguring');
  console.log('- Check usage at: https://openrouter.ai/activity');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
