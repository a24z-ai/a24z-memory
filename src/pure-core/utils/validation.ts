/**
 * Pure validation utilities
 * Platform-agnostic validation message handling
 */

import { FileSystemAdapter } from '../abstractions/filesystem';
import { ValidationMessageOverrides, DEFAULT_VALIDATION_MESSAGES } from '../types/validation';
import { ALEXANDRIA_DIRS } from '../../constants/paths';

/**
 * Get the validation messages file path
 */
export function getValidationMessagesPath(fs: FileSystemAdapter, repositoryPath: string): string {
  return fs.join(repositoryPath, ALEXANDRIA_DIRS.PRIMARY, 'validation-messages.json');
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
        overrides[key as keyof ValidationMessageOverrides] = (data: Record<string, unknown>) => {
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

  // Ensure alexandria directory exists
  const alexandriaDir = fs.join(repositoryPath, ALEXANDRIA_DIRS.PRIMARY);
  if (!fs.exists(alexandriaDir)) {
    fs.createDir(alexandriaDir);
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
 * Message formatter that combines default and custom messages
 */
export class ValidationMessageFormatter {
  private messages: typeof DEFAULT_VALIDATION_MESSAGES;

  constructor(overrides?: ValidationMessageOverrides) {
    this.messages = {
      ...DEFAULT_VALIDATION_MESSAGES,
      ...overrides,
    } as typeof DEFAULT_VALIDATION_MESSAGES;
  }

  format<T extends keyof typeof DEFAULT_VALIDATION_MESSAGES>(
    type: T,
    data: Parameters<(typeof DEFAULT_VALIDATION_MESSAGES)[T]>[0]
  ): string {
    const formatter = this.messages[type];
    if (!formatter) {
      throw new Error(`Unknown validation message type: ${type}`);
    }
    return (formatter as (data: Parameters<(typeof DEFAULT_VALIDATION_MESSAGES)[T]>[0]) => string)(
      data
    );
  }
}
