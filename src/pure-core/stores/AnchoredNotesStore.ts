/**
 * Pure AnchoredNotesStore - Platform-agnostic note storage
 *
 * This version uses dependency injection with FileSystemAdapter to work in any environment
 * No Node.js dependencies - can run in browsers, Deno, Bun, or anywhere JavaScript runs
 */

import { FileSystemAdapter } from '../abstractions/filesystem';
import {
  StoredAnchoredNote,
  AnchoredNoteWithPath,
  MemoryPalaceConfiguration,
  ValidatedRepositoryPath,
  ValidatedRelativePath,
} from '../types';
import { A24zConfigurationStore } from './A24zConfigurationStore';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ValidationError {
  type:
    | 'noteTooLong'
    | 'tooManyTags'
    | 'tooManyAnchors'
    | 'invalidTags'
    | 'anchorOutsideRepo'
    | 'missingAnchors'
    | 'invalidAnchor';
  message: string;
  context?: Record<string, unknown>;
}

export interface StaleAnchoredNote {
  note: StoredAnchoredNote;
  staleAnchors: string[];
  validAnchors: string[];
}

export interface TagInfo {
  name: string;
  description?: string;
}

export interface SaveNoteInput {
  note: string;
  anchors: string[];
  tags: string[];
  codebaseViewId: string;
  metadata: Record<string, unknown>;
  directoryPath: ValidatedRepositoryPath;
}

// ============================================================================
// Pure AnchoredNotesStore Class
// ============================================================================

export class AnchoredNotesStore {
  private fs: FileSystemAdapter;
  private configStore: A24zConfigurationStore;

  constructor(fileSystemAdapter: FileSystemAdapter) {
    this.fs = fileSystemAdapter;
    this.configStore = new A24zConfigurationStore(fileSystemAdapter);
  }

  // ============================================================================
  // Repository Validation
  // ============================================================================

  /**
   * Validate that we have a proper repository root path
   * The .a24z directory should exist or be creatable at this path
   */
  private validateRepositoryRoot(repositoryRootPath: ValidatedRepositoryPath): void {
    const a24zPath = this.fs.join(repositoryRootPath, '.a24z');

    // If .a24z already exists, we're good
    if (this.fs.exists(a24zPath)) {
      return;
    }

    // Try to create .a24z directory - this validates we can write here
    try {
      this.fs.createDir(a24zPath);
    } catch {
      throw new Error(
        `Invalid repository root path: ${repositoryRootPath}. ` +
          `Expected a repository root where .a24z directory can be created. ` +
          `Make sure the path exists and is writable.`
      );
    }
  }

  // ============================================================================
  // Path Utilities (pure functions that work with any path format)
  // ============================================================================

  /**
   * Get the .a24z directory path for a repository
   */
  private getA24zDir(repositoryRootPath: ValidatedRepositoryPath): string {
    return this.fs.join(repositoryRootPath, '.a24z');
  }

  /**
   * Get the notes directory path
   */
  private getNotesDir(repositoryRootPath: ValidatedRepositoryPath): string {
    return this.fs.join(this.getA24zDir(repositoryRootPath), 'notes');
  }

  /**
   * Get the tags directory path
   */
  private getTagsDir(repositoryRootPath: ValidatedRepositoryPath): string {
    return this.fs.join(this.getA24zDir(repositoryRootPath), 'tags');
  }

  /**
   * Get path for a specific note file using date-based directory structure
   */
  private getNotePath(
    repositoryRootPath: ValidatedRepositoryPath,
    noteId: string,
    timestamp: number
  ): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const noteDir = this.fs.join(this.getNotesDir(repositoryRootPath), year.toString(), month);
    return this.fs.join(noteDir, `${noteId}.json`);
  }

  /**
   * Ensure the date-based notes directory exists
   */
  private ensureNotesDir(repositoryRootPath: ValidatedRepositoryPath, timestamp: number): void {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const noteDir = this.fs.join(this.getNotesDir(repositoryRootPath), year.toString(), month);
    this.fs.createDir(noteDir);
  }

  /**
   * Generate a unique note ID
   */
  private generateNoteId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `note-${timestamp}-${random}`;
  }

  // ============================================================================
  // Configuration Management (delegated to A24zConfigurationStore)
  // ============================================================================

  /**
   * Get repository configuration
   */
  getConfiguration(repositoryRootPath: ValidatedRepositoryPath): MemoryPalaceConfiguration {
    return this.configStore.getConfiguration(repositoryRootPath);
  }

  /**
   * Update repository configuration
   */
  updateConfiguration(
    repositoryRootPath: ValidatedRepositoryPath,
    updates: Partial<MemoryPalaceConfiguration>
  ): MemoryPalaceConfiguration {
    return this.configStore.updateConfiguration(repositoryRootPath, updates);
  }

  /**
   * Enable or disable allowed tags enforcement
   */
  setEnforceAllowedTags(repositoryRootPath: ValidatedRepositoryPath, enforce: boolean): void {
    return this.configStore.setEnforceAllowedTags(repositoryRootPath, enforce);
  }

  // ============================================================================
  // Note CRUD Operations
  // ============================================================================

  /**
   * Save a note to storage
   */
  saveNote(input: SaveNoteInput): AnchoredNoteWithPath {
    const { note: noteContent, anchors, tags, codebaseViewId, metadata, directoryPath } = input;

    // Validate input
    const validation = this.validateNote(
      { note: noteContent, anchors, tags, codebaseViewId, metadata },
      directoryPath
    );
    if (validation.length > 0) {
      throw new Error(`Validation failed: ${validation.map((v) => v.message).join(', ')}`);
    }

    // Create the note
    const noteId = this.generateNoteId();
    const timestamp = Date.now();
    const storedNote: StoredAnchoredNote = {
      id: noteId,
      note: noteContent,
      anchors: [...anchors], // Clone to prevent mutations
      tags: [...tags], // Clone to prevent mutations
      metadata: { ...metadata }, // Clone to prevent mutations
      timestamp,
      codebaseViewId,
    };

    // Ensure date-based directory exists
    this.ensureNotesDir(directoryPath, timestamp);

    // Save to file using date-based path
    const notePath = this.getNotePath(directoryPath, noteId, timestamp);
    this.fs.writeFile(notePath, JSON.stringify(storedNote, null, 2));

    return {
      note: storedNote,
      path: this.fs.relative(directoryPath, notePath),
    };
  }

  /**
   * Get a note by its ID (searches through date-based directory structure)
   */
  getNoteById(
    repositoryRootPath: ValidatedRepositoryPath,
    noteId: string
  ): StoredAnchoredNote | null {
    const notesDir = this.getNotesDir(repositoryRootPath);

    if (!this.fs.exists(notesDir)) {
      return null;
    }

    // Search through year/month directories
    const yearDirs = this.fs.readDir(notesDir).filter((item) => /^\d{4}$/.test(item));

    for (const year of yearDirs) {
      const yearDir = this.fs.join(notesDir, year);
      const monthDirs = this.fs.readDir(yearDir).filter((item) => /^\d{2}$/.test(item));

      for (const month of monthDirs) {
        const monthDir = this.fs.join(yearDir, month);
        const noteFilePath = this.fs.join(monthDir, `${noteId}.json`);

        if (this.fs.exists(noteFilePath)) {
          try {
            const content = this.fs.readFile(noteFilePath);
            return JSON.parse(content);
          } catch (error) {
            console.warn(`Failed to load note ${noteId}:`, error);
            return null;
          }
        }
      }
    }

    return null;
  }

  /**
   * Delete a note by its ID (searches through date-based directory structure)
   */
  deleteNoteById(repositoryRootPath: ValidatedRepositoryPath, noteId: string): boolean {
    const notesDir = this.getNotesDir(repositoryRootPath);

    if (!this.fs.exists(notesDir)) {
      return false;
    }

    // Search through year/month directories
    const yearDirs = this.fs.readDir(notesDir).filter((item) => /^\d{4}$/.test(item));

    for (const year of yearDirs) {
      const yearDir = this.fs.join(notesDir, year);
      const monthDirs = this.fs.readDir(yearDir).filter((item) => /^\d{2}$/.test(item));

      for (const month of monthDirs) {
        const monthDir = this.fs.join(yearDir, month);
        const noteFilePath = this.fs.join(monthDir, `${noteId}.json`);

        if (this.fs.exists(noteFilePath)) {
          try {
            this.fs.deleteFile(noteFilePath);
            return true;
          } catch (error) {
            console.warn(`Failed to delete note ${noteId}:`, error);
            return false;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get all notes for a specific path within a repository
   */
  getNotesForPath(
    repositoryRoot: ValidatedRepositoryPath,
    relativePath: ValidatedRelativePath,
    includeParentNotes: boolean = true
  ): AnchoredNoteWithPath[] {
    // Get all notes from the repository
    const allNotes = this.readAllNotes(repositoryRoot);

    // Use the already-validated relative path for comparison
    const queryRelative = relativePath;

    // Filter and sort notes based on path matching
    const processedNotes = allNotes.map((noteWithPath: AnchoredNoteWithPath) => {
      const note = noteWithPath.note;
      let isParent = false;

      // Check if any anchor matches the query path
      const matchesAnchor = note.anchors.some((anchor: string) => {
        // Normalize the anchor path
        const normalizedAnchor = anchor.replace(/\\/g, '/');
        const normalizedQuery = queryRelative.replace(/\\/g, '/');

        return (
          normalizedQuery === normalizedAnchor ||
          normalizedQuery.startsWith(`${normalizedAnchor}/`) ||
          normalizedAnchor.startsWith(`${normalizedQuery}/`)
        );
      });

      // With ValidatedRelativePath, we know the query is always in the repository
      if (matchesAnchor) {
        isParent = false;
      } else {
        isParent = true; // If it doesn't match anchor, it must be a parent
      }

      // Calculate distance for sorting - use the relative path segments
      const distance = matchesAnchor
        ? 0
        : isParent
          ? queryRelative.split('/').filter(Boolean).length
          : 9999;

      return {
        note: { ...note, isParentDirectory: isParent, pathDistance: distance },
        path: noteWithPath.path,
      };
    });

    // Filter nulls and apply parent filter
    const filtered = processedNotes
      .filter(
        (
          x
        ): x is {
          note: StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number };
          path: string;
        } => x !== null
      )
      .filter((x) => (includeParentNotes ? true : !x.note.isParentDirectory));

    // Sort by distance and timestamp
    filtered.sort((a, b) => {
      return a.note.pathDistance - b.note.pathDistance || b.note.timestamp - a.note.timestamp;
    });

    // Return as AnchoredNoteWithPath array (remove the extra properties)
    return filtered.map((item) => ({
      note: item.note as StoredAnchoredNote,
      path: item.path,
    }));
  }

  /**
   * Read all notes from a repository
   */
  private readAllNotes(repositoryRootPath: ValidatedRepositoryPath): AnchoredNoteWithPath[] {
    const notesDir = this.getNotesDir(repositoryRootPath);
    const notes: AnchoredNoteWithPath[] = [];

    if (!this.fs.exists(notesDir)) {
      return [];
    }

    // Recursively read all .json files in the notes directory
    const readNotesRecursive = (dir: string): void => {
      const entries = this.fs.readDir(dir);
      for (const entry of entries) {
        const fullPath = this.fs.join(dir, entry);

        // Check if it's a directory using the proper method
        const isDirectory = this.fs.isDirectory(fullPath);

        if (isDirectory) {
          // Recurse into the directory
          readNotesRecursive(fullPath);
        } else if (entry.endsWith('.json')) {
          try {
            const noteContent = this.fs.readFile(fullPath);
            const note = JSON.parse(noteContent) as StoredAnchoredNote;
            if (note && typeof note === 'object' && note.id) {
              notes.push({
                note,
                path: this.fs.relative(repositoryRootPath, fullPath),
              });
            }
          } catch (error) {
            // Skip invalid note files
            console.warn(`Failed to read note file ${fullPath}:`, error);
          }
        }
      }
    };

    readNotesRecursive(notesDir);
    return notes;
  }

  /**
   * Check for notes with stale anchors (files that no longer exist)
   */
  checkStaleAnchoredNotes(repositoryRootPath: ValidatedRepositoryPath): StaleAnchoredNote[] {
    const notesWithPaths = this.readAllNotes(repositoryRootPath);
    const staleNotes: StaleAnchoredNote[] = [];

    for (const noteWithPath of notesWithPaths) {
      const note = noteWithPath.note;
      const staleAnchors: string[] = [];
      const validAnchors: string[] = [];

      for (const anchor of note.anchors) {
        // Anchors are stored as relative paths to the repo root
        const anchorPath = this.fs.join(repositoryRootPath, anchor);

        if (this.fs.exists(anchorPath)) {
          validAnchors.push(anchor);
        } else {
          staleAnchors.push(anchor);
        }
      }

      // Only include notes that have at least one stale anchor
      if (staleAnchors.length > 0) {
        staleNotes.push({
          note,
          staleAnchors,
          validAnchors,
        });
      }
    }

    return staleNotes;
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate a note against repository configuration
   */
  validateNote(
    note: Omit<StoredAnchoredNote, 'id' | 'timestamp'>,
    repositoryRootPath: ValidatedRepositoryPath
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const config = this.getConfiguration(repositoryRootPath);

    // Check note length
    if (note.note.length > config.limits.noteMaxLength) {
      errors.push({
        type: 'noteTooLong',
        message: `Note is too long (${note.note.length} > ${config.limits.noteMaxLength})`,
        context: { actual: note.note.length, limit: config.limits.noteMaxLength },
      });
    }

    // Check tags count
    if (note.tags.length > config.limits.maxTagsPerNote) {
      errors.push({
        type: 'tooManyTags',
        message: `Too many tags (${note.tags.length} > ${config.limits.maxTagsPerNote})`,
        context: { actual: note.tags.length, limit: config.limits.maxTagsPerNote },
      });
    }

    // Check anchors count
    if (note.anchors.length > config.limits.maxAnchorsPerNote) {
      errors.push({
        type: 'tooManyAnchors',
        message: `Too many anchors (${note.anchors.length} > ${config.limits.maxAnchorsPerNote})`,
        context: { actual: note.anchors.length, limit: config.limits.maxAnchorsPerNote },
      });
    }

    // Check for missing anchors
    if (note.anchors.length === 0) {
      errors.push({
        type: 'missingAnchors',
        message: 'Notes must have at least one anchor',
        context: { actual: note.anchors.length },
      });
    }

    // Check for invalid anchor patterns (reject globs and wildcards)
    const invalidAnchors: string[] = [];
    const globPatterns = ['*', '?', '[', ']', '{', '}', '**'];

    for (const anchor of note.anchors) {
      // Check if anchor contains any glob pattern characters
      if (globPatterns.some((pattern) => anchor.includes(pattern))) {
        invalidAnchors.push(anchor);
      }

      // Also check for absolute paths (optional - you may want to keep this)
      if (anchor.startsWith('/')) {
        invalidAnchors.push(anchor);
      }
    }

    if (invalidAnchors.length > 0) {
      errors.push({
        type: 'invalidAnchor',
        message: `Invalid anchor paths detected. Anchors must be relative paths without glob patterns (*, ?, **, etc.). Invalid anchors: ${invalidAnchors.join(', ')}`,
        context: { invalidAnchors },
      });
    }

    // Check for invalid tags if enforcement is enabled
    if (config.tags?.enforceAllowedTags) {
      const allowedTags = this.getAllowedTags(repositoryRootPath);
      if (allowedTags.enforced && allowedTags.tags.length > 0) {
        const invalidTags = note.tags.filter((tag) => !allowedTags.tags.includes(tag));
        if (invalidTags.length > 0) {
          errors.push({
            type: 'invalidTags',
            message: `The following tags are not allowed: ${invalidTags.join(', ')}. Allowed tags: ${allowedTags.tags.join(', ')}`,
            context: { invalidTags, allowedTags: allowedTags.tags },
          });
        }
      }
    }

    return errors;
  }

  // ============================================================================
  // Tag Description Management
  // ============================================================================

  /**
   * Get all tag descriptions for a repository
   */
  getTagDescriptions(repositoryRootPath: ValidatedRepositoryPath): Record<string, string> {
    this.validateRepositoryRoot(repositoryRootPath);
    const tagsDir = this.getTagsDir(repositoryRootPath);
    const descriptions: Record<string, string> = {};

    if (!this.fs.exists(tagsDir)) {
      return descriptions;
    }

    try {
      const files = this.fs.readDir(tagsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const tagName = file.slice(0, -3); // Remove .md extension
          const filePath = this.fs.join(tagsDir, file);
          try {
            const content = this.fs.readFile(filePath);
            descriptions[tagName] = content.trim();
          } catch (error) {
            console.error(`Error reading tag description for ${tagName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error reading tags directory:', error);
    }

    return descriptions;
  }

  /**
   * Save a tag description
   */
  saveTagDescription(
    repositoryRootPath: ValidatedRepositoryPath,
    tag: string,
    description: string
  ): void {
    this.validateRepositoryRoot(repositoryRootPath);
    const config = this.getConfiguration(repositoryRootPath);

    // Check description length against tagDescriptionMaxLength
    if (description.length > config.limits.tagDescriptionMaxLength) {
      throw new Error(
        `Tag description exceeds maximum length of ${config.limits.tagDescriptionMaxLength} characters. ` +
          `Current length: ${description.length}`
      );
    }

    // Ensure tags directory exists
    const tagsDir = this.getTagsDir(repositoryRootPath);
    this.fs.createDir(tagsDir);

    // Write the description to a markdown file
    const tagFile = this.fs.join(tagsDir, `${tag}.md`);
    this.fs.writeFile(tagFile, description);
  }

  /**
   * Delete a tag description
   */
  deleteTagDescription(repositoryRootPath: ValidatedRepositoryPath, tag: string): boolean {
    this.validateRepositoryRoot(repositoryRootPath);
    const tagsDir = this.getTagsDir(repositoryRootPath);
    const tagFile = this.fs.join(tagsDir, `${tag}.md`);

    if (this.fs.exists(tagFile)) {
      try {
        this.fs.deleteFile(tagFile);
        return true;
      } catch (error) {
        console.warn(`Failed to delete tag description for ${tag}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Remove a tag from all notes in the repository
   */
  removeTagFromNotes(repositoryRootPath: ValidatedRepositoryPath, tag: string): number {
    this.validateRepositoryRoot(repositoryRootPath);
    const notesWithPaths = this.readAllNotes(repositoryRootPath);
    let modifiedCount = 0;

    for (const noteWithPath of notesWithPaths) {
      const note = noteWithPath.note;
      if (note.tags.includes(tag)) {
        // Remove the tag from the note
        note.tags = note.tags.filter((t: string) => t !== tag);
        // Save the updated note - reconstruct the note path from the ID and timestamp
        const notePath = this.getNotePath(repositoryRootPath, note.id, note.timestamp);
        this.fs.writeFile(notePath, JSON.stringify(note, null, 2));
        modifiedCount++;
      }
    }

    return modifiedCount;
  }

  /**
   * Replace a tag with another tag in all notes in the repository
   */
  replaceTagInNotes(
    repositoryRootPath: ValidatedRepositoryPath,
    oldTag: string,
    newTag: string
  ): number {
    this.validateRepositoryRoot(repositoryRootPath);
    const notesWithPaths = this.readAllNotes(repositoryRootPath);
    let modifiedCount = 0;

    for (const noteWithPath of notesWithPaths) {
      const note = noteWithPath.note;
      if (note.tags.includes(oldTag)) {
        // Replace the old tag with the new tag
        note.tags = note.tags.map((t: string) => (t === oldTag ? newTag : t));
        // Remove duplicates if the new tag was already present
        note.tags = [...new Set(note.tags)];
        // Save the updated note - reconstruct the note path from the ID and timestamp
        const notePath = this.getNotePath(repositoryRootPath, note.id, note.timestamp);
        this.fs.writeFile(notePath, JSON.stringify(note, null, 2));
        modifiedCount++;
      }
    }

    return modifiedCount;
  }

  /**
   * Get all used tags for a path
   */
  getUsedTagsForPath(targetPath: ValidatedRepositoryPath): string[] {
    const rootPath = '' as ValidatedRelativePath;
    const notes = this.getNotesForPath(targetPath, rootPath, true);
    const counts = new Map<string, number>();
    for (const n of notes) {
      for (const tag of n.note.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }

  /**
   * Get all tags with their descriptions (tags that have description files)
   */
  getTagsWithDescriptions(repositoryRootPath: ValidatedRepositoryPath): TagInfo[] {
    const descriptions = this.getTagDescriptions(repositoryRootPath);
    const tags: TagInfo[] = [];

    // Return all tags that have descriptions (these are the available/allowed tags)
    for (const [name, description] of Object.entries(descriptions)) {
      tags.push({ name, description });
    }

    return tags;
  }

  /**
   * Get repository guidance
   */
  getRepositoryGuidance(repositoryPath: ValidatedRepositoryPath): string | null {
    try {
      this.validateRepositoryRoot(repositoryPath);
      const guidanceFile = this.fs.join(repositoryPath, '.a24z', 'note-guidance.md');

      // Try to read repository-specific guidance first
      if (this.fs.exists(guidanceFile)) {
        return this.fs.readFile(guidanceFile);
      }

      // Note: Default template would need to be handled differently in pure-core
      // For now, return null if no custom guidance exists
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get allowed tags configuration
   */
  getAllowedTags(repositoryPath: ValidatedRepositoryPath): { enforced: boolean; tags: string[] } {
    this.validateRepositoryRoot(repositoryPath);
    const config = this.getConfiguration(repositoryPath);
    const enforced = config.tags?.enforceAllowedTags || false;

    if (enforced) {
      // Auto-populate from tags directory
      const tagDescriptions = this.getTagDescriptions(repositoryPath);
      const tags = Object.keys(tagDescriptions);
      return { enforced, tags };
    }

    return { enforced, tags: [] };
  }

  // ============================================================================
  // Note Review System
  // ============================================================================

  /**
   * Get all unreviewed notes for a repository path
   */
  getUnreviewedNotes(repositoryPath: ValidatedRepositoryPath): StoredAnchoredNote[] {
    const rootPath = '' as ValidatedRelativePath;
    const notes = this.getNotesForPath(repositoryPath, rootPath, true);
    return notes.map((n) => n.note).filter((note) => !note.reviewed);
  }

  /**
   * Mark a note as reviewed by its ID
   */
  markNoteReviewed(repositoryPath: ValidatedRepositoryPath, noteId: string): boolean {
    this.validateRepositoryRoot(repositoryPath);
    const note = this.getNoteById(repositoryPath, noteId);

    if (!note) {
      return false;
    }

    // Update the reviewed flag
    note.reviewed = true;

    // Write the updated note back to its file
    const notePath = this.getNotePath(repositoryPath, note.id, note.timestamp);
    this.fs.writeFile(notePath, JSON.stringify(note, null, 2));

    return true;
  }

  /**
   * Mark all notes as reviewed for a given path
   */
  markAllNotesReviewed(repositoryPath: ValidatedRepositoryPath): number {
    this.validateRepositoryRoot(repositoryPath);
    const rootPath = '' as ValidatedRelativePath;
    const notes = this.getNotesForPath(repositoryPath, rootPath, true);

    let count = 0;
    for (const noteWithPath of notes) {
      const note = noteWithPath.note;
      if (!note.reviewed) {
        note.reviewed = true;
        const notePath = this.getNotePath(repositoryPath, note.id, note.timestamp);
        this.fs.writeFile(notePath, JSON.stringify(note, null, 2));
        count++;
      }
    }

    return count;
  }

  // ============================================================================
  // Note Operations
  // ============================================================================

  /**
   * Merge multiple notes into a single consolidated note
   */
  mergeNotes(
    repositoryPath: ValidatedRepositoryPath,
    input: {
      note: string;
      anchors: string[];
      tags: string[];
      metadata?: Record<string, unknown>;
      noteIds: string[];
      codebaseViewId: string;
      deleteOriginals?: boolean;
    }
  ): {
    mergedNote: StoredAnchoredNote;
    deletedCount: number;
  } {
    this.validateRepositoryRoot(repositoryPath);

    // Create the merged note with metadata about the merge
    const mergedNoteData: SaveNoteInput = {
      note: input.note,
      directoryPath: repositoryPath,
      anchors: [...new Set(input.anchors)], // Deduplicate anchors
      tags: [...new Set(input.tags)], // Deduplicate tags
      codebaseViewId: input.codebaseViewId,
      metadata: {
        ...input.metadata,
        mergedFrom: input.noteIds,
        mergedAt: new Date().toISOString(),
      },
    };

    const savedNote = this.saveNote(mergedNoteData);

    let deletedCount = 0;
    if (input.deleteOriginals !== false) {
      // Default to true
      for (const noteId of input.noteIds) {
        if (this.deleteNoteById(repositoryPath, noteId)) {
          deletedCount++;
        }
      }
    }

    return {
      mergedNote: savedNote.note,
      deletedCount,
    };
  }

  /**
   * Get notes for a path with count limit
   * Note: Token limiting requires external dependencies and is not supported in pure-core
   */
  getNotesForPathWithLimit(
    targetPath: ValidatedRepositoryPath,
    includeParentNotes: boolean,
    limitType: 'count',
    limit: number
  ): {
    notes: AnchoredNoteWithPath[];
  } {
    // Get all notes first
    const rootPath = '' as ValidatedRelativePath;
    const allNotes = this.getNotesForPath(targetPath, rootPath, includeParentNotes);

    // Apply count-based limiting
    const results = allNotes.slice(0, Math.max(1, limit));
    return { notes: results };
  }
}
