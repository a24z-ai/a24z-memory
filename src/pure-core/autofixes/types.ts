/**
 * Auto-fix types for the a24z-memory system
 * These types define the structure of auto-fix operations
 */

export type AutoFixSeverity = 'safe' | 'moderate' | 'dangerous';
export type AutoFixStatus = 'pending' | 'applied' | 'skipped' | 'failed';

export interface AutoFixIssue {
  /** Unique identifier for this type of issue */
  type: string;
  /** Human-readable description of the issue */
  description: string;
  /** Path or location where the issue was found */
  location: string;
  /** Severity of applying the fix */
  severity: AutoFixSeverity;
  /** Additional context about the issue */
  context?: Record<string, unknown>;
}

export interface AutoFixSuggestion {
  /** The issue this fix addresses */
  issue: AutoFixIssue;
  /** Description of what the fix will do */
  action: string;
  /** Function that performs the fix */
  apply: () => Promise<AutoFixResult>;
  /** Function that validates the fix can be applied */
  canApply?: () => Promise<boolean>;
  /** Function that previews the changes without applying */
  preview?: () => Promise<AutoFixPreview>;
}

export interface AutoFixResult {
  /** Whether the fix was successfully applied */
  success: boolean;
  /** Status of the fix */
  status: AutoFixStatus;
  /** Description of what was done */
  message: string;
  /** Details of changes made */
  changes?: AutoFixChange[];
  /** Error if the fix failed */
  error?: string;
}

export interface AutoFixChange {
  /** Type of change made */
  type: 'file_moved' | 'file_created' | 'file_updated' | 'property_updated';
  /** Original state before the change */
  before?: string | Record<string, unknown>;
  /** New state after the change */
  after?: string | Record<string, unknown>;
  /** Path affected by the change */
  path: string;
}

export interface AutoFixPreview {
  /** Description of what would be changed */
  description: string;
  /** List of changes that would be made */
  changes: AutoFixChange[];
  /** Estimated risk level */
  risk: AutoFixSeverity;
}

export interface AutoFixProvider {
  /** Name of this provider */
  name: string;
  /** Description of what this provider fixes */
  description: string;
  /** Analyze and return suggested fixes */
  analyze(): Promise<AutoFixSuggestion[]>;
  /** Apply a specific fix */
  applyFix(suggestion: AutoFixSuggestion): Promise<AutoFixResult>;
  /** Apply all safe fixes automatically */
  applyAllSafe(): Promise<AutoFixResult[]>;
}