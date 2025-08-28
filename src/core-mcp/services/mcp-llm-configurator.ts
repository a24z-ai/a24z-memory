/**
 * MCP LLM Configurator
 * Handles LLM provider configuration with user prompts for API keys
 */

import { ApiKeyManager, type StoredApiKey } from './api-key-manager';
import type { LLMConfig } from './llm-service';

export interface LLMProviderConfig {
  name: string;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  defaultModel?: string;
  supportedModels?: string[];
  additionalFields?: Array<{
    key: keyof StoredApiKey;
    displayName: string;
    description?: string;
    optional?: boolean;
    placeholder?: string;
  }>;
}

export interface LLMConfigFile {
  defaultProvider?: string | 'none'; // Which provider to use, or 'none' to disable LLM
  provider?: string; // Legacy field for backwards compatibility
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export const SUPPORTED_PROVIDERS: LLMProviderConfig[] = [
  {
    name: 'ollama',
    displayName: 'Ollama',
    description: 'Local LLM server - no API key required',
    requiresApiKey: false,
    defaultModel: 'llama3.2:3b',
    supportedModels: ['llama3.2:3b', 'codellama:13b', 'mistral:7b', 'deepseek-coder:6.7b'],
  },
  {
    name: 'openrouter',
    displayName: 'OpenRouter',
    description: 'Access to 100+ AI models through a single API',
    requiresApiKey: true,
    defaultModel: 'meta-llama/llama-3.2-3b-instruct',
    supportedModels: [
      'meta-llama/llama-3.2-3b-instruct',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'google/gemini-flash-1.5',
      'deepseek/deepseek-coder',
      'mistralai/mistral-7b-instruct',
    ],
    additionalFields: [
      {
        key: 'siteUrl',
        displayName: 'Site URL',
        description: 'Your application URL (improves rate limits)',
        optional: true,
        placeholder: 'https://your-app.com',
      },
      {
        key: 'siteName',
        displayName: 'Site Name',
        description: 'Your application name (improves rate limits)',
        optional: true,
        placeholder: 'Your App Name',
      },
    ],
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'Direct access to OpenAI models (GPT-4, GPT-3.5)',
    requiresApiKey: true,
    defaultModel: 'gpt-4o-mini',
    supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  },
];

// LLM configurator handles dynamic provider configurations
/* eslint-disable @typescript-eslint/no-explicit-any */

export class McpLLMConfigurator {
  private isConfiguring = false;

  /**
   * Check if Bun runtime is available for secure key storage
   */
  static isBunAvailable(): boolean {
    return ApiKeyManager.isBunSecretsAvailable();
  }

  /**
   * Get current LLM configuration or prompt user to configure
   */
  async ensureLLMConfiguration(): Promise<LLMConfig | null> {
    // Check if we already have a working configuration
    const existingConfig = await this.loadExistingConfig();
    if (existingConfig) {
      return existingConfig;
    }

    // If no Bun runtime, can't configure securely
    if (!McpLLMConfigurator.isBunAvailable()) {
      console.error('⚠️  LLM configuration requires Bun runtime for secure API key storage');
      console.error('   Install Bun: https://bun.sh');
      console.error('   Then restart the MCP server with: bun run a24z-memory');
      return null;
    }

    // Prevent multiple simultaneous configuration attempts
    if (this.isConfiguring) {
      return null;
    }

    console.error('🚀 Welcome to a24z-Memory enhanced synthesis setup!');
    console.error('   Configure an LLM provider for AI-enhanced note synthesis.');
    console.error('   This is optional - the system works great without it too.');
    console.error('');

    try {
      this.isConfiguring = true;
      return await this.promptForConfiguration();
    } finally {
      this.isConfiguring = false;
    }
  }

  /**
   * Load existing configuration from various sources
   */
  private async loadExistingConfig(): Promise<LLMConfig | null> {
    // 1. Try loading from .a24z/llm-config.json (highest priority)
    const fileConfig = this.loadFromConfigFile();
    if (fileConfig) {
      // Check if LLM is explicitly disabled
      if (fileConfig.provider === 'none') {
        return null;
      }

      const merged = await ApiKeyManager.mergeWithStoredKey(fileConfig);
      if (merged.apiKey || !this.getProviderConfig(merged.provider)?.requiresApiKey) {
        return merged;
      }
    }

    // 2. Only use automatic provider selection if no config file exists
    // (If config file exists but provider is not configured, respect that)
    if (!this.hasConfigFile()) {
      const autoConfig = await this.loadFromStoredKeys();
      if (autoConfig) {
        return autoConfig;
      }
    }

    return null;
  }

  /**
   * Check if config file exists
   */
  private hasConfigFile(): boolean {
    try {
      const fs = require('fs');
      const path = require('path');
      const { findGitRoot } = require('../utils/pathNormalization');

      const repoRoot = findGitRoot(process.cwd());
      if (!repoRoot) return false;

      const configPath = path.join(repoRoot, '.a24z', 'llm-config.json');
      return fs.existsSync(configPath);
    } catch {
      return false;
    }
  }

  /**
   * Load configuration from .a24z/llm-config.json
   */
  private loadFromConfigFile(): LLMConfig | null {
    try {
      const fs = require('fs');
      const path = require('path');
      const { findGitRoot } = require('../utils/pathNormalization');

      const repoRoot = findGitRoot(process.cwd());
      if (!repoRoot) return null;

      const configPath = path.join(repoRoot, '.a24z', 'llm-config.json');
      if (fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as LLMConfigFile;

        // Use defaultProvider if specified, otherwise fall back to provider field
        const provider = fileConfig.defaultProvider || fileConfig.provider;

        if (!provider) {
          return null;
        }

        return {
          provider: provider as any,
          endpoint: fileConfig.endpoint,
          model: fileConfig.model,
          temperature: fileConfig.temperature,
          maxTokens: fileConfig.maxTokens,
          timeout: fileConfig.timeout,
        };
      }
    } catch {
      // No config file or error reading
    }

    return null;
  }

  /**
   * Load configuration from stored API keys (automatic provider selection)
   */
  private async loadFromStoredKeys(): Promise<LLMConfig | null> {
    if (!McpLLMConfigurator.isBunAvailable()) {
      return null;
    }

    // Get all stored providers
    const storedProviders = await ApiKeyManager.listStoredProviders();
    if (storedProviders.length === 0) {
      return null;
    }

    // Provider priority order (most preferred first)
    const providerPriority = ['openrouter', 'openai', 'anthropic', 'ollama'];

    // Find the highest priority provider that has stored credentials
    for (const preferredProvider of providerPriority) {
      if (storedProviders.includes(preferredProvider)) {
        const stored = await ApiKeyManager.getApiKey(preferredProvider);
        if (stored && stored.apiKey) {
          return {
            provider: preferredProvider as any,
            apiKey: stored.apiKey,
            model: stored.model,
            endpoint: stored.endpoint,
            openRouterSiteUrl: stored.siteUrl,
            openRouterSiteName: stored.siteName,
            temperature: 0.3,
            maxTokens: 1000,
          };
        }
      }
    }

    // If no priority match, use the first available provider
    const firstProvider = storedProviders[0];
    const stored = await ApiKeyManager.getApiKey(firstProvider);
    if (stored) {
      const providerConfig = this.getProviderConfig(firstProvider);

      // For non-API key providers (like Ollama), create config even without API key
      if (!providerConfig?.requiresApiKey || stored.apiKey) {
        return {
          provider: firstProvider as any,
          apiKey: stored.apiKey,
          model: stored.model || providerConfig?.defaultModel,
          endpoint: stored.endpoint,
          openRouterSiteUrl: stored.siteUrl,
          openRouterSiteName: stored.siteName,
          temperature: 0.3,
          maxTokens: 1000,
        };
      }
    }

    return null;
  }

  /**
   * Get provider configuration by name
   */
  private getProviderConfig(providerName: string): LLMProviderConfig | undefined {
    return SUPPORTED_PROVIDERS.find((p) => p.name === providerName);
  }

  /**
   * Prompt user for LLM configuration (this will be called by MCP client)
   */
  private async promptForConfiguration(): Promise<LLMConfig | null> {
    console.error('📋 Available LLM providers:');
    SUPPORTED_PROVIDERS.forEach((provider, index) => {
      console.error(`   ${index + 1}. ${provider.displayName} - ${provider.description}`);
    });
    console.error('   0. Skip LLM configuration (use local synthesis only)');
    console.error('');

    // For now, we'll use console input since MCP prompting requires more setup
    // In a real implementation, this would use MCP's prompt mechanism
    console.error('⚠️  Interactive configuration not yet implemented.');
    console.error('   Please configure using one of these methods:');
    console.error('');
    console.error('1. Config file (.a24z/llm-config.json):');
    console.error('   {');
    console.error('     "provider": "openrouter",');
    console.error('     "model": "meta-llama/llama-3.2-3b-instruct",');
    console.error('     "temperature": 0.3');
    console.error('   }');
    console.error('');
    console.error('2. Using the library API (with Bun):');
    console.error('   await ApiKeyManager.storeApiKey("openrouter", {');
    console.error('     apiKey: "your-key-here",');
    console.error('     model: "meta-llama/llama-3.2-3b-instruct"');
    console.error('   });');
    console.error('');

    return null;
  }

  /**
   * Interactive provider selection (to be implemented with MCP prompts)
   */
  private async selectProvider(): Promise<LLMProviderConfig | null> {
    // This would use MCP prompt mechanism when available
    // For now, return null to indicate no selection
    return null;
  }

  /**
   * Configure selected provider (to be implemented with MCP prompts)
   */
  private async configureProvider(_provider: LLMProviderConfig): Promise<LLMConfig | null> {
    // This would use MCP prompt mechanism to gather:
    // - API key (if required)
    // - Model selection
    // - Additional fields (site URL, site name, etc.)
    // - Performance settings (temperature, maxTokens)

    return null;
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(config: LLMConfig): Promise<boolean> {
    const providerConfig = this.getProviderConfig(config.provider);
    if (!providerConfig) {
      return false;
    }

    // Check if API key is required and present
    if (providerConfig.requiresApiKey && !config.apiKey) {
      const stored = await ApiKeyManager.getApiKey(config.provider);
      if (!stored?.apiKey) {
        return false;
      }
    }

    return true;
  }
}
