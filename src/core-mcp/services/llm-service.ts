/**
 * LLM Service abstraction for a24z-memory
 * Supports Ollama and other LLM providers for enhanced note synthesis
 */

export interface LLMConfig {
  provider: 'ollama' | 'openai' | 'none';
  endpoint?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number; // in milliseconds
  promptTemplate?: string; // Custom prompt template
  includeSourceNotes?: boolean; // Whether to include source notes in response (default: true)
  includeFileContents?: boolean; // Whether to include file contents in prompt (default: false)
  fileContentBudget?: number; // Max tokens for file contents (default: 2000)
}

export interface LLMContext {
  query: string;
  notes: Array<{
    id: string;
    content: string;
    type: string;
    confidence: string;
    tags: string[];
    anchors: string[];
    anchorContents?: Array<{  // Optional file contents
      path: string;
      content: string;
      error?: string;
    }>;
  }>;
  filePath: string;
  taskContext?: string;
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
  provider: string;
}

/**
 * Ollama-specific implementation
 */
class OllamaService {
  constructor(private config: LLMConfig) {}

  async synthesize(context: LLMContext): Promise<LLMResponse> {
    const endpoint = this.config.endpoint || 'http://localhost:11434';
    const model = this.config.model || 'llama2';
    
    try {
      // Build the prompt
      const prompt = this.buildPrompt(context);
      
      // Call Ollama API
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          temperature: this.config.temperature || 0.3,
          stream: false,
          options: {
            num_predict: this.config.maxTokens || 500
          }
        }),
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        content: data.response,
        provider: `ollama:${model}`
      };
    } catch (error) {
      // Service unavailable or error - fall back gracefully
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'ollama'
      };
    }
  }

  private buildPrompt(context: LLMContext): string {
    // Check for custom prompt template
    if (this.config.promptTemplate) {
      return this.interpolateTemplate(this.config.promptTemplate, context);
    }

    // Default prompt template
    let prompt = `You are a principal engineer with deep knowledge of this codebase. 
Based on the following documented knowledge, provide a helpful and concise answer.

Question: ${context.query}
Working on: ${context.filePath}`;

    if (context.taskContext) {
      prompt += `\nTask context: ${context.taskContext}`;
    }

    prompt += '\n\nRelevant documented knowledge (each note has an ID for reference):\n';

    for (let i = 0; i < context.notes.length; i++) {
      const note = context.notes[i];
      prompt += `\n[Note ${i + 1}] ID: ${note.id}\n`;
      prompt += `Type: ${note.type.toUpperCase()} | Confidence: ${note.confidence}\n`;
      prompt += `Tags: ${note.tags.join(', ')}\n`;
      prompt += `Anchored to: ${note.anchors.join(', ')}\n`;
      prompt += `Content: ${note.content}\n`;
      
      // Include file contents if available and within token limits
      if (note.anchorContents && note.anchorContents.length > 0) {
        prompt += '\nRelated code from anchored files:\n';
        for (const anchor of note.anchorContents) {
          if (anchor.error) {
            prompt += `  - ${anchor.path}: [Could not read: ${anchor.error}]\n`;
          } else {
            // Limit file content to prevent prompt explosion
            const truncated = anchor.content.length > 500 
              ? anchor.content.substring(0, 500) + '...[truncated]'
              : anchor.content;
            prompt += `  - ${anchor.path}:\n\`\`\`\n${truncated}\n\`\`\`\n`;
          }
        }
      }
      
      prompt += '---\n';
    }

    prompt += `\nProvide a synthesis that:
1. Directly answers the question
2. References specific note IDs when citing information (e.g., "According to Note 1...")
3. Highlights the most relevant patterns or gotchas
4. Suggests best practices based on the documented knowledge
5. Is concise and actionable

Important: When referencing information, cite the Note number so users can trace back to the source.

Answer:`;

    return prompt;
  }

  private interpolateTemplate(template: string, context: LLMContext): string {
    // Simple template interpolation
    let result = template;
    
    // Replace basic variables
    result = result.replace(/\{\{query\}\}/g, context.query);
    result = result.replace(/\{\{filePath\}\}/g, context.filePath);
    result = result.replace(/\{\{taskContext\}\}/g, context.taskContext || '');
    result = result.replace(/\{\{noteCount\}\}/g, context.notes.length.toString());
    
    // Replace notes section
    const notesSection = context.notes.map((note, i) => 
      `[Note ${i + 1}] ID: ${note.id}
Type: ${note.type.toUpperCase()} | Confidence: ${note.confidence}
Tags: ${note.tags.join(', ')}
Anchored to: ${note.anchors.join(', ')}
Content: ${note.content}`
    ).join('\n---\n');
    
    result = result.replace(/\{\{notes\}\}/g, notesSection);
    
    return result;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const endpoint = this.config.endpoint || 'http://localhost:11434';
      const response = await fetch(`${endpoint}/api/tags`, {
        signal: AbortSignal.timeout(2000) // Quick check
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Main LLM service that handles provider selection and fallback
 */
export class LLMService {
  private provider?: OllamaService;

  constructor(private config?: LLMConfig) {
    if (config && config.provider === 'ollama') {
      this.provider = new OllamaService(config);
    }
  }

  async synthesizeNotes(context: LLMContext): Promise<LLMResponse | null> {
    // If no LLM configured, return null (use local synthesis)
    if (!this.provider) {
      return null;
    }

    // Check if service is available
    const isAvailable = await this.provider.isAvailable();
    if (!isAvailable) {
      return null; // Fall back to local synthesis
    }

    // Try to get LLM synthesis
    const response = await this.provider.synthesize(context);
    
    // Return response only if successful
    return response.success ? response : null;
  }

  static loadConfig(): LLMConfig | undefined {
    // Try environment variables first
    if (process.env.A24Z_LLM_PROVIDER) {
      return {
        provider: process.env.A24Z_LLM_PROVIDER as 'ollama' | 'openai' | 'none',
        endpoint: process.env.A24Z_LLM_ENDPOINT,
        model: process.env.A24Z_LLM_MODEL,
        apiKey: process.env.A24Z_LLM_API_KEY,
        temperature: process.env.A24Z_LLM_TEMPERATURE ? parseFloat(process.env.A24Z_LLM_TEMPERATURE) : undefined,
        maxTokens: process.env.A24Z_LLM_MAX_TOKENS ? parseInt(process.env.A24Z_LLM_MAX_TOKENS) : undefined,
        timeout: process.env.A24Z_LLM_TIMEOUT ? parseInt(process.env.A24Z_LLM_TIMEOUT) : undefined
      };
    }

    // Try loading from .a24z/llm-config.json in the repository
    try {
      const fs = require('fs');
      const path = require('path');
      const { findGitRoot } = require('../utils/pathNormalization');
      
      const repoRoot = findGitRoot(process.cwd());
      if (!repoRoot) return undefined;
      
      const configPath = path.join(repoRoot, '.a24z', 'llm-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config as LLMConfig;
      }
    } catch {
      // No config file, that's fine
    }

    return undefined;
  }
}

/**
 * Example .a24z/llm-config.json:
 * {
 *   "provider": "ollama",
 *   "endpoint": "http://localhost:11434",
 *   "model": "codellama:13b",
 *   "temperature": 0.3,
 *   "maxTokens": 1000,
 *   "timeout": 30000
 * }
 * 
 * Or via environment variables:
 * A24Z_LLM_PROVIDER=ollama
 * A24Z_LLM_ENDPOINT=http://localhost:11434
 * A24Z_LLM_MODEL=codellama:13b
 */