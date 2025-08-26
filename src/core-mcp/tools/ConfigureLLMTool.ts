/**
 * Configure LLM Tool
 * Allows users to configure LLM providers through MCP interface
 */

import { z } from 'zod';
import { BaseTool } from './base-tool';
import { McpToolResult } from '../types';
import { ApiKeyManager } from '../services/api-key-manager';
import { LLMService } from '../services/llm-service';
import { SUPPORTED_PROVIDERS, type LLMProviderConfig } from '../services/mcp-llm-configurator';

export class ConfigureLLMTool extends BaseTool {
  name = 'configure_llm';
  description = 'Configure LLM providers for AI-enhanced note synthesis';

  schema = z.object({
    action: z.enum(['list', 'status', 'configure', 'test', 'remove', 'set-default']).describe('Action to perform'),
    provider: z.string().optional().describe('Provider name (required for configure/test/remove/set-default, use "none" to disable)'),
    apiKey: z.string().optional().describe('API key for the provider'),
    model: z.string().optional().describe('Model to use'),
    siteUrl: z.string().optional().describe('Site URL (for OpenRouter rate limiting)'),
    siteName: z.string().optional().describe('Site name (for OpenRouter rate limiting)'),
    temperature: z.number().min(0).max(2).optional().describe('Temperature (0-2, default 0.3)'),
    maxTokens: z.number().min(1).optional().describe('Max tokens per response'),
    endpoint: z.string().optional().describe('Custom endpoint URL (for Ollama)')
  });

  async execute(input: z.infer<typeof this.schema>): Promise<McpToolResult> {
    const { action, provider, apiKey, model, siteUrl, siteName, temperature, maxTokens, endpoint } = input;

    switch (action) {
      case 'list':
        return this.listProviders();
      case 'status':
        return await this.showStatus();
      case 'configure':
        if (!provider) {
          return { content: [{ type: 'text', text: 'Provider name is required for configuration' }] };
        }
        return await this.configureProvider(provider, {
          apiKey, model, siteUrl, siteName, temperature, maxTokens, endpoint
        });
      case 'test':
        if (!provider) {
          return { content: [{ type: 'text', text: 'Provider name is required for testing' }] };
        }
        return await this.testProvider(provider);
      case 'remove':
        if (!provider) {
          return { content: [{ type: 'text', text: 'Provider name is required for removal' }] };
        }
        return await this.removeProvider(provider);
      case 'set-default':
        if (!provider) {
          return { content: [{ type: 'text', text: 'Provider name is required (use "none" to disable LLM)' }] };
        }
        return await this.setDefaultProvider(provider);
      default:
        return { content: [{ type: 'text', text: 'Invalid action. Use: list, status, configure, test, remove, or set-default' }] };
    }
  }

  /**
   * List available providers
   */
  private listProviders(): McpToolResult {
    const bunAvailable = ApiKeyManager.isBunSecretsAvailable();
    let content = '# Available LLM Providers\n\n';
    
    if (!bunAvailable) {
      content += '⚠️  **Bun runtime required** for secure API key storage\n';
      content += 'Install Bun: https://bun.sh\n\n';
    }

    SUPPORTED_PROVIDERS.forEach((provider, index) => {
      content += `## ${index + 1}. ${provider.displayName}\n`;
      content += `${provider.description}\n`;
      content += `**Provider ID:** \`${provider.name}\`\n`;
      content += `**API Key Required:** ${provider.requiresApiKey ? '✅ Yes' : '❌ No'}\n`;
      content += `**Default Model:** \`${provider.defaultModel || 'N/A'}\`\n`;
      
      if (provider.supportedModels && provider.supportedModels.length > 0) {
        content += `**Supported Models:**\n`;
        provider.supportedModels.slice(0, 5).forEach(model => {
          content += `- \`${model}\`\n`;
        });
        if (provider.supportedModels.length > 5) {
          content += `- ... and ${provider.supportedModels.length - 5} more\n`;
        }
      }
      content += '\n';
    });

    content += '\n## Usage Examples\n\n';
    content += '```json\n';
    content += '// Configure Ollama (no API key needed)\n';
    content += '{\n';
    content += '  "action": "configure",\n';
    content += '  "provider": "ollama",\n';
    content += '  "model": "llama3.2:3b",\n';
    content += '  "endpoint": "http://localhost:11434"\n';
    content += '}\n\n';
    content += '// Configure OpenRouter\n';
    content += '{\n';
    content += '  "action": "configure",\n';
    content += '  "provider": "openrouter",\n';
    content += '  "apiKey": "sk-or-v1-...",\n';
    content += '  "model": "meta-llama/llama-3.2-3b-instruct",\n';
    content += '  "siteName": "My App",\n';
    content += '  "siteUrl": "https://myapp.com"\n';
    content += '}\n';
    content += '```\n';

    return { content: [{ type: 'text', text: content }] };
  }

  /**
   * Show current LLM configuration status
   */
  private async showStatus(): Promise<McpToolResult> {
    const bunAvailable = ApiKeyManager.isBunSecretsAvailable();
    let content = '# Current LLM Configuration Status\n\n';
    
    if (!bunAvailable) {
      content += '⚠️  **Bun runtime not available** - API key storage disabled\n';
      content += 'Install Bun: https://bun.sh\n\n';
    }

    // Check config file
    const fileConfig = this.loadConfigFile();
    if (fileConfig) {
      content += '## Configuration File (.a24z/llm-config.json)\n';
      
      // Show defaultProvider explicitly
      if (fileConfig.defaultProvider !== undefined) {
        content += `**Default Provider:** ${fileConfig.defaultProvider === 'none' ? 'DISABLED (LLM features off)' : fileConfig.defaultProvider}\n`;
      } else if (fileConfig.provider) {
        content += `**Provider (legacy):** ${fileConfig.provider}\n`;
      }
      
      content += `**Model:** ${fileConfig.model || 'default'}\n`;
      if (fileConfig.endpoint) content += `**Endpoint:** ${fileConfig.endpoint}\n\n`;
    }

    // Check stored API keys
    if (bunAvailable) {
      const storedProviders = await ApiKeyManager.listStoredProviders();
      if (storedProviders.length > 0) {
        content += '## Stored API Keys\n';

        for (const providerName of storedProviders) {
          const stored = await ApiKeyManager.getApiKey(providerName);
          const providerConfig = SUPPORTED_PROVIDERS.find(p => p.name === providerName);
          
          content += `### ${providerConfig?.displayName || providerName}\n`;
          content += `**Provider:** ${providerName}\n`;
          content += `**Model:** ${stored?.model || providerConfig?.defaultModel || 'default'}\n`;
          if (stored?.endpoint) content += `**Endpoint:** ${stored.endpoint}\n`;
          if (stored?.siteUrl) content += `**Site URL:** ${stored.siteUrl}\n`;
          if (stored?.siteName) content += `**Site Name:** ${stored.siteName}\n`;
          content += `**API Key:** ${stored?.apiKey ? '✅ Stored securely' : '❌ Not set'}\n\n`;
        }
      } else {
        content += '## Stored API Keys\n';
        content += 'No API keys stored yet.\n\n';
      }
    }

    // Show current effective configuration
    content += '## Current Effective Configuration\n';
    
    try {
      // Check what configuration would actually be used
      if (fileConfig?.defaultProvider === 'none') {
        content += `**Active Provider:** DISABLED - LLM features turned off\n`;
        content += `*To enable, use: \`{ "action": "set-default", "provider": "<provider-name>" }\`*\n`;
      } else if (fileConfig?.defaultProvider || fileConfig?.provider) {
        const activeProvider = fileConfig.defaultProvider || fileConfig.provider;
        content += `**Active Provider:** ${activeProvider} (from configuration file)\n`;
      } else {
        content += '**Active Provider:** None - no provider configured\n';
        content += `*To configure, use: \`{ "action": "configure", "provider": "<provider-name>", "apiKey": "..." }\`*\n`;
      }
    } catch {
      content += '**Active Provider:** Unable to determine\n';
    }

    content += '\n## Configuration Methods\n';
    content += '1. **Configuration file** (.a24z/llm-config.json)\n';
    content += '   - Set `defaultProvider: "none"` to disable LLM features\n';
    content += '   - Set `defaultProvider: "<provider>"` to specify which provider to use\n';
    content += '2. **Environment variables** (A24Z_LLM_PROVIDER)\n';
    content += '3. **Stored API keys** (use with explicit provider configuration)\n';

    return { content: [{ type: 'text', text: content }] };
  }

  /**
   * Load config file (helper method)
   */
  private loadConfigFile(): any {
    try {
      const fs = require('fs');
      const path = require('path');
      const { findGitRoot } = require('../utils/pathNormalization');
      
      const repoRoot = findGitRoot(process.cwd());
      if (!repoRoot) return null;
      
      const configPath = path.join(repoRoot, '.a24z', 'llm-config.json');
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch {
      // No config file or error reading
    }
    return null;
  }

  /**
   * Configure a provider
   */
  private async configureProvider(
    providerName: string, 
    config: {
      apiKey?: string;
      model?: string;
      siteUrl?: string;
      siteName?: string;
      temperature?: number;
      maxTokens?: number;
      endpoint?: string;
    }
  ): Promise<McpToolResult> {
    const providerConfig = SUPPORTED_PROVIDERS.find(p => p.name === providerName);
    if (!providerConfig) {
      return { 
        content: [{ 
          type: 'text', 
          text: `❌ Unknown provider: ${providerName}\n\nUse the 'list' action to see available providers.` 
        }] 
      };
    }

    // Check if Bun is available for providers that need API keys
    if (providerConfig.requiresApiKey && !ApiKeyManager.isBunSecretsAvailable()) {
      return {
        content: [{
          type: 'text',
          text: `❌ ${providerConfig.displayName} configuration requires Bun runtime for secure API key storage.\n\nInstall Bun: https://bun.sh\nThen restart the MCP server with: bun run a24z-memory`
        }]
      };
    }

    // Validate required API key
    if (providerConfig.requiresApiKey && !config.apiKey) {
      // Check if we already have one stored
      const existing = await ApiKeyManager.getApiKey(providerName);
      if (!existing?.apiKey) {
        return {
          content: [{
            type: 'text',
            text: `❌ API key required for ${providerConfig.displayName}\n\nPlease provide the 'apiKey' parameter.`
          }]
        };
      }
    }

    try {
      // Store API key and configuration if provider requires it
      if (providerConfig.requiresApiKey && config.apiKey) {
        const storeConfig: any = {
          provider: providerName,
          apiKey: config.apiKey
        };

        // Add optional fields
        if (config.model) storeConfig.model = config.model;
        if (config.siteUrl) storeConfig.siteUrl = config.siteUrl;
        if (config.siteName) storeConfig.siteName = config.siteName;
        if (config.endpoint) storeConfig.endpoint = config.endpoint;

        await ApiKeyManager.storeApiKey(providerName, storeConfig);
      }

      // Create LLM config for testing
      const llmConfig: any = {
        provider: providerName,
        model: config.model || providerConfig.defaultModel,
        temperature: config.temperature || 0.3,
        maxTokens: config.maxTokens || 1000,
        endpoint: config.endpoint,
        openRouterSiteUrl: config.siteUrl,
        openRouterSiteName: config.siteName
      };

      // Merge with stored API key if available
      const mergedConfig = await ApiKeyManager.mergeWithStoredKey(llmConfig);

      // Test the configuration
      const testResult = await this.testConfiguration(mergedConfig, providerConfig);

      let content = `✅ **${providerConfig.displayName} Configured Successfully**\n\n`;
      content += `**Provider:** ${providerName}\n`;
      content += `**Model:** ${mergedConfig.model || 'default'}\n`;
      if (mergedConfig.endpoint) content += `**Endpoint:** ${mergedConfig.endpoint}\n`;
      content += `**Temperature:** ${mergedConfig.temperature || 0.3}\n`;
      content += `**Max Tokens:** ${mergedConfig.maxTokens || 1000}\n`;
      
      if (testResult.success) {
        content += '\n🧪 **Connection Test:** ✅ Passed\n';
        content += 'AI-enhanced note synthesis is now enabled!\n';
      } else {
        content += '\n🧪 **Connection Test:** ⚠️  Failed\n';
        content += `Error: ${testResult.error}\n`;
        content += 'Configuration saved, but provider may not be available.\n';
      }

      return { content: [{ type: 'text', text: content }] };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Test a provider configuration
   */
  private async testProvider(providerName: string): Promise<McpToolResult> {
    const providerConfig = SUPPORTED_PROVIDERS.find(p => p.name === providerName);
    if (!providerConfig) {
      return { 
        content: [{ 
          type: 'text', 
          text: `❌ Unknown provider: ${providerName}` 
        }] 
      };
    }

    try {
      // Load existing configuration
      const stored = await ApiKeyManager.getApiKey(providerName);
      if (providerConfig.requiresApiKey && (!stored || !stored.apiKey)) {
        return {
          content: [{
            type: 'text',
            text: `❌ No API key configured for ${providerConfig.displayName}\n\nRun configure action first.`
          }]
        };
      }

      const llmConfig: any = {
        provider: providerName,
        model: stored?.model || providerConfig.defaultModel,
        temperature: 0.3,
        maxTokens: 100
      };

      if (stored) {
        if (stored.apiKey) llmConfig.apiKey = stored.apiKey;
        if (stored.endpoint) llmConfig.endpoint = stored.endpoint;
        if (stored.siteUrl) llmConfig.openRouterSiteUrl = stored.siteUrl;
        if (stored.siteName) llmConfig.openRouterSiteName = stored.siteName;
      }

      const testResult = await this.testConfiguration(llmConfig, providerConfig);

      let content = `🧪 **Testing ${providerConfig.displayName}**\n\n`;
      content += `**Provider:** ${providerName}\n`;
      content += `**Model:** ${llmConfig.model}\n`;
      
      if (testResult.success) {
        content += `**Status:** ✅ Available and working\n`;
        content += `**Response:** "${testResult.response}"\n`;
      } else {
        content += `**Status:** ❌ Not available\n`;
        content += `**Error:** ${testResult.error}\n`;
      }

      return { content: [{ type: 'text', text: content }] };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Remove a provider configuration
   */
  private async removeProvider(providerName: string): Promise<McpToolResult> {
    const providerConfig = SUPPORTED_PROVIDERS.find(p => p.name === providerName);
    if (!providerConfig) {
      return { 
        content: [{ 
          type: 'text', 
          text: `❌ Unknown provider: ${providerName}` 
        }] 
      };
    }

    try {
      if (providerConfig.requiresApiKey) {
        if (!ApiKeyManager.isBunSecretsAvailable()) {
          return {
            content: [{
              type: 'text',
              text: `❌ Cannot remove ${providerConfig.displayName} configuration: Bun runtime required`
            }]
          };
        }

        await ApiKeyManager.deleteApiKey(providerName);
      }

      return {
        content: [{
          type: 'text',
          text: `✅ ${providerConfig.displayName} configuration removed successfully`
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Test a configuration by making a simple request
   */
  private async testConfiguration(config: any, providerConfig: LLMProviderConfig): Promise<{success: boolean, response?: string, error?: string}> {
    try {
      const llmService = new LLMService(config);
      const response = await llmService.synthesizeNotes({
        query: 'Hello, this is a test',
        notes: [],
        filePath: '/test'
      });

      if (response && response.success) {
        return {
          success: true,
          response: response.content?.substring(0, 100) + (response.content && response.content.length > 100 ? '...' : '')
        };
      } else {
        return {
          success: false,
          error: response?.error || 'No response received'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set the default provider in the config file
   */
  private async setDefaultProvider(providerName: string): Promise<McpToolResult> {
    // Validate provider (allow 'none' as special case)
    if (providerName !== 'none') {
      const providerConfig = SUPPORTED_PROVIDERS.find(p => p.name === providerName);
      if (!providerConfig) {
        return {
          content: [{
            type: 'text',
            text: `❌ Unknown provider: ${providerName}\n\nUse 'none' to disable LLM or one of: ${SUPPORTED_PROVIDERS.map(p => p.name).join(', ')}`
          }]
        };
      }

      // Check if provider has necessary configuration
      if (providerConfig.requiresApiKey) {
        const stored = await ApiKeyManager.getApiKey(providerName);
        if (!stored?.apiKey) {
          return {
            content: [{
              type: 'text',
              text: `❌ ${providerConfig.displayName} requires API key configuration first.\n\nUse: { "action": "configure", "provider": "${providerName}", "apiKey": "..." }`
            }]
          };
        }
      }
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const { findGitRoot } = require('../utils/pathNormalization');
      
      const repoRoot = findGitRoot(process.cwd());
      if (!repoRoot) {
        return {
          content: [{
            type: 'text',
            text: '❌ Could not find repository root'
          }]
        };
      }
      
      const configDir = path.join(repoRoot, '.a24z');
      const configPath = path.join(configDir, 'llm-config.json');
      
      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Load existing config or create new one
      let config: any = {};
      if (fs.existsSync(configPath)) {
        try {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch {
          // Invalid JSON, start fresh
          config = {};
        }
      }
      
      // Update defaultProvider
      config.defaultProvider = providerName;
      
      // Remove legacy provider field if setting defaultProvider
      if (config.provider && config.defaultProvider) {
        delete config.provider;
      }
      
      // Write updated config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      let message = '';
      if (providerName === 'none') {
        message = '✅ LLM features disabled successfully\n\n';
        message += 'The system will use local synthesis only.\n';
        message += 'To re-enable, use: `{ "action": "set-default", "provider": "<provider-name>" }`';
      } else {
        const providerConfig = SUPPORTED_PROVIDERS.find(p => p.name === providerName);
        message = `✅ Default provider set to ${providerConfig?.displayName || providerName}\n\n`;
        message += `The system will use ${providerName} for all LLM operations.\n`;
        message += 'To disable LLM, use: `{ "action": "set-default", "provider": "none" }`';
      }
      
      return {
        content: [{
          type: 'text',
          text: message
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to set default provider: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}