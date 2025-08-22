/**
 * TypeScript types available for UI development
 */

import type {
  RepositoryConfiguration,
  StoredNote,
  NoteConfidence,
  NoteType,
  ValidationError,
  StaleNote
} from '../src/lib';

// The complete configuration structure
const exampleConfig: RepositoryConfiguration = {
  version: 1,
  limits: {
    noteMaxLength: 10000,
    maxTagsPerNote: 10,
    maxTagLength: 50,
    maxAnchorsPerNote: 20
  },
  storage: {
    backupOnMigration: true,
    compressionEnabled: false
  },
  tags: {
    enforceAllowedTags: true,
    allowedTags: ['feature', 'bugfix', 'documentation']
  }
};

// A stored note structure
const exampleNote: StoredNote = {
  id: 'note-1234567890-abc123',
  note: 'This is the note content',
  anchors: ['src/file.ts', 'docs/readme.md'],
  tags: ['feature', 'documentation'],
  confidence: 'high',
  type: 'explanation',
  metadata: {
    author: 'user@example.com',
    pr: 123,
    customField: 'value'
  },
  timestamp: Date.now()
};

// Note confidence levels
const confidenceLevels: NoteConfidence[] = ['high', 'medium', 'low'];

// Note types
const noteTypes: NoteType[] = ['decision', 'pattern', 'gotcha', 'explanation'];

// Validation error structure
const exampleError: ValidationError = {
  field: 'tags',
  message: 'The following tags are not in the allowed tags list: invalid-tag',
  limit: 10,  // optional
  actual: 12  // optional
};

// Stale note structure (for checking obsolete anchors)
const exampleStaleNote: StaleNote = {
  note: exampleNote,
  staleAnchors: ['src/deleted-file.ts'],
  validAnchors: ['src/file.ts', 'docs/readme.md']
};

// Example UI state interface using these types
interface TagManagementUIState {
  configuration: RepositoryConfiguration;
  allowedTags: string[];
  enforced: boolean;
  pendingNote: Omit<StoredNote, 'id' | 'timestamp'>;
  validationErrors: ValidationError[];
  staleNotes: StaleNote[];
}

// Example functions for UI components
export class ConfigurationManager {
  // Get the current configuration
  static getConfig(repoPath: string): RepositoryConfiguration {
    // Implementation would call getRepositoryConfiguration
    return {} as RepositoryConfiguration;
  }
  
  // Update tag restrictions
  static setTagRestrictions(
    repoPath: string,
    tags: string[],
    enforce: boolean
  ): RepositoryConfiguration {
    // Implementation would call updateRepositoryConfiguration
    return {} as RepositoryConfiguration;
  }
  
  // Validate a note before allowing user to save
  static validateNote(
    note: Omit<StoredNote, 'id' | 'timestamp'>,
    repoPath: string
  ): ValidationError[] {
    // Implementation would call validateNoteAgainstConfig
    return [];
  }
  
  // Check if a tag is allowed
  static isTagAllowed(tag: string, repoPath: string): boolean {
    // Implementation would check against getAllowedTags
    return true;
  }
}

// Example React component props
interface TagSelectorProps {
  allowedTags: string[];
  enforced: boolean;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onConfigChange: (config: RepositoryConfiguration) => void;
}

// Example configuration update payload
interface ConfigurationUpdateRequest {
  version?: number;
  limits?: Partial<RepositoryConfiguration['limits']>;
  storage?: Partial<RepositoryConfiguration['storage']>;
  tags?: Partial<RepositoryConfiguration['tags']>;
}