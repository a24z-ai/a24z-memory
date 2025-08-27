import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  saveNote,
  updateRepositoryConfiguration,
  getRepositoryConfiguration,
  getAllowedTypes,
  validateNoteAgainstConfig,
  saveTypeDescription,
  deleteTypeDescription,
  getTypeDescriptions,
  addAllowedType,
  removeAllowedType,
  setEnforceAllowedTypes,
} from '../../../src/core-mcp/store/notesStore';

describe('Type Restrictions', () => {
  let tempDir: string;
  let testRepoPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-test-'));
    testRepoPath = path.join(tempDir, 'test-repo');
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Create a .git directory to make it a valid repository
    fs.mkdirSync(path.join(testRepoPath, '.git'), { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Configuration', () => {
    it('should have type restrictions disabled by default', () => {
      const config = getRepositoryConfiguration(testRepoPath);

      expect(config.types).toBeDefined();
      expect(config.types?.enforceAllowedTypes).toBe(false);
    });

    it('should allow updating type configuration', () => {
      const updatedConfig = updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: true,
        },
      });

      expect(updatedConfig.types?.enforceAllowedTypes).toBe(true);

      // Verify it persists
      const readConfig = getRepositoryConfiguration(testRepoPath);
      expect(readConfig.types?.enforceAllowedTypes).toBe(true);
    });

    it('should return allowed types for a repository', () => {
      // Initially no restrictions
      let allowedTypes = getAllowedTypes(testRepoPath);
      expect(allowedTypes.enforced).toBe(false);
      expect(allowedTypes.types).toEqual([]);

      // Update configuration and add some type descriptions to create allowed types
      updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: true,
        },
      });

      // Add type descriptions which will become the allowed types
      saveTypeDescription(testRepoPath, 'incident', 'Production incidents');
      saveTypeDescription(testRepoPath, 'architecture', 'Architecture decisions');

      // Check again
      allowedTypes = getAllowedTypes(testRepoPath);
      expect(allowedTypes.enforced).toBe(true);
      expect(allowedTypes.types.sort()).toEqual(['architecture', 'incident']);
    });
  });

  describe('Type Validation', () => {
    it('should allow any types when enforcement is disabled', () => {
      // Add a custom type description but don't enforce
      saveTypeDescription(testRepoPath, 'custom-type', 'A custom type');

      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['test-tag'],
        confidence: 'high' as const,
        type: 'random-type' as unknown as 'explanation', // Using a type not in the standard set
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Should not throw
      expect(() => saveNote(note)).not.toThrow();
    });

    it('should reject invalid types when enforcement is enabled', () => {
      // Configure allowed types
      updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: true,
        },
      });

      // Add type descriptions which will become the allowed types
      saveTypeDescription(testRepoPath, 'decision', 'Architecture decisions');
      saveTypeDescription(testRepoPath, 'pattern', 'Reusable patterns');
      saveTypeDescription(testRepoPath, 'incident', 'Production incidents');

      const note = {
        note: 'Test note with invalid type',
        anchors: ['file.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'random-type' as unknown as 'explanation',
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Should throw validation error
      expect(() => saveNote(note)).toThrow('Note validation failed');
      expect(() => saveNote(note)).toThrow('The type "random-type" is not allowed');
      expect(() => saveNote(note)).toThrow('decision, incident, pattern');
    });

    it('should accept valid types when enforcement is enabled', () => {
      // Configure allowed types
      updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: true,
        },
      });

      // Add type descriptions which will become the allowed types
      saveTypeDescription(testRepoPath, 'decision', 'Architecture decisions');
      saveTypeDescription(testRepoPath, 'pattern', 'Reusable patterns');
      saveTypeDescription(testRepoPath, 'gotcha', 'Tricky issues');

      const note = {
        note: 'Test note with valid type',
        anchors: ['file.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'pattern' as const,
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Should not throw
      const savedNote = saveNote(note);
      expect(savedNote.type).toEqual('pattern');
    });

    it('should not enforce when no type descriptions exist even if enforcement is enabled', () => {
      // Configure with enforcement but no type descriptions (no allowed types)
      updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: true,
        },
      });

      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Should not throw because no type descriptions exist
      expect(() => saveNote(note)).not.toThrow();
    });

    it('should validate types using validateNoteAgainstConfig', () => {
      // Configure allowed types
      updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: true,
        },
      });

      // Add type descriptions which will become the allowed types
      saveTypeDescription(testRepoPath, 'decision', 'Architecture decisions');
      saveTypeDescription(testRepoPath, 'pattern', 'Reusable patterns');

      const invalidNote = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'invalid-type' as unknown as 'explanation',
        metadata: {},
      };

      const errors = validateNoteAgainstConfig(invalidNote, testRepoPath);

      const typeError = errors.find(
        (e) => e.field === 'type' && e.message.includes('is not allowed')
      );
      expect(typeError).toBeDefined();
      expect(typeError?.message).toContain('invalid-type');
      expect(typeError?.message).toContain('decision, pattern');
    });
  });

  describe('Type Description Management', () => {
    it('should save and retrieve type descriptions', () => {
      const description = '# Incident Type\n\nFor production incidents and post-mortems.';
      saveTypeDescription(testRepoPath, 'incident', description);

      const descriptions = getTypeDescriptions(testRepoPath);
      expect(descriptions['incident']).toEqual(description);
    });

    it('should delete type descriptions', () => {
      saveTypeDescription(testRepoPath, 'incident', 'Test description');

      const deleted = deleteTypeDescription(testRepoPath, 'incident');
      expect(deleted).toBe(true);

      const descriptions = getTypeDescriptions(testRepoPath);
      expect(descriptions['incident']).toBeUndefined();
    });

    it('should handle addAllowedType and removeAllowedType helpers', () => {
      // Add a type
      addAllowedType(testRepoPath, 'incident', 'Production incidents');

      let descriptions = getTypeDescriptions(testRepoPath);
      expect(descriptions['incident']).toBeDefined();

      // Remove the type
      const removed = removeAllowedType(testRepoPath, 'incident');
      expect(removed).toBe(true);

      descriptions = getTypeDescriptions(testRepoPath);
      expect(descriptions['incident']).toBeUndefined();
    });

    it('should handle setEnforceAllowedTypes helper', () => {
      // Initially disabled
      let config = getRepositoryConfiguration(testRepoPath);
      expect(config.types?.enforceAllowedTypes).toBe(false);

      // Enable enforcement
      setEnforceAllowedTypes(testRepoPath, true);
      config = getRepositoryConfiguration(testRepoPath);
      expect(config.types?.enforceAllowedTypes).toBe(true);

      // Disable enforcement
      setEnforceAllowedTypes(testRepoPath, false);
      config = getRepositoryConfiguration(testRepoPath);
      expect(config.types?.enforceAllowedTypes).toBe(false);
    });

    it('should enforce description length limits', () => {
      const config = getRepositoryConfiguration(testRepoPath);
      const maxLength = config.limits.tagDescriptionMaxLength;
      const longDescription = 'x'.repeat(maxLength + 1);

      expect(() => saveTypeDescription(testRepoPath, 'test', longDescription)).toThrow(
        `Type description exceeds maximum length of ${maxLength} characters`
      );
    });
  });

  describe('Type enforcement toggling', () => {
    it('should allow toggling enforcement on and off', () => {
      const note = {
        note: 'Test note',
        anchors: ['file.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'custom-type' as unknown as 'explanation',
        metadata: {},
        directoryPath: testRepoPath,
      };

      // Initially allow custom types
      expect(() => saveNote(note)).not.toThrow();

      // Enable enforcement
      updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: true,
        },
      });

      // Add type descriptions which will become the allowed types
      saveTypeDescription(testRepoPath, 'decision', 'Architecture decisions');
      saveTypeDescription(testRepoPath, 'pattern', 'Reusable patterns');

      // Now should reject custom types
      expect(() => saveNote(note)).toThrow('The type "custom-type" is not allowed');

      // Disable enforcement
      updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: false,
        },
      });

      // Should allow custom types again
      expect(() => saveNote(note)).not.toThrow();
    });
  });

  describe('Mixed standard and custom types', () => {
    it('should allow mixing standard and custom types when enforcement is enabled', () => {
      updateRepositoryConfiguration(testRepoPath, {
        types: {
          enforceAllowedTypes: true,
        },
      });

      // Add both standard and custom type descriptions
      saveTypeDescription(testRepoPath, 'decision', 'Standard decision type');
      saveTypeDescription(testRepoPath, 'pattern', 'Standard pattern type');
      saveTypeDescription(testRepoPath, 'incident', 'Custom incident type');
      saveTypeDescription(testRepoPath, 'research', 'Custom research type');

      const allowedTypes = getAllowedTypes(testRepoPath);
      expect(allowedTypes.enforced).toBe(true);
      expect(allowedTypes.types.sort()).toEqual(['decision', 'incident', 'pattern', 'research']);

      // Test standard type
      const note1 = {
        note: 'Standard type note',
        anchors: ['file.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'decision' as const,
        metadata: {},
        directoryPath: testRepoPath,
      };

      expect(() => saveNote(note1)).not.toThrow();

      // Test custom type
      const note2 = {
        note: 'Custom type note',
        anchors: ['file.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'incident' as unknown as 'explanation',
        metadata: {},
        directoryPath: testRepoPath,
      };

      expect(() => saveNote(note2)).not.toThrow();

      // Test disallowed standard type (not in descriptions)
      const note3 = {
        note: 'Disallowed standard type',
        anchors: ['file.ts'],
        tags: ['test'],
        confidence: 'high' as const,
        type: 'explanation' as const,
        metadata: {},
        directoryPath: testRepoPath,
      };

      expect(() => saveNote(note3)).toThrow('The type "explanation" is not allowed');
    });
  });
});
