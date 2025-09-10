/**
 * MemoryPalace - Central API for all a24z-Memory operations
 *
 * This class provides a unified interface for managing notes, views, and configurations.
 * Tools should use this class instead of directly accessing stores.
 */

import { FileSystemAdapter } from './pure-core/abstractions/filesystem';
import { AnchoredNotesStore, StaleAnchoredNote } from './pure-core/stores/AnchoredNotesStore';
import { CodebaseViewsStore } from './pure-core/stores/CodebaseViewsStore';
import { A24zConfigurationStore } from './pure-core/stores/A24zConfigurationStore';
import { generateFullGuidanceContent, GuidanceContent } from './pure-core/utils/guidanceGenerator';
import {
  CodebaseViewValidator,
  ValidationResult,
} from './pure-core/validation/CodebaseViewValidator';
import type {
  StoredAnchoredNote,
  AnchoredNoteWithPath,
  MemoryPalaceConfiguration,
  CodebaseView,
  ValidatedRepositoryPath,
  ValidatedRelativePath,
} from './pure-core/types';
import type { ValidatedAlexandriaPath } from './pure-core/types/repository';

export interface SaveNoteOptions {
  note: string;
  tags: string[];
  anchors: string[];
  metadata?: Record<string, unknown>;
  codebaseViewId?: string;
}

export interface CoverageReport {
  totalNotes: number;
  staleNotesCount: number;
  message: string;
}

/**
 * Central access point for all memory operations
 */
export class MemoryPalace {
  private notesStore: AnchoredNotesStore;
  private viewsStore: CodebaseViewsStore;
  private configStore: A24zConfigurationStore;
  private validator: CodebaseViewValidator;
  private repositoryRoot: ValidatedRepositoryPath;
  private fs: FileSystemAdapter;

  constructor(repositoryRoot: string, fileSystem: FileSystemAdapter) {
    this.fs = fileSystem;
    this.repositoryRoot = MemoryPalace.validateRepositoryPath(fileSystem, repositoryRoot);
    const alexandriaPath = MemoryPalace.getAlexandriaPath(this.repositoryRoot, fileSystem);

    // Initialize stores with the validated Alexandria path
    this.notesStore = new AnchoredNotesStore(fileSystem, alexandriaPath);
    this.viewsStore = new CodebaseViewsStore(fileSystem, alexandriaPath);
    this.configStore = new A24zConfigurationStore(fileSystem, alexandriaPath);
    this.validator = new CodebaseViewValidator(fileSystem);
  }

  /**
   * Get the Alexandria data directory path (.alexandria or .a24z)
   * Checks for existing directories and creates if needed
   */
  static getAlexandriaPath(
    repositoryPath: ValidatedRepositoryPath,
    fs: FileSystemAdapter
  ): ValidatedAlexandriaPath {
    const alexandriaPath = fs.join(repositoryPath, '.alexandria');
    const legacyPath = fs.join(repositoryPath, '.a24z');

    // Check if legacy exists
    if (fs.exists(legacyPath)) {
      // For now, continue using legacy if it exists
      // TODO: In future, we could migrate from .a24z to .alexandria here
      return legacyPath as ValidatedAlexandriaPath;
    }

    // Check if alexandria exists
    if (fs.exists(alexandriaPath)) {
      return alexandriaPath as ValidatedAlexandriaPath;
    }

    // Neither exists, create the new standard (.alexandria)
    try {
      fs.createDir(alexandriaPath);
      return alexandriaPath as ValidatedAlexandriaPath;
    } catch {
      // If we can't create .alexandria, try .a24z for compatibility
      try {
        fs.createDir(legacyPath);
        return legacyPath as ValidatedAlexandriaPath;
      } catch {
        throw new Error(
          `Cannot create Alexandria data directory. ` +
            `Tried both ${alexandriaPath} and ${legacyPath}. ` +
            `Make sure the repository path is writable.`
        );
      }
    }
  }

  /**
   * Validate a repository path and return a branded type.
   * This is the single point of path validation for the entire system.
   * Can be used to validate paths before creating MemoryPalace instances.
   */
  static validateRepositoryPath(fs: FileSystemAdapter, path: string): ValidatedRepositoryPath {
    // Validate that path is absolute
    if (!fs.isAbsolute(path)) {
      throw new Error(
        `❌ directoryPath must be an absolute path starting with '/'. ` +
          `Received: "${path}". ` +
          `💡 Tip: Use absolute paths like /Users/username/projects/my-repo or /home/user/project. ` +
          `You can get the current working directory and build the absolute path from there.`
      );
    }

    // Validate that path exists
    if (!fs.exists(path)) {
      throw new Error(
        `❌ directoryPath must point to an existing directory. ` +
          `Path does not exist: "${path}". ` +
          `Check your current working directory and build the correct absolute path.`
      );
    }

    // Validate that it's a directory
    if (!fs.isDirectory(path)) {
      throw new Error(
        `❌ directoryPath must point to a directory, not a file. ` + `Received: "${path}"`
      );
    }

    // Try to find a git repository root from this path
    try {
      const repoRoot = fs.findProjectRoot(path);
      if (repoRoot !== path) {
        throw new Error(
          `❌ directoryPath must be the git repository root, not a subdirectory. ` +
            `Received: "${path}", but repository root is: "${repoRoot}". ` +
            `💡 Tip: Navigate to the repository root directory that contains the .git folder.`
        );
      }
    } catch {
      throw new Error(
        `❌ directoryPath must be a git repository root containing a .git directory. ` +
          `Path: "${path}" is not a git repository. ` +
          `💡 Tip: Initialize a git repository with 'git init' in your project root, or navigate to an existing git repository. ` +
          `Repository roots contain a .git directory and serve as the base for all note storage.`
      );
    }

    // Return the branded type
    return path as ValidatedRepositoryPath;
  }

  /**
   * Validate that a target path is within a repository and return a clean relative path.
   * This ensures the target path is safe and properly formatted.
   */
  static validateRelativePath(
    repositoryRoot: ValidatedRepositoryPath,
    targetPath: string,
    fs: FileSystemAdapter
  ): ValidatedRelativePath {
    // Ensure targetPath is absolute
    if (!fs.isAbsolute(targetPath)) {
      throw new Error(
        `❌ targetPath must be an absolute path starting with '/'. ` +
          `Received: "${targetPath}". ` +
          `💡 Tip: Use absolute paths like /Users/username/projects/my-repo/src/file.ts`
      );
    }

    // Get relative path
    const relativePath = fs.relative(repositoryRoot, targetPath);

    // Ensure targetPath is within repositoryRoot (not outside with ../)
    if (relativePath.startsWith('../') || relativePath === '..' || relativePath.includes('..')) {
      throw new Error(
        `❌ targetPath "${targetPath}" is not within repository root "${repositoryRoot}". ` +
          `Target paths must be within the repository.`
      );
    }

    // Clean up the relative path - remove './' prefix if present
    const cleanPath = relativePath.startsWith('./') ? relativePath.slice(2) : relativePath;

    // Handle root case - if target is the repository root, return empty string
    const finalPath = cleanPath === '.' ? '' : cleanPath;

    return finalPath as ValidatedRelativePath;
  }

  /**
   * Get notes for any path by discovering the repository root.
   * This is a migration helper for code that needs repository discovery.
   * @param anyPath - Any path within a repository
   * @param fileSystem - FileSystemAdapter instance
   * @param includeParentNotes - Whether to include notes from parent directories
   * @returns Array of notes or empty array if no repository found
   */
  static getNotesForPath(
    anyPath: string,
    fileSystem: FileSystemAdapter,
    includeParentNotes = true
  ): AnchoredNoteWithPath[] {
    // Walk up the directory tree to find .a24z directory
    let currentPath = anyPath;

    while (currentPath && currentPath !== '/' && currentPath !== fileSystem.dirname(currentPath)) {
      if (fileSystem.exists(fileSystem.join(currentPath, '.a24z'))) {
        // Found repository root - create instance and get notes for the specific path
        try {
          const validatedRepoPath = MemoryPalace.validateRepositoryPath(fileSystem, currentPath);
          const validatedRelativePath = MemoryPalace.validateRelativePath(
            validatedRepoPath,
            anyPath,
            fileSystem
          );
          const memoryPalace = new MemoryPalace(validatedRepoPath, fileSystem);
          return memoryPalace.notesStore.getNotesForPath(
            validatedRepoPath,
            validatedRelativePath,
            includeParentNotes
          );
        } catch {
          return []; // Validation failed
        }
      }
      currentPath = fileSystem.dirname(currentPath);
    }

    return []; // No repository found
  }

  /**
   * Get a specific note by ID
   */
  getNoteById(noteId: string): StoredAnchoredNote | null {
    return this.notesStore.getNoteById(this.repositoryRoot, noteId);
  }

  /**
   * Delete a note by ID
   */
  deleteNoteById(noteId: string): boolean {
    return this.notesStore.deleteNoteById(this.repositoryRoot, noteId);
  }

  /**
   * Get all notes for this repository
   */
  getNotes(includeParentNotes = true): AnchoredNoteWithPath[] {
    // Get all notes from the repository root (empty string = repository root)
    const rootPath = '' as ValidatedRelativePath; // Root is represented as empty string
    return this.notesStore.getNotesForPath(this.repositoryRoot, rootPath, includeParentNotes);
  }

  /**
   * Check for stale anchored notes (anchors pointing to non-existent files)
   */
  getStaleNotes(): StaleAnchoredNote[] {
    return this.notesStore.checkStaleAnchoredNotes(this.repositoryRoot);
  }

  /**
   * Save a new note to the repository
   * Returns the saved note
   */
  saveNote(options: SaveNoteOptions): AnchoredNoteWithPath {
    return this.notesStore.saveNote({
      note: options.note,
      anchors: options.anchors,
      tags: options.tags,
      codebaseViewId: options.codebaseViewId || 'default',
      metadata: options.metadata || {},
      directoryPath: this.repositoryRoot,
    });
  }

  /**
   * Get repository configuration
   */
  getConfiguration(): MemoryPalaceConfiguration {
    return this.notesStore.getConfiguration();
  }

  /**
   * Get tag descriptions
   */
  getTagDescriptions(): Record<string, string> {
    return this.notesStore.getTagDescriptions();
  }

  /**
   * Get all used tags in the repository
   */
  getUsedTags(): string[] {
    return this.notesStore.getUsedTagsForPath(this.repositoryRoot);
  }

  /**
   * Get repository guidance content
   */
  getGuidance(): string | null {
    return this.notesStore.getRepositoryGuidance(this.repositoryRoot);
  }

  /**
   * Generate full guidance content with configuration
   */
  getFullGuidance(): GuidanceContent {
    const guidance = this.getGuidance();
    const configuration = this.getConfiguration();
    const tagDescriptions = this.getTagDescriptions();
    return generateFullGuidanceContent(guidance, configuration, tagDescriptions);
  }

  /**
   * Get basic coverage information (deprecated - returns minimal info)
   */
  getCoverageReport(): CoverageReport {
    // This is deprecated - just return basic stats
    const notes = this.getNotes(true);
    const staleNotes = this.getStaleNotes();

    return {
      totalNotes: notes.length,
      staleNotesCount: staleNotes.length,
      message: 'Coverage reports are deprecated. Use getNotes() for note information.',
    };
  }

  /**
   * List all codebase views
   */
  listViews(): CodebaseView[] {
    return this.viewsStore.listViews(this.repositoryRoot);
  }

  /**
   * Get a specific codebase view by ID
   */
  getView(viewId: string): CodebaseView | null {
    return this.viewsStore.getView(this.repositoryRoot, viewId);
  }

  /**
   * Save a codebase view
   */
  saveView(view: CodebaseView): void {
    return this.viewsStore.saveView(this.repositoryRoot, view);
  }

  /**
   * Validate a codebase view
   */
  validateView(view: CodebaseView): ValidationResult {
    return this.validator.validate(this.repositoryRoot, view);
  }

  /**
   * Save a codebase view with validation
   * Always saves the view (even if invalid) but provides validation feedback
   */
  saveViewWithValidation(view: CodebaseView): ValidationResult {
    // Validate and get potentially modified view (e.g., scope removal)
    const validationResult = this.validator.validate(this.repositoryRoot, view);

    // Add default version if missing
    let viewToSave = validationResult.validatedView;
    if (!viewToSave.version) {
      viewToSave = {
        ...viewToSave,
        version: '1.0.0',
      };
    }

    // Add timestamp if missing
    if (!viewToSave.timestamp) {
      viewToSave = {
        ...viewToSave,
        timestamp: new Date().toISOString(),
      };
    }

    // Always save the view, regardless of validation results
    this.viewsStore.saveView(this.repositoryRoot, viewToSave);

    return {
      ...validationResult,
      validatedView: viewToSave,
    };
  }

  /**
   * Replace a tag across all notes
   */
  replaceTagInNotes(oldTag: string, newTag: string): number {
    return this.notesStore.replaceTagInNotes(this.repositoryRoot, oldTag, newTag);
  }

  /**
   * Save a tag description
   */
  saveTagDescription(tag: string, description: string): void {
    return this.notesStore.saveTagDescription(tag, description);
  }

  /**
   * Delete a tag description
   */
  deleteTagDescription(tag: string): boolean {
    return this.notesStore.deleteTagDescription(tag);
  }

  /**
   * Remove a tag from all notes
   */
  removeTagFromNotes(tag: string): number {
    return this.notesStore.removeTagFromNotes(this.repositoryRoot, tag);
  }
}
