/**
 * Guidance Token Manager
 * Handles generation and validation of tokens that prove guidance was read
 */

import * as crypto from 'crypto';
import { normalizeRepositoryPath } from '../utils/pathNormalization';
import { generateFullGuidanceContent } from '../utils/guidanceGenerator';

export interface TokenPayload {
  guidanceHash: string;
  path: string;
  timestamp: number;
  expires: number;
}

export interface TokenResult {
  payload: TokenPayload;
  signature: string;
}

export class GuidanceTokenManager {
  private readonly secret: string;

  constructor(secret?: string) {
    this.secret = secret || 'default-a24z-guidance-secret';
  }

  /**
   * Generate a token for guidance content
   * @param guidanceContent The guidance content
   * @param path The path context for the guidance
   * @returns Base64 encoded token
   */
  generateToken(guidanceContent: string, path: string): string {
    const payload: TokenPayload = {
      guidanceHash: crypto.createHash('md5').update(guidanceContent).digest('hex'),
      path,
      timestamp: Date.now(),
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const tokenData: TokenResult = { payload, signature };
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  /**
   * Validate a token against guidance content
   * @param token The token to validate
   * @param guidanceContent The current guidance content
   * @returns Whether the token is valid
   */
  validateToken(token: string, guidanceContent: string): boolean {
    try {
      // Decode the token
      const tokenData: TokenResult = JSON.parse(Buffer.from(token, 'base64').toString());

      const { payload, signature } = tokenData;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        return false;
      }

      // Check expiration
      if (Date.now() > payload.expires) {
        return false;
      }

      // Verify guidance content hash
      const currentHash = crypto.createHash('md5').update(guidanceContent).digest('hex');
      return payload.guidanceHash === currentHash;
    } catch {
      // Any parsing or validation error means invalid token
      return false;
    }
  }

  /**
   * Parse a token to extract its payload (for debugging/inspection)
   * @param token The token to parse
   * @returns The token payload or null if invalid
   */
  parseToken(token: string): TokenPayload | null {
    try {
      const tokenData: TokenResult = JSON.parse(Buffer.from(token, 'base64').toString());
      return tokenData.payload;
    } catch {
      return null;
    }
  }

  /**
   * Check if a token is expired without validating content
   * @param token The token to check
   * @returns Whether the token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.parseToken(token);
    if (!payload) return true;
    return Date.now() > payload.expires;
  }

  /**
   * Validate a token for a specific repository path
   * Validates the token against the full guidance content
   * @param token The token to validate
   * @param repoOrFilePath The repository or file path
   * @returns Whether the token is valid
   * @throws Error if token is invalid
   */
  validateTokenForPath(token: string | undefined, repoOrFilePath: string): void {
    if (!token) {
      throw new Error('Guidance token required. Please run get_repository_guidance first.');
    }

    // Get the repository path
    const repoPath = normalizeRepositoryPath(repoOrFilePath);

    // Generate the full guidance content (same as GetRepositoryGuidanceTool)
    let guidanceContent = '';
    try {
      guidanceContent = generateFullGuidanceContent(repoPath);
    } catch {
      // If we can't generate guidance content, the repository might not be initialized
      throw new Error(
        'Unable to generate guidance content. Please run get_repository_guidance first.'
      );
    }

    // Validate the token against the full guidance content
    if (!this.validateToken(token, guidanceContent)) {
      throw new Error(
        'Invalid or expired guidance token. Please run get_repository_guidance again.'
      );
    }
  }
}
