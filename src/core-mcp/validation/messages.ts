/**
 * Validation message templates and data types
 * This module provides typed validation messages that can be customized by UI providers
 */

// Data types available for each validation error
export interface ValidationMessageData {
  noteTooLong: {
    actual: number;
    limit: number;
    overBy: number;
    percentage: number;
  };

  tooManyTags: {
    actual: number;
    limit: number;
  };

  tooManyAnchors: {
    actual: number;
    limit: number;
  };

  invalidTags: {
    invalidTags: string[];
    allowedTags: string[];
  };

  invalidType: {
    type: string;
    allowedTypes: string[];
  };

  anchorOutsideRepo: {
    anchor: string;
  };

  missingAnchors: {
    actual: number;
  };
}

// Default message templates
export const DEFAULT_VALIDATION_MESSAGES = {
  noteTooLong: (data: ValidationMessageData['noteTooLong']) =>
    `Note content is too long (${data.actual.toLocaleString()} characters, ${data.percentage}% of limit). ` +
    `Maximum allowed: ${data.limit.toLocaleString()} characters. ` +
    `You are ${data.overBy.toLocaleString()} characters over the limit. ` +
    `💡 Tip: Consider splitting this into multiple focused notes.`,

  tooManyTags: (data: ValidationMessageData['tooManyTags']) =>
    `Note has too many tags (${data.actual}). Maximum allowed: ${data.limit}`,

  tooManyAnchors: (data: ValidationMessageData['tooManyAnchors']) =>
    `Note has too many anchors (${data.actual}). Maximum allowed: ${data.limit}`,

  invalidTags: (data: ValidationMessageData['invalidTags']) =>
    `The following tags are not allowed: ${data.invalidTags.join(', ')}. ` +
    `Allowed tags: ${data.allowedTags.join(', ')}`,

  invalidType: (data: ValidationMessageData['invalidType']) =>
    `The type "${data.type}" is not allowed. Allowed types: ${data.allowedTypes.join(', ')}`,

  anchorOutsideRepo: (data: ValidationMessageData['anchorOutsideRepo']) =>
    `Anchor "${data.anchor}" references a path outside the repository. All anchors must be within the repository.`,

  missingAnchors: (_data: ValidationMessageData['missingAnchors']) =>
    `At least one anchor path is required`,
};

// Type for custom message overrides
export type ValidationMessageOverrides = Partial<{
  [K in keyof typeof DEFAULT_VALIDATION_MESSAGES]: (data: ValidationMessageData[K]) => string;
}>;

// Validation error with typed data
export interface TypedValidationError<
  T extends keyof ValidationMessageData = keyof ValidationMessageData,
> {
  field: string;
  type: T;
  data: ValidationMessageData[T];
  message?: string; // Computed message
}

/**
 * Message formatter that combines default and custom messages
 */
export class ValidationMessageFormatter {
  private messages: typeof DEFAULT_VALIDATION_MESSAGES;

  constructor(overrides?: ValidationMessageOverrides) {
    this.messages = { ...DEFAULT_VALIDATION_MESSAGES, ...overrides };
  }

  format<T extends keyof ValidationMessageData>(type: T, data: ValidationMessageData[T]): string {
    const formatter = this.messages[type];
    if (!formatter) {
      throw new Error(`Unknown validation message type: ${type}`);
    }
    return (formatter as any)(data);
  }

  formatError<T extends keyof ValidationMessageData>(error: TypedValidationError<T>): string {
    return this.format(error.type, error.data);
  }
}

/**
 * Load custom validation messages from configuration
 */
export function loadValidationMessages(repositoryPath: string): ValidationMessageOverrides | null {
  try {
    const fs = require('fs');
    const path = require('path');
    const messagesFile = path.join(repositoryPath, '.a24z', 'validation-messages.js');

    if (!fs.existsSync(messagesFile)) {
      return null;
    }

    // Clear the require cache to get fresh messages
    delete require.cache[require.resolve(messagesFile)];

    // Load the custom messages module
    const customMessages = require(messagesFile);
    return customMessages.messages || customMessages.default || customMessages;
  } catch (error) {
    console.error('Failed to load custom validation messages:', error);
    return null;
  }
}

/**
 * Save custom validation messages to configuration
 */
export function saveValidationMessages(
  repositoryPath: string,
  messages: ValidationMessageOverrides
): void {
  const fs = require('fs');
  const path = require('path');
  const dataDir = path.join(repositoryPath, '.a24z');
  const messagesFile = path.join(dataDir, 'validation-messages.js');

  // Ensure .a24z directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Generate the JavaScript module content
  const messageEntries = Object.entries(messages).map(([key, func]) => {
    // Extract the function body as a string
    const funcString = func.toString();
    return `  ${key}: ${funcString}`;
  });

  const moduleContent = `/**
 * Custom validation messages for a24z-Memory
 * 
 * Each function receives typed data and should return a string message.
 * Available data for each validation type:
 * - noteTooLong: { actual, limit, overBy, percentage }
 * - tooManyTags: { actual, limit }
 * - tooManyAnchors: { actual, limit }
 * - invalidTags: { invalidTags[], allowedTags[] }
 * - invalidType: { type, allowedTypes[] }
 * - anchorOutsideRepo: { anchor }
 * - missingAnchors: { actual }
 */

module.exports = {
  messages: {
${messageEntries.join(',\n')}
  }
};
`;

  fs.writeFileSync(messagesFile, moduleContent, 'utf8');
}

/**
 * Get the path to the validation messages file
 */
export function getValidationMessagesPath(repositoryPath: string): string {
  const path = require('path');
  return path.join(repositoryPath, '.a24z', 'validation-messages.js');
}
