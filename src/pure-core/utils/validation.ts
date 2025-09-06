/**
 * Pure validation utilities
 * Platform-agnostic validation message handling
 */

import { FileSystemAdapter } from '../abstractions/filesystem';
import { ValidationMessageOverrides } from '../types/validation';

/**
 * Get the validation messages file path
 */
export function getValidationMessagesPath(fs: FileSystemAdapter, repositoryPath: string): string {
  return fs.join(repositoryPath, '.a24z', 'validation-messages.json');
}

/**
 * Load validation messages from repository
 */
export function loadValidationMessages(
  fs: FileSystemAdapter,
  repositoryPath: string
): ValidationMessageOverrides | null {
  try {
    const messagesPath = getValidationMessagesPath(fs, repositoryPath);
    
    if (!fs.exists(messagesPath)) {
      return null;
    }

    const content = fs.readFile(messagesPath);
    const messages = JSON.parse(content);

    // Validate the structure
    if (typeof messages !== 'object' || messages === null) {
      return null;
    }

    // Convert string templates to functions
    const overrides: ValidationMessageOverrides = {};
    
    for (const [key, template] of Object.entries(messages)) {
      if (typeof template === 'string') {
        // Create a function that interpolates the template
        overrides[key as keyof ValidationMessageOverrides] = (data: any) => {
          let result = template;
          
          // Simple template interpolation for ${variable} patterns
          for (const [dataKey, value] of Object.entries(data)) {
            const pattern = new RegExp(`\\$\\{${dataKey}\\}`, 'g');
            result = result.replace(pattern, String(value));
          }
          
          return result;
        };
      }
    }

    return overrides;
  } catch {
    return null;
  }
}

/**
 * Save validation messages to repository
 */
export function saveValidationMessages(
  fs: FileSystemAdapter,
  repositoryPath: string,
  messages: ValidationMessageOverrides
): void {
  const messagesPath = getValidationMessagesPath(fs, repositoryPath);
  
  // Ensure .a24z directory exists
  const a24zDir = fs.join(repositoryPath, '.a24z');
  if (!fs.exists(a24zDir)) {
    fs.createDir(a24zDir);
  }

  // Convert function overrides to string templates for storage
  const templates: Record<string, string> = {};
  
  for (const [key, func] of Object.entries(messages)) {
    if (typeof func === 'function') {
      // Store a placeholder template - in practice, these would be provided as strings
      templates[key] = `Custom message for ${key}`;
    }
  }

  // Write the messages file
  fs.writeFile(messagesPath, JSON.stringify(templates, null, 2));
}

/**
 * Default validation message templates
 */
export const DEFAULT_VALIDATION_MESSAGES = {
  noteTooLong: (data: { actual: number; limit: number; overBy: number; percentage: number }) =>
    `Note content is too long (${data.actual.toLocaleString()} characters, ${data.percentage}% of limit). ` +
    `Maximum allowed: ${data.limit.toLocaleString()} characters. ` +
    `You are ${data.overBy.toLocaleString()} characters over the limit. ` +
    `💡 Tip: Consider splitting this into multiple focused notes.`,

  tooManyTags: (data: { actual: number; limit: number }) =>
    `Note has too many tags (${data.actual}). Maximum allowed: ${data.limit}`,

  tooManyAnchors: (data: { actual: number; limit: number }) =>
    `Note has too many anchors (${data.actual}). Maximum allowed: ${data.limit}`,

  invalidTags: (data: { invalidTags: string[]; allowedTags: string[] }) =>
    `The following tags are not allowed: ${data.invalidTags.join(', ')}. ` +
    `Allowed tags: ${data.allowedTags.join(', ')}`,

  invalidType: (data: { type: string; allowedTypes: string[] }) =>
    `The type "${data.type}" is not allowed. Allowed types: ${data.allowedTypes.join(', ')}`,

  anchorOutsideRepo: (data: { anchor: string }) =>
    `Anchor "${data.anchor}" references a path outside the repository. All anchors must be within the repository.`,

  missingAnchors: (_data: { actual: number }) =>
    `At least one anchor path is required`,
};

/**
 * Message formatter that combines default and custom messages
 */
export class ValidationMessageFormatter {
  private messages: typeof DEFAULT_VALIDATION_MESSAGES;

  constructor(overrides?: ValidationMessageOverrides) {
    this.messages = { ...DEFAULT_VALIDATION_MESSAGES, ...overrides } as typeof DEFAULT_VALIDATION_MESSAGES;
  }

  format<T extends keyof typeof DEFAULT_VALIDATION_MESSAGES>(
    type: T,
    data: Parameters<typeof DEFAULT_VALIDATION_MESSAGES[T]>[0]
  ): string {
    const formatter = this.messages[type];
    if (!formatter) {
      throw new Error(`Unknown validation message type: ${type}`);
    }
    return (formatter as any)(data);
  }
}