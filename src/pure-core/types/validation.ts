/**
 * Validation types for a24z-memory
 * These types are used for note validation and custom error messages
 */

// ============================================================================
// Validation Message Data Types
// ============================================================================

/**
 * Data types available for each validation error
 */
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

// ============================================================================
// Default Messages
// ============================================================================

/**
 * Default validation message templates
 */
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
    `Invalid note type: ${data.type}. Allowed types: ${data.allowedTypes.join(', ')}`,

  anchorOutsideRepo: (data: ValidationMessageData['anchorOutsideRepo']) =>
    `Anchor is outside the repository: ${data.anchor}`,

  missingAnchors: (data: ValidationMessageData['missingAnchors']) =>
    `Note must have at least one anchor (currently has ${data.actual})`,
};

// ============================================================================
// Message Overrides
// ============================================================================

/**
 * Type for custom validation message overrides
 */
export type ValidationMessageOverrides = Partial<{
  [K in keyof typeof DEFAULT_VALIDATION_MESSAGES]: (data: ValidationMessageData[K]) => string;
}>;

// ============================================================================
// Validation Error Types
// ============================================================================

/**
 * Typed validation error with specific data
 */
export interface TypedValidationError<
  T extends keyof ValidationMessageData = keyof ValidationMessageData,
> {
  field: string;
  type: T;
  data: ValidationMessageData[T];
  message?: string;
}

// ============================================================================
// Validation Message Formatter
// ============================================================================

/**
 * Formatter class for validation messages
 * Allows customization of validation error messages
 */
export class ValidationMessageFormatter {
  private messages: typeof DEFAULT_VALIDATION_MESSAGES;

  constructor(overrides?: ValidationMessageOverrides) {
    this.messages = { ...DEFAULT_VALIDATION_MESSAGES };
    if (overrides) {
      Object.assign(this.messages, overrides);
    }
  }

  /**
   * Format a validation error with the appropriate message
   */
  format<T extends keyof ValidationMessageData>(
    type: T,
    data: ValidationMessageData[T]
  ): string {
    const formatter = this.messages[type];
    if (!formatter) {
      return `Validation error: ${type}`;
    }
    return (formatter as any)(data);
  }

  /**
   * Get all available message types
   */
  getAvailableTypes(): Array<keyof ValidationMessageData> {
    return Object.keys(this.messages) as Array<keyof ValidationMessageData>;
  }
}