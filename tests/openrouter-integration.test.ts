import { ApiKeyManager } from '../src/core-mcp/services/api-key-manager';
import { LLMService } from '../src/core-mcp/services/llm-service';
import type { LLMConfig } from '../src/core-mcp/services/llm-service';

describe('OpenRouter Integration', () => {
  describe('ApiKeyManager', () => {
    const testProvider = 'test-provider'; // Use test provider name to avoid conflicts
    const isBunAvailable = ApiKeyManager.isBunSecretsAvailable();

    afterEach(async () => {
      // Clean up test keys if Bun is available
      if (isBunAvailable) {
        try {
          await ApiKeyManager.deleteApiKey(testProvider);
        } catch {
          // Key might not exist
        }
      }
    });

    it('should store and retrieve API keys', async () => {
      if (!isBunAvailable) {
        console.log('Skipping test: Bun runtime not available');
        return;
      }

      const testConfig = {
        apiKey: 'test-key-123',
        model: 'test-model',
        siteUrl: 'https://test.com',
        siteName: 'Test Site',
      };

      await ApiKeyManager.storeApiKey(testProvider, testConfig);

      const retrieved = await ApiKeyManager.getApiKey(testProvider);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.apiKey).toBe(testConfig.apiKey);
      expect(retrieved?.model).toBe(testConfig.model);
      expect(retrieved?.siteUrl).toBe(testConfig.siteUrl);
      expect(retrieved?.siteName).toBe(testConfig.siteName);
    });

    it('should delete API keys', async () => {
      if (!isBunAvailable) {
        console.log('Skipping test: Bun runtime not available');
        return;
      }

      await ApiKeyManager.storeApiKey(testProvider, {
        apiKey: 'test-key-to-delete',
      });

      let retrieved = await ApiKeyManager.getApiKey(testProvider);
      expect(retrieved).toBeTruthy();

      await ApiKeyManager.deleteApiKey(testProvider);

      retrieved = await ApiKeyManager.getApiKey(testProvider);
      expect(retrieved).toBeNull();
    });

    it('should list stored providers', async () => {
      if (!isBunAvailable) {
        // Without Bun, should return empty array
        const providers = await ApiKeyManager.listStoredProviders();
        expect(providers).toEqual([]);
        return;
      }

      await ApiKeyManager.storeApiKey(testProvider, {
        apiKey: 'test-key',
      });

      const providers = await ApiKeyManager.listStoredProviders();
      expect(providers).toContain(testProvider);
    });

    it('should merge stored keys with config', async () => {
      if (!isBunAvailable) {
        // Without Bun, config should remain unchanged
        const config: LLMConfig = {
          provider: 'openrouter',
          temperature: 0.5,
        };

        const merged = await ApiKeyManager.mergeWithStoredKey(config);
        expect(merged).toEqual(config); // No changes without Bun
        return;
      }

      await ApiKeyManager.storeApiKey('openrouter', {
        apiKey: 'stored-key',
        model: 'stored-model',
        siteUrl: 'https://stored.com',
      });

      const config: LLMConfig = {
        provider: 'openrouter',
        temperature: 0.5,
      };

      const merged = await ApiKeyManager.mergeWithStoredKey(config);
      expect(merged.apiKey).toBe('stored-key');
      expect(merged.model).toBe('stored-model');
      expect(merged.temperature).toBe(0.5);
      expect(merged.openRouterSiteUrl).toBe('https://stored.com');

      // Clean up
      await ApiKeyManager.deleteApiKey('openrouter');
    });

    it('should not override existing API key in config', async () => {
      if (!isBunAvailable) {
        console.log('Skipping test: Bun runtime not available');
        return;
      }

      await ApiKeyManager.storeApiKey('openrouter', {
        apiKey: 'stored-key',
        model: 'stored-model',
      });

      const config: LLMConfig = {
        provider: 'openrouter',
        apiKey: 'config-key',
        model: 'config-model',
      };

      const merged = await ApiKeyManager.mergeWithStoredKey(config);
      expect(merged.apiKey).toBe('config-key');
      expect(merged.model).toBe('config-model');

      // Clean up
      await ApiKeyManager.deleteApiKey('openrouter');
    });
  });

  describe('LLMService with OpenRouter', () => {
    it('should create OpenRouter provider when configured', () => {
      const config: LLMConfig = {
        provider: 'openrouter',
        apiKey: 'test-key',
        model: 'test-model',
      };

      const service = new LLMService(config);
      expect(service).toBeTruthy();
    });

    it('should handle missing API key gracefully', async () => {
      const config: LLMConfig = {
        provider: 'openrouter',
        // No API key provided
      };

      const service = new LLMService(config);
      const response = await service.synthesizeNotes({
        query: 'test query',
        notes: [],
        filePath: '/test/path',
      });

      // Should return null or error response when no API key
      expect(response).toBeNull();
    });
  });

  describe('Bun Runtime Requirements', () => {
    it('should throw error when trying to store without Bun', async () => {
      const isBunAvailable = ApiKeyManager.isBunSecretsAvailable();

      if (isBunAvailable) {
        console.log('Skipping test: Bun runtime is available');
        return;
      }

      await expect(ApiKeyManager.storeApiKey('test', { apiKey: 'test' })).rejects.toThrow(
        'API key storage requires Bun runtime'
      );
    });
  });
});
