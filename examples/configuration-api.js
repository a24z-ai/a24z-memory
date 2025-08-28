/**
 * Example: Using the a24z-memory configuration API for UI development
 */

import {
  A24zMemory,
  getRepositoryConfiguration,
  updateRepositoryConfiguration,
  getAllowedTags,
  validateNoteAgainstConfig,
} from 'a24z-memory';

// Example 1: Direct function usage
async function directApiExample() {
  const repoPath = '/path/to/your/repo';

  // Get current configuration
  const config = getRepositoryConfiguration(repoPath);
  console.log('Current config:', config);

  // Update configuration to enforce tags
  const updatedConfig = updateRepositoryConfiguration(repoPath, {
    tags: {
      enforceAllowedTags: true,
      allowedTags: ['feature', 'bugfix', 'documentation', 'testing'],
    },
  });
  console.log('Updated config:', updatedConfig);

  // Check allowed tags
  const allowedTags = getAllowedTags(repoPath);
  console.log('Allowed tags:', allowedTags);
  // Output: { enforced: true, tags: ['feature', 'bugfix', 'documentation', 'testing'] }

  // Validate a note before saving
  const noteToValidate = {
    note: 'Test note',
    anchors: ['src/file.ts'],
    tags: ['feature', 'invalid-tag'], // 'invalid-tag' is not allowed
    type: 'explanation',
    metadata: {},
  };

  const errors = validateNoteAgainstConfig(noteToValidate, repoPath);
  if (errors.length > 0) {
    console.error('Validation errors:', errors);
    // Will show error about 'invalid-tag' not being in allowed list
  }
}

// Example 2: Using the A24zMemory class (easier API)
async function classApiExample() {
  const memory = new A24zMemory('/path/to/your/repo');

  // Get configuration
  const config = memory.getConfiguration();
  console.log('Repository configuration:', config);

  // Update configuration
  const newConfig = memory.updateConfiguration({
    limits: {
      maxTagsPerNote: 5,
      noteMaxLength: 15000,
    },
    tags: {
      enforceAllowedTags: true,
      allowedTags: ['feature', 'bugfix', 'security', 'performance'],
    },
  });
  console.log('Updated configuration:', newConfig);

  // Get allowed tags
  const allowedTags = memory.getAllowedTags();
  console.log('Allowed tags:', allowedTags);

  // Validate before saving
  const note = {
    note: 'Important security fix',
    anchors: ['src/auth.ts'],
    tags: ['security'],
    type: 'gotcha',
    metadata: { pr: 123 },
  };

  const validationErrors = memory.validateNote(note);
  if (validationErrors.length === 0) {
    // Safe to save
    const savedNote = memory.saveNote(note);
    console.log('Note saved:', savedNote.id);
  } else {
    console.error('Cannot save note:', validationErrors);
  }

  // Get a note by ID
  const noteId = 'note-1234567890-abc';
  const retrievedNote = memory.getNoteById(noteId);
  if (retrievedNote) {
    console.log('Retrieved note:', retrievedNote);
  }

  // Delete a note
  const deleted = memory.deleteNoteById(noteId);
  console.log('Note deleted:', deleted);

  // Check for stale notes
  const staleNotes = memory.checkStaleNotes();
  if (staleNotes.length > 0) {
    console.log('Found stale notes:', staleNotes);
  }
}

// Example 3: Building a UI component
class TagConfigurationUI {
  constructor(repositoryPath) {
    this.memory = new A24zMemory(repositoryPath);
  }

  render() {
    const config = this.memory.getConfiguration();
    const allowedTags = this.memory.getAllowedTags();

    return {
      enforced: allowedTags.enforced,
      tags: allowedTags.tags,
      limits: config.limits,
      canAddTag: (tag) => {
        if (!allowedTags.enforced) return true;
        return allowedTags.tags.includes(tag);
      },
      saveConfiguration: (newTags, enforced) => {
        return this.memory.updateConfiguration({
          tags: {
            allowedTags: newTags,
            enforceAllowedTags: enforced,
          },
        });
      },
    };
  }
}

// Example 4: Configuration file structure
const exampleConfigurationFile = {
  version: 1,
  limits: {
    noteMaxLength: 10000,
    maxTagsPerNote: 10,
    maxTagLength: 50,
    maxAnchorsPerNote: 20,
  },
  storage: {
    backupOnMigration: true,
    compressionEnabled: false,
  },
  tags: {
    enforceAllowedTags: true,
    allowedTags: ['feature', 'bugfix', 'documentation', 'testing', 'security'],
  },
};

console.log('Example configuration.json:', JSON.stringify(exampleConfigurationFile, null, 2));
