/**
 * Tests for Guidance Token Manager
 */

import { GuidanceTokenManager } from '../src/core-mcp/services/guidance-token-manager';

describe('GuidanceTokenManager', () => {
  let tokenManager: GuidanceTokenManager;
  const testGuidance = 'This is test guidance content that agents should read.';
  const testPath = '/test/repo/path';

  beforeEach(() => {
    tokenManager = new GuidanceTokenManager('test-secret');
  });

  describe('generateToken', () => {
    it('should generate a valid base64 token', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Should be valid base64
      const decoded = Buffer.from(token, 'base64').toString();
      expect(() => JSON.parse(decoded)).not.toThrow();
    });

    it('should include correct payload structure', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const decoded = Buffer.from(token, 'base64').toString();
      const data = JSON.parse(decoded);

      expect(data).toHaveProperty('payload');
      expect(data).toHaveProperty('signature');
      expect(data.payload).toHaveProperty('guidanceHash');
      expect(data.payload).toHaveProperty('path');
      expect(data.payload).toHaveProperty('timestamp');
      expect(data.payload).toHaveProperty('expires');
      expect(data.payload.path).toBe(testPath);
    });

    it('should generate different tokens for different content', () => {
      const token1 = tokenManager.generateToken('Content A', testPath);
      const token2 = tokenManager.generateToken('Content B', testPath);

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for different paths', () => {
      const token1 = tokenManager.generateToken(testGuidance, '/path/a');
      const token2 = tokenManager.generateToken(testGuidance, '/path/b');

      expect(token1).not.toBe(token2);
    });
  });

  describe('validateToken', () => {
    it('should validate a fresh token', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const isValid = tokenManager.validateToken(token, testGuidance);

      expect(isValid).toBe(true);
    });

    it('should reject token with different content', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const isValid = tokenManager.validateToken(token, 'Different content');

      expect(isValid).toBe(false);
    });

    it('should reject tampered tokens', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const decoded = Buffer.from(token, 'base64').toString();
      const data = JSON.parse(decoded);

      // Tamper with the payload
      data.payload.path = '/hacked/path';
      const tamperedToken = Buffer.from(JSON.stringify(data)).toString('base64');

      const isValid = tokenManager.validateToken(tamperedToken, testGuidance);
      expect(isValid).toBe(false);
    });

    it('should reject expired tokens', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const decoded = Buffer.from(token, 'base64').toString();
      const data = JSON.parse(decoded);

      // Set expiration to the past
      data.payload.expires = Date.now() - 1000;

      // Regenerate signature for the modified payload
      const crypto = require('crypto');
      data.signature = crypto
        .createHmac('sha256', 'test-secret')
        .update(JSON.stringify(data.payload))
        .digest('hex');

      const expiredToken = Buffer.from(JSON.stringify(data)).toString('base64');

      const isValid = tokenManager.validateToken(expiredToken, testGuidance);
      expect(isValid).toBe(false);
    });

    it('should reject tokens with wrong secret', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);

      // Create a new manager with different secret
      const otherManager = new GuidanceTokenManager('different-secret');
      const isValid = otherManager.validateToken(token, testGuidance);

      expect(isValid).toBe(false);
    });

    it('should reject invalid base64', () => {
      const isValid = tokenManager.validateToken('not-valid-base64!!!', testGuidance);
      expect(isValid).toBe(false);
    });

    it('should reject malformed JSON', () => {
      const invalidToken = Buffer.from('not valid json').toString('base64');
      const isValid = tokenManager.validateToken(invalidToken, testGuidance);
      expect(isValid).toBe(false);
    });
  });

  describe('parseToken', () => {
    it('should parse a valid token', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const payload = tokenManager.parseToken(token);

      expect(payload).toBeDefined();
      expect(payload?.path).toBe(testPath);
      expect(payload?.guidanceHash).toBeDefined();
      expect(payload?.timestamp).toBeDefined();
      expect(payload?.expires).toBeDefined();
    });

    it('should return null for invalid token', () => {
      const payload = tokenManager.parseToken('invalid-token');
      expect(payload).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for fresh token', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const isExpired = tokenManager.isTokenExpired(token);

      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const decoded = Buffer.from(token, 'base64').toString();
      const data = JSON.parse(decoded);

      // Set expiration to the past
      data.payload.expires = Date.now() - 1000;
      const expiredToken = Buffer.from(JSON.stringify(data)).toString('base64');

      const isExpired = tokenManager.isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);
    });

    it('should return true for invalid token', () => {
      const isExpired = tokenManager.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });
  });

  describe('token security', () => {
    it('should use HMAC for signature', () => {
      const token = tokenManager.generateToken(testGuidance, testPath);
      const decoded = Buffer.from(token, 'base64').toString();
      const data = JSON.parse(decoded);

      // Verify signature format (should be hex string)
      expect(data.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should include all context in signature', (done) => {
      const token1 = tokenManager.generateToken(testGuidance, testPath);

      // Even with same content and path, timestamps differ
      // So wait a bit to ensure different timestamp
      setTimeout(() => {
        const token2 = tokenManager.generateToken(testGuidance, testPath);

        // Tokens should be different due to timestamp
        expect(token1).not.toBe(token2);
        done();
      }, 5);
    });
  });

  describe('default secret fallback', () => {
    it('should use default secret when none provided', () => {
      const defaultManager = new GuidanceTokenManager();
      const token = defaultManager.generateToken(testGuidance, testPath);

      expect(token).toBeDefined();
      expect(defaultManager.validateToken(token, testGuidance)).toBe(true);
    });

    it('should use environment variable when available', () => {
      const originalEnv = process.env.A24Z_GUIDANCE_SECRET;
      process.env.A24Z_GUIDANCE_SECRET = 'env-secret';

      const envManager = new GuidanceTokenManager();
      const token = envManager.generateToken(testGuidance, testPath);

      expect(token).toBeDefined();
      expect(envManager.validateToken(token, testGuidance)).toBe(true);

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.A24Z_GUIDANCE_SECRET = originalEnv;
      } else {
        delete process.env.A24Z_GUIDANCE_SECRET;
      }
    });
  });
});
