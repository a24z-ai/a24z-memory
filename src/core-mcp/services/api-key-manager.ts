/**
 * API Key Manager for secure storage of LLM provider API keys
 * Uses Bun.secrets for secure OS-level credential storage
 * Note: This feature requires Bun runtime for secure key storage
 */

import type { LLMConfig } from './llm-service';

export interface StoredApiKey {
  provider: 'ollama' | 'openai' | 'openrouter' | string; // Allow any provider name for flexibility
  apiKey: string;
  model?: string;
  endpoint?: string;
  // OpenRouter specific
  siteUrl?: string;
  siteName?: string;
}

// API key manager needs any types for Bun.secrets interface which isn't fully typed
/* eslint-disable @typescript-eslint/no-explicit-any */

export class ApiKeyManager {
  private static SERVICE_NAME = 'a24z-memory';

  /**
   * Check if Bun.secrets is available (Bun runtime)
   */
  static isBunSecretsAvailable(): boolean {
    return (
      typeof (globalThis as any).Bun !== 'undefined' &&
      typeof (globalThis as any).Bun.secrets !== 'undefined'
    );
  }

  /**
   * Store an API key securely
   */
  static async storeApiKey(provider: string, config: Partial<StoredApiKey>): Promise<void> {
    if (!this.isBunSecretsAvailable()) {
      throw new Error(
        'API key storage requires Bun runtime. Please use Bun to run this application for secure key management.'
      );
    }

    const keyName = `${provider}-api-key`;
    const secrets = (globalThis as any).Bun.secrets;
    const value = JSON.stringify(config);

    await secrets.set({
      service: this.SERVICE_NAME,
      name: keyName,
      value,
    });
  }

  /**
   * Retrieve an API key
   */
  static async getApiKey(provider: string): Promise<StoredApiKey | null> {
    if (!this.isBunSecretsAvailable()) {
      return null; // No Bun, no API key storage
    }

    const keyName = `${provider}-api-key`;
    const secrets = (globalThis as any).Bun.secrets;

    try {
      const value = await secrets.get({
        service: this.SERVICE_NAME,
        name: keyName,
      });

      if (value) {
        return JSON.parse(value);
      }
    } catch {
      // Key doesn't exist
    }

    return null;
  }

  /**
   * Delete a stored API key
   */
  static async deleteApiKey(provider: string): Promise<void> {
    if (!this.isBunSecretsAvailable()) {
      throw new Error(
        'API key deletion requires Bun runtime. Keys set via environment variables must be removed manually.'
      );
    }

    const keyName = `${provider}-api-key`;
    const secrets = (globalThis as any).Bun.secrets;

    await secrets.delete({
      service: this.SERVICE_NAME,
      name: keyName,
    });
  }

  /**
   * List all stored providers
   */
  static async listStoredProviders(): Promise<string[]> {
    if (!this.isBunSecretsAvailable()) {
      return []; // No Bun, no stored providers
    }

    const providers: string[] = [];

    // Check common providers
    const knownProviders = ['ollama', 'openai', 'openrouter', 'anthropic', 'google', 'mistral'];
    for (const provider of knownProviders) {
      const stored = await this.getApiKey(provider);
      if (stored) {
        providers.push(provider);
      }
    }

    return providers;
  }

  /**
   * Merge stored API key with provided config
   */
  static async mergeWithStoredKey(config: LLMConfig): Promise<LLMConfig> {
    // If API key is already in config, use it as-is
    if (config.apiKey) {
      return config;
    }

    // Try to load stored API key
    const stored = await this.getApiKey(config.provider);
    if (stored) {
      return {
        ...config,
        apiKey: stored.apiKey,
        model: config.model || stored.model,
        endpoint: config.endpoint || stored.endpoint,
        openRouterSiteUrl: config.openRouterSiteUrl || stored.siteUrl,
        openRouterSiteName: config.openRouterSiteName || stored.siteName,
      };
    }

    return config;
  }
}
