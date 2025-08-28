import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeRepositoryPath } from '../utils/pathNormalization';
import {
  ValidationMessageFormatter,
  ValidationMessageData,
  loadValidationMessages,
} from '../validation/messages';
import {
  filterNotesByTokenLimit,
  getTokenLimitInfo,
  type TokenLimitInfo,
} from '../utils/tokenCounter';

export { TokenLimitInfo } from '../utils/tokenCounter';

export type NoteConfidence = 'high' | 'medium' | 'low';
export type NoteType = 'decision' | 'pattern' | 'gotcha' | 'explanation';

export interface StoredNote {
  id: string;
  note: string;
  anchors: string[];
  tags: string[];
  confidence: NoteConfidence;
  type: NoteType;
  metadata: Record<string, unknown>;
  timestamp: number;
  reviewed?: boolean;
  guidanceToken?: string;
}

export interface RepositoryConfiguration {
  version: number;
  limits: {
    noteMaxLength: number;
    maxTagsPerNote: number;
    maxAnchorsPerNote: number;
    tagDescriptionMaxLength: number; // Maximum length for tag description markdown files
  };
  storage: {
    backupOnMigration: boolean;
    compressionEnabled: boolean;
  };
  tags?: {
    enforceAllowedTags?: boolean; // Whether to enforce allowed tags (based on tag descriptions)
  };
  types?: {
    enforceAllowedTypes?: boolean; // Whether to enforce allowed types (based on type descriptions)
  };
}

export interface ValidationError {
  field: string;
  message: string;
  limit?: number;
  actual?: number;
  type?: keyof ValidationMessageData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any; // Dynamic validation data shape varies by error type
}

interface NotesFileSchema {
  version: number;
  notes: StoredNote[];
}

function getRepositoryDataDir(repositoryPath: string): string {
  // Always use repository-specific directory
  return path.join(repositoryPath, '.a24z');
}

function getNotesFile(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'repository-notes.json');
}

function getNotesDir(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'notes');
}

function getNoteFilePath(repositoryPath: string, noteId: string, timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const noteDir = path.join(getNotesDir(repositoryPath), year.toString(), month);
  return path.join(noteDir, `${noteId}.json`);
}

function ensureNotesDir(repositoryPath: string, timestamp: number): void {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const noteDir = path.join(getNotesDir(repositoryPath), year.toString(), month);
  if (!fs.existsSync(noteDir)) {
    fs.mkdirSync(noteDir, { recursive: true });
  }
}

function getGuidanceFile(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'note-guidance.md');
}

function getConfigurationFile(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'configuration.json');
}

function getDefaultConfiguration(): RepositoryConfiguration {
  return {
    version: 1,
    limits: {
      noteMaxLength: 10000,
      maxTagsPerNote: 10,
      maxAnchorsPerNote: 20,
      tagDescriptionMaxLength: 2000, // 2KB limit for tag description markdown files
    },
    storage: {
      backupOnMigration: true,
      compressionEnabled: false,
    },
    tags: {
      enforceAllowedTags: false, // Disabled by default
    },
    types: {
      enforceAllowedTypes: false, // Disabled by default
    },
  };
}

function readConfiguration(repositoryPath: string): RepositoryConfiguration {
  try {
    const configFile = getConfigurationFile(repositoryPath);
    if (!fs.existsSync(configFile)) {
      const defaultConfig = getDefaultConfiguration();
      writeConfiguration(repositoryPath, defaultConfig);
      return defaultConfig;
    }

    const raw = fs.readFileSync(configFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RepositoryConfiguration>;

    // Merge with defaults to handle missing properties
    const defaultConfig = getDefaultConfiguration();
    const mergedConfig: RepositoryConfiguration = {
      version: parsed.version || defaultConfig.version,
      limits: {
        ...defaultConfig.limits,
        ...parsed.limits,
      },
      storage: {
        ...defaultConfig.storage,
        ...parsed.storage,
      },
      tags: {
        ...defaultConfig.tags,
        ...parsed.tags,
      },
      types: {
        ...defaultConfig.types,
        ...parsed.types,
      },
    };

    return mergedConfig;
  } catch {
    return getDefaultConfiguration();
  }
}

function writeConfiguration(repositoryPath: string, config: RepositoryConfiguration): void {
  const configFile = getConfigurationFile(repositoryPath);
  ensureDataDir(repositoryPath);
  const tmp = `${configFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { encoding: 'utf8' });
  fs.renameSync(tmp, configFile);
}

function validateNote(
  note: Omit<StoredNote, 'id' | 'timestamp'>,
  config: RepositoryConfiguration,
  normalizedRepo: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Create message formatter with any custom overrides
  const customMessages = loadValidationMessages(normalizedRepo);
  const formatter = new ValidationMessageFormatter(customMessages || undefined);

  // Validate anchors are present
  if (!note.anchors || !Array.isArray(note.anchors) || note.anchors.length === 0) {
    const data: ValidationMessageData['missingAnchors'] = { actual: 0 };
    errors.push({
      field: 'anchors',
      type: 'missingAnchors',
      data,
      message: formatter.format('missingAnchors', data),
      actual: 0,
    });
  }

  // Validate note length
  if (note.note.length > config.limits.noteMaxLength) {
    const overBy = note.note.length - config.limits.noteMaxLength;
    const percentage = Math.round((note.note.length / config.limits.noteMaxLength) * 100);
    const data: ValidationMessageData['noteTooLong'] = {
      actual: note.note.length,
      limit: config.limits.noteMaxLength,
      overBy,
      percentage,
    };
    errors.push({
      field: 'note',
      type: 'noteTooLong',
      data,
      message: formatter.format('noteTooLong', data),
      limit: config.limits.noteMaxLength,
      actual: note.note.length,
    });
  }

  // Validate number of tags
  if (note.tags.length > config.limits.maxTagsPerNote) {
    const data: ValidationMessageData['tooManyTags'] = {
      actual: note.tags.length,
      limit: config.limits.maxTagsPerNote,
    };
    errors.push({
      field: 'tags',
      type: 'tooManyTags',
      data,
      message: formatter.format('tooManyTags', data),
      limit: config.limits.maxTagsPerNote,
      actual: note.tags.length,
    });
  }

  // Validate against allowed tags if configured (based on tag descriptions)
  if (config.tags?.enforceAllowedTags) {
    const tagDescriptions = getTagDescriptions(normalizedRepo);
    const allowedTags = Object.keys(tagDescriptions);
    if (allowedTags.length > 0) {
      const invalidTags = note.tags.filter((tag) => !allowedTags.includes(tag));
      if (invalidTags.length > 0) {
        const data: ValidationMessageData['invalidTags'] = {
          invalidTags,
          allowedTags,
        };
        errors.push({
          field: 'tags',
          type: 'invalidTags',
          data,
          message: formatter.format('invalidTags', data),
        });
      }
    }
  }

  // Validate against allowed types if configured (based on type descriptions)
  if (config.types?.enforceAllowedTypes) {
    const typeDescriptions = getTypeDescriptions(normalizedRepo);
    const allowedTypes = Object.keys(typeDescriptions);
    if (allowedTypes.length > 0 && !allowedTypes.includes(note.type)) {
      const data: ValidationMessageData['invalidType'] = {
        type: note.type,
        allowedTypes,
      };
      errors.push({
        field: 'type',
        type: 'invalidType',
        data,
        message: formatter.format('invalidType', data),
      });
    }
  }

  // Validate number of anchors (only if anchors exist)
  if (note.anchors && note.anchors.length > config.limits.maxAnchorsPerNote) {
    const data: ValidationMessageData['tooManyAnchors'] = {
      actual: note.anchors.length,
      limit: config.limits.maxAnchorsPerNote,
    };
    errors.push({
      field: 'anchors',
      type: 'tooManyAnchors',
      data,
      message: formatter.format('tooManyAnchors', data),
      limit: config.limits.maxAnchorsPerNote,
      actual: note.anchors.length,
    });
  }

  // Validate that anchors don't escape the repository
  if (note.anchors) {
    for (const anchor of note.anchors) {
      // Skip validation for absolute paths - they'll be checked later
      if (path.isAbsolute(anchor)) {
        continue;
      }

      // Check for path traversal attempts
      const resolved = path.resolve(normalizedRepo, anchor);
      if (!resolved.startsWith(normalizedRepo + path.sep) && resolved !== normalizedRepo) {
        const data: ValidationMessageData['anchorOutsideRepo'] = { anchor };
        errors.push({
          field: 'anchors',
          type: 'anchorOutsideRepo',
          data,
          message: formatter.format('anchorOutsideRepo', data),
        });
      }
    }
  }

  return errors;
}

function ensureDataDir(repositoryPath: string): void {
  const dataDir = getRepositoryDataDir(repositoryPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readAllNotesFromLegacyFile(repositoryPath: string): StoredNote[] {
  try {
    const notesFile = getNotesFile(repositoryPath);
    if (!fs.existsSync(notesFile)) {
      return [];
    }
    const raw = fs.readFileSync(notesFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<NotesFileSchema>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.notes)) {
      return [];
    }
    return parsed.notes as StoredNote[];
  } catch {
    return [];
  }
}

export function readAllNotes(repositoryPath: string): StoredNote[] {
  try {
    ensureDataDir(repositoryPath);
    const notesDir = getNotesDir(repositoryPath);

    // Check if migration is needed
    const legacyFile = getNotesFile(repositoryPath);
    if (fs.existsSync(legacyFile)) {
      migrateNotesToFiles(repositoryPath);
    }

    // Read all notes from individual files
    const notes: StoredNote[] = [];

    if (!fs.existsSync(notesDir)) {
      return [];
    }

    // Recursively read all .json files in the notes directory
    const readNotesRecursive = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          readNotesRecursive(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const noteContent = fs.readFileSync(fullPath, 'utf8');
            const note = JSON.parse(noteContent) as StoredNote;
            if (note && typeof note === 'object' && note.id) {
              notes.push(note);
            }
          } catch {
            // Skip invalid note files
          }
        }
      }
    };

    readNotesRecursive(notesDir);
    return notes;
  } catch {
    return [];
  }
}

function writeNoteToFile(repositoryPath: string, note: StoredNote): void {
  ensureNotesDir(repositoryPath, note.timestamp);
  const notePath = getNoteFilePath(repositoryPath, note.id, note.timestamp);
  const tmp = `${notePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(note, null, 2), { encoding: 'utf8' });
  fs.renameSync(tmp, notePath);
}

export function deleteNoteFile(repositoryPath: string, note: StoredNote): void {
  const notePath = getNoteFilePath(repositoryPath, note.id, note.timestamp);
  if (fs.existsSync(notePath)) {
    fs.unlinkSync(notePath);
  }
}

function migrateNotesToFiles(repositoryPath: string): void {
  const legacyFile = getNotesFile(repositoryPath);
  if (!fs.existsSync(legacyFile)) {
    return;
  }

  try {
    const legacyNotes = readAllNotesFromLegacyFile(repositoryPath);

    // Write each note to its own file
    for (const note of legacyNotes) {
      writeNoteToFile(repositoryPath, note);
    }

    // Backup and remove the legacy file
    const backupPath = `${legacyFile}.backup-${Date.now()}`;
    fs.renameSync(legacyFile, backupPath);
  } catch (error) {
    console.error('Failed to migrate notes to individual files:', error);
  }
}

export function saveNote(
  note: Omit<StoredNote, 'id' | 'timestamp'> & { directoryPath: string }
): StoredNote {
  // Validate that directoryPath is absolute
  if (!path.isAbsolute(note.directoryPath)) {
    throw new Error(
      `directoryPath must be an absolute path to a git repository root. ` +
        `Received relative path: "${note.directoryPath}". ` +
        `Please provide the full absolute path to the repository root directory.`
    );
  }

  // Validate that directoryPath exists
  if (!fs.existsSync(note.directoryPath)) {
    throw new Error(
      `directoryPath does not exist: "${note.directoryPath}". ` +
        `Please provide a valid absolute path to an existing git repository root.`
    );
  }

  // Validate that directoryPath is a git repository root (has .git directory)
  const gitDir = path.join(note.directoryPath, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new Error(
      `directoryPath is not a git repository root: "${note.directoryPath}". ` +
        `The directory must contain a .git folder. ` +
        `Please provide the absolute path to the root of your git repository.`
    );
  }

  const repoRoot = note.directoryPath; // Use the validated path directly
  const originalDirPath = note.directoryPath;

  // Load configuration and validate the note
  const config = readConfiguration(repoRoot);
  // Extract note data without directoryPath for validation
  const noteWithoutDirectoryPath = {
    note: note.note,
    anchors: note.anchors,
    tags: note.tags,
    confidence: note.confidence,
    type: note.type,
    metadata: note.metadata,
    reviewed: note.reviewed,
    guidanceToken: note.guidanceToken,
  };

  // Validate the note before processing
  const validationErrors = validateNote(noteWithoutDirectoryPath, config, repoRoot);
  if (validationErrors.length > 0) {
    const errorMessages = validationErrors.map((err) => err.message).join('; ');
    throw new Error(`Note validation failed: ${errorMessages}`);
  }

  // Validate that anchors exist and are not empty
  if (!note.anchors || !Array.isArray(note.anchors) || note.anchors.length === 0) {
    throw new Error('Note validation failed: At least one anchor path is required');
  }

  // Normalize anchors to be relative paths to the repository root
  const normalizedAnchors = note.anchors.map((anchor) => {
    let resolved: string;

    // If anchor is already absolute
    if (path.isAbsolute(anchor)) {
      resolved = anchor;
    } else if (anchor.startsWith('./') || anchor.startsWith('../')) {
      // Anchors starting with ./ or ../ are relative to the original directoryPath
      // Resolve them first
      resolved = path.resolve(originalDirPath, anchor);
    } else {
      // Already relative to repo root
      resolved = path.resolve(repoRoot, anchor);
    }

    // Validate that the resolved path is within the repository
    if (!resolved.startsWith(repoRoot + path.sep) && resolved !== repoRoot) {
      throw new Error(
        `Anchor "${anchor}" references a path outside the repository. ` +
          `All anchors must be within the repository root.`
      );
    }

    // Convert to relative path from repo root
    return path.relative(repoRoot, resolved);
  });

  const saved: StoredNote = {
    ...noteWithoutDirectoryPath,
    anchors: normalizedAnchors, // Use normalized anchors
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    timestamp: Date.now(),
    reviewed:
      noteWithoutDirectoryPath.reviewed !== undefined ? noteWithoutDirectoryPath.reviewed : false,
  };

  // Write the note to its own file
  writeNoteToFile(repoRoot, saved);
  return saved;
}

export interface NotesResult {
  notes: Array<StoredNote & { isParentDirectory: boolean; pathDistance: number }>;
  tokenInfo?: TokenLimitInfo;
}

/**
 * Get all notes for a path without any limits
 */
export function getNotesForPath(
  targetPath: string,
  includeParentNotes: boolean
): Array<StoredNote & { isParentDirectory: boolean; pathDistance: number }> {
  // Resolve the path to absolute
  const normalized = path.resolve(targetPath);

  // Use the resolved path for finding the repository
  const normalizedRepo = normalizeRepositoryPath(normalized);

  // Convert the query path to be relative to the repo root for comparison
  const queryRelative = path.relative(normalizedRepo, normalized);

  const all = readAllNotes(normalizedRepo);
  return all
    .map((n: StoredNote) => {
      const base = normalizedRepo;
      let isParent = false;

      const matchesAnchor = n.anchors.some((anchor: string) => {
        return (
          queryRelative === anchor ||
          queryRelative.startsWith(`${anchor}${path.sep}`) ||
          anchor.startsWith(`${queryRelative}${path.sep}`)
        );
      });

      const queryInDirectory = normalized === base || normalized.startsWith(`${base}${path.sep}`);

      if (matchesAnchor) {
        isParent = false;
      } else if (queryInDirectory) {
        isParent = true;
      } else {
        return null;
      }

      const distance = matchesAnchor
        ? 0
        : isParent
          ? normalized.replace(base, '').split(path.sep).filter(Boolean).length
          : 9999;
      return { ...n, isParentDirectory: isParent, pathDistance: distance };
    })
    .filter(
      (x): x is StoredNote & { isParentDirectory: boolean; pathDistance: number } => x !== null
    )
    .filter((x: StoredNote & { isParentDirectory: boolean; pathDistance: number }) =>
      includeParentNotes ? true : !x.isParentDirectory
    )
    .sort(
      (
        a: StoredNote & { isParentDirectory: boolean; pathDistance: number },
        b: StoredNote & { isParentDirectory: boolean; pathDistance: number }
      ) => a.pathDistance - b.pathDistance || b.timestamp - a.timestamp
    );
}

/**
 * Get notes for a path with specified limits
 */
export function getNotesForPathWithLimit(
  targetPath: string,
  includeParentNotes: boolean,
  limitType: 'count' | 'tokens',
  limit: number
): NotesResult {
  // Get all notes first
  const allNotes = getNotesForPath(targetPath, includeParentNotes);

  // Apply limit based on type
  let results: Array<StoredNote & { isParentDirectory: boolean; pathDistance: number }>;
  let tokenInfo: TokenLimitInfo | undefined;

  if (limitType === 'count') {
    // Simple count-based limiting
    results = allNotes.slice(0, Math.max(1, limit));
  } else {
    // Token-based limiting
    tokenInfo = getTokenLimitInfo(allNotes, limit);
    results = filterNotesByTokenLimit(allNotes, limit) as Array<
      StoredNote & { isParentDirectory: boolean; pathDistance: number }
    >;

    // Ensure at least one note is returned if any exist
    if (results.length === 0 && allNotes.length > 0) {
      results = [allNotes[0]];
    }
  }

  return {
    notes: results,
    tokenInfo,
  };
}

export function getUsedTagsForPath(targetPath: string): string[] {
  const normalizedRepo = normalizeRepositoryPath(targetPath);
  const notes = getNotesForPath(normalizedRepo, true);
  const counts = new Map<string, number>();
  for (const n of notes) {
    for (const tag of n.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export function getSuggestedTagsForPath(
  _targetPath: string
): Array<{ name: string; reason?: string }> {
  // Return empty array - users manage their own tags
  return [];
}

export interface MigrationResult {
  success: boolean;
  migrated: boolean;
  notesCount?: number;
  backupPath?: string;
  error?: string;
  message: string;
}

export function migrateNotesIfNeeded(repositoryPath: string): boolean {
  const legacyFile = getNotesFile(repositoryPath);
  if (fs.existsSync(legacyFile)) {
    migrateNotesToFiles(repositoryPath);
    return true;
  }
  return false;
}

export function migrateRepository(
  repositoryPath: string,
  options?: { force?: boolean; verbose?: boolean }
): MigrationResult {
  const repoRoot = normalizeRepositoryPath(repositoryPath);
  const legacyFile = getNotesFile(repoRoot);
  const notesDir = getNotesDir(repoRoot);

  // Check if already migrated
  if (!fs.existsSync(legacyFile) && fs.existsSync(notesDir)) {
    const noteCount = countNotesInDirectory(notesDir);
    return {
      success: true,
      migrated: false,
      notesCount: noteCount,
      message: `Repository already migrated. Found ${noteCount} notes in file-based storage.`,
    };
  }

  // Check if legacy file exists
  if (!fs.existsSync(legacyFile)) {
    return {
      success: true,
      migrated: false,
      message: 'No legacy notes file found. Repository is using file-based storage.',
    };
  }

  // Check if migration is already in progress (both exist)
  if (fs.existsSync(legacyFile) && fs.existsSync(notesDir) && !options?.force) {
    return {
      success: false,
      migrated: false,
      error: 'Both legacy and new storage exist. Use force option to re-migrate.',
      message: 'Migration may be incomplete. Use --force to retry migration.',
    };
  }

  try {
    const legacyNotes = readAllNotesFromLegacyFile(repoRoot);
    const noteCount = legacyNotes.length;

    if (options?.verbose) {
      console.log(`Found ${noteCount} notes to migrate`);
    }

    // Write each note to its own file
    let migrated = 0;
    for (const note of legacyNotes) {
      writeNoteToFile(repoRoot, note);
      migrated++;
      if (options?.verbose && migrated % 10 === 0) {
        console.log(`  Migrated ${migrated}/${noteCount} notes...`);
      }
    }

    // Get configuration for backup settings
    const config = readConfiguration(repoRoot);
    let backupPath: string | undefined;

    if (config.storage.backupOnMigration) {
      // Backup the legacy file
      backupPath = `${legacyFile}.backup-${Date.now()}`;
      fs.renameSync(legacyFile, backupPath);
    } else {
      // Just remove the legacy file
      fs.unlinkSync(legacyFile);
    }

    return {
      success: true,
      migrated: true,
      notesCount: noteCount,
      backupPath,
      message: `Successfully migrated ${noteCount} notes to file-based storage.${backupPath ? ` Backup saved to ${path.basename(backupPath)}` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      migrated: false,
      error: error instanceof Error ? error.message : String(error),
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function countNotesInDirectory(notesDir: string): number {
  let count = 0;

  const countRecursive = (dir: string): void => {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        countRecursive(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        count++;
      }
    }
  };

  countRecursive(notesDir);
  return count;
}

export function getRepositoryConfiguration(repositoryPath: string): RepositoryConfiguration {
  const repoRoot = normalizeRepositoryPath(repositoryPath);
  return readConfiguration(repoRoot);
}

export function updateRepositoryConfiguration(
  repositoryPath: string,
  config: {
    version?: number;
    limits?: Partial<RepositoryConfiguration['limits']>;
    storage?: Partial<RepositoryConfiguration['storage']>;
    tags?: Partial<RepositoryConfiguration['tags']>;
    types?: Partial<RepositoryConfiguration['types']>;
  }
): RepositoryConfiguration {
  const repoRoot = normalizeRepositoryPath(repositoryPath);
  const currentConfig = readConfiguration(repoRoot);

  const updatedConfig: RepositoryConfiguration = {
    ...currentConfig,
    ...(config.version !== undefined && { version: config.version }),
    limits: {
      ...currentConfig.limits,
      ...config.limits,
    },
    storage: {
      ...currentConfig.storage,
      ...config.storage,
    },
    tags: {
      ...currentConfig.tags,
      ...config.tags,
    },
    types: {
      ...currentConfig.types,
      ...config.types,
    },
  };

  writeConfiguration(repoRoot, updatedConfig);
  return updatedConfig;
}

export function validateNoteAgainstConfig(
  note: Omit<StoredNote, 'id' | 'timestamp'>,
  repositoryPath: string
): ValidationError[] {
  const repoRoot = normalizeRepositoryPath(repositoryPath);
  const config = readConfiguration(repoRoot);
  return validateNote(note, config, repoRoot);
}

export function getRepositoryGuidance(targetPath: string): string | null {
  try {
    const normalizedRepo = normalizeRepositoryPath(targetPath);
    const guidanceFile = getGuidanceFile(normalizedRepo);

    // Try to read repository-specific guidance first
    if (fs.existsSync(guidanceFile)) {
      return fs.readFileSync(guidanceFile, 'utf8');
    }

    // Fall back to bundled default template
    const defaultTemplatePath = path.join(__dirname, '../../../templates/default-note-guidance.md');
    if (fs.existsSync(defaultTemplatePath)) {
      return fs.readFileSync(defaultTemplatePath, 'utf8');
    }

    return null;
  } catch {
    return null;
  }
}

export function getNoteById(repositoryPath: string, noteId: string): StoredNote | null {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notes = readAllNotes(normalizedRepo);
  return notes.find((note) => note.id === noteId) || null;
}

export function deleteNoteById(repositoryPath: string, noteId: string): boolean {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notes = readAllNotes(normalizedRepo);
  const noteToDelete = notes.find((note) => note.id === noteId);

  if (!noteToDelete) {
    return false;
  }

  deleteNoteFile(normalizedRepo, noteToDelete);
  return true;
}

/**
 * Get all unreviewed notes for a given path
 */
export function getUnreviewedNotes(repositoryPath: string, directoryPath?: string): StoredNote[] {
  const targetPath = directoryPath || repositoryPath;
  const notes = getNotesForPath(targetPath, true);
  return notes.filter((note) => !note.reviewed);
}

/**
 * Mark a note as reviewed
 */
export function markNoteReviewed(repositoryPath: string, noteId: string): boolean {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notes = readAllNotes(normalizedRepo);
  const note = notes.find((n) => n.id === noteId);

  if (!note) {
    return false;
  }

  note.reviewed = true;

  // Write the updated note back to its file
  writeNoteToFile(normalizedRepo, note);
  return true;
}

/**
 * Mark all notes as reviewed for a given path
 */
export function markAllNotesReviewed(repositoryPath: string, directoryPath?: string): number {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const targetPath = directoryPath || normalizedRepo;
  const notes = getNotesForPath(targetPath, true);

  let count = 0;
  for (const note of notes) {
    if (!note.reviewed) {
      note.reviewed = true;
      writeNoteToFile(normalizedRepo, note);
      count++;
    }
  }

  return count;
}

export interface StaleNote {
  note: StoredNote;
  staleAnchors: string[];
  validAnchors: string[];
}

export interface TagInfo {
  name: string;
  description?: string;
}

export function getAllowedTags(repositoryPath: string): { enforced: boolean; tags: string[] } {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const config = readConfiguration(normalizedRepo);
  const enforced = config.tags?.enforceAllowedTags || false;

  if (enforced) {
    // Auto-populate from tags directory
    const tagDescriptions = getTagDescriptions(normalizedRepo);
    const tags = Object.keys(tagDescriptions);
    return { enforced, tags };
  }

  return { enforced, tags: [] };
}

export function addAllowedTag(repositoryPath: string, tag: string, description?: string): void {
  // Adding an allowed tag means creating a tag description
  const desc = description || `Description for ${tag} tag`;
  saveTagDescription(repositoryPath, tag, desc);
}

export function removeAllowedTag(
  repositoryPath: string,
  tag: string,
  removeFromNotes: boolean = true
): boolean {
  // Removing an allowed tag means deleting the tag description and optionally removing from notes
  return deleteTagDescription(repositoryPath, tag, removeFromNotes);
}

export function setEnforceAllowedTags(repositoryPath: string, enforce: boolean): void {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const config = readConfiguration(normalizedRepo);

  if (!config.tags) {
    config.tags = { enforceAllowedTags: false };
  }

  config.tags.enforceAllowedTags = enforce;
  writeConfiguration(normalizedRepo, config);
}

export function checkStaleNotes(repositoryPath: string): StaleNote[] {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notes = readAllNotes(normalizedRepo);
  const staleNotes: StaleNote[] = [];

  for (const note of notes) {
    const staleAnchors: string[] = [];
    const validAnchors: string[] = [];

    for (const anchor of note.anchors) {
      // Anchors are stored as relative paths to the repo root
      const anchorPath = path.join(normalizedRepo, anchor);

      if (fs.existsSync(anchorPath)) {
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

function getTagsDirectory(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'tags');
}

function getTypesDirectory(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'types');
}

export function getTagDescriptions(repositoryPath: string): Record<string, string> {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const tagsDir = getTagsDirectory(normalizedRepo);
  const descriptions: Record<string, string> = {};

  // Read from the markdown files
  if (fs.existsSync(tagsDir)) {
    try {
      const files = fs.readdirSync(tagsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const tagName = file.slice(0, -3); // Remove .md extension
          const filePath = path.join(tagsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            descriptions[tagName] = content.trim();
          } catch (error) {
            console.error(`Error reading tag description for ${tagName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error reading tags directory:', error);
    }
  }

  return descriptions;
}

export function saveTagDescription(repositoryPath: string, tag: string, description: string): void {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const config = readConfiguration(normalizedRepo);

  // Check description length against tagDescriptionMaxLength
  if (description.length > config.limits.tagDescriptionMaxLength) {
    throw new Error(
      `Tag description exceeds maximum length of ${config.limits.tagDescriptionMaxLength} characters. ` +
        `Current length: ${description.length}`
    );
  }

  // Ensure .a24z/tags directory exists
  ensureDataDir(normalizedRepo);
  const tagsDir = getTagsDirectory(normalizedRepo);
  if (!fs.existsSync(tagsDir)) {
    fs.mkdirSync(tagsDir, { recursive: true });
  }

  // Write the description to a markdown file
  const tagFile = path.join(tagsDir, `${tag}.md`);
  const tmp = `${tagFile}.tmp`;
  fs.writeFileSync(tmp, description, { encoding: 'utf8' });
  fs.renameSync(tmp, tagFile);
}

export function removeTagFromNotes(repositoryPath: string, tag: string): number {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notes = readAllNotes(normalizedRepo);
  let modifiedCount = 0;

  for (const note of notes) {
    if (note.tags.includes(tag)) {
      // Remove the tag from the note
      note.tags = note.tags.filter((t) => t !== tag);
      // Save the updated note
      writeNoteToFile(normalizedRepo, note);
      modifiedCount++;
    }
  }

  return modifiedCount;
}

export function deleteTagDescription(
  repositoryPath: string,
  tag: string,
  removeFromNotes: boolean = false
): boolean {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const tagsDir = getTagsDirectory(normalizedRepo);
  const tagFile = path.join(tagsDir, `${tag}.md`);

  // Remove tag from notes if requested
  if (removeFromNotes) {
    removeTagFromNotes(normalizedRepo, tag);
  }

  if (fs.existsSync(tagFile)) {
    fs.unlinkSync(tagFile);

    // Clean up empty tags directory
    if (fs.existsSync(tagsDir)) {
      const files = fs.readdirSync(tagsDir);
      if (files.length === 0) {
        fs.rmdirSync(tagsDir);
      }
    }

    return true;
  }

  return false;
}

export function getTagsWithDescriptions(repositoryPath: string): TagInfo[] {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  // const config = readConfiguration(normalizedRepo);
  const descriptions = getTagDescriptions(normalizedRepo);
  const tags: TagInfo[] = [];

  // Return all tags that have descriptions (these are the available/allowed tags)
  for (const [name, description] of Object.entries(descriptions)) {
    tags.push({ name, description });
  }

  return tags;
}

// Type Description Functions

export interface TypeInfo {
  name: string;
  description?: string;
}

export function getTypeDescriptions(repositoryPath: string): Record<string, string> {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const typesDir = getTypesDirectory(normalizedRepo);
  const descriptions: Record<string, string> = {};

  // Read from the markdown files
  if (fs.existsSync(typesDir)) {
    try {
      const files = fs.readdirSync(typesDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const typeName = file.slice(0, -3); // Remove .md extension
          const filePath = path.join(typesDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            descriptions[typeName] = content.trim();
          } catch (error) {
            console.error(`Error reading type description for ${typeName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error reading types directory:', error);
    }
  }

  return descriptions;
}

export function saveTypeDescription(
  repositoryPath: string,
  type: string,
  description: string
): void {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const config = readConfiguration(normalizedRepo);

  // Check description length against tagDescriptionMaxLength (reuse the same limit)
  if (description.length > config.limits.tagDescriptionMaxLength) {
    throw new Error(
      `Type description exceeds maximum length of ${config.limits.tagDescriptionMaxLength} characters. ` +
        `Current length: ${description.length}`
    );
  }

  // Ensure .a24z/types directory exists
  ensureDataDir(normalizedRepo);
  const typesDir = getTypesDirectory(normalizedRepo);
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  // Write the description to a markdown file
  const typeFile = path.join(typesDir, `${type}.md`);
  const tmp = `${typeFile}.tmp`;
  fs.writeFileSync(tmp, description, { encoding: 'utf8' });
  fs.renameSync(tmp, typeFile);
}

export function deleteTypeDescription(repositoryPath: string, type: string): boolean {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const typesDir = getTypesDirectory(normalizedRepo);
  const typeFile = path.join(typesDir, `${type}.md`);

  if (fs.existsSync(typeFile)) {
    fs.unlinkSync(typeFile);

    // Clean up empty types directory
    if (fs.existsSync(typesDir)) {
      const files = fs.readdirSync(typesDir);
      if (files.length === 0) {
        fs.rmdirSync(typesDir);
      }
    }

    return true;
  }

  return false;
}

export function getTypesWithDescriptions(repositoryPath: string): TypeInfo[] {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const descriptions = getTypeDescriptions(normalizedRepo);
  const types: TypeInfo[] = [];

  // Return all types that have descriptions (these are the available/allowed types)
  for (const [name, description] of Object.entries(descriptions)) {
    types.push({ name, description });
  }

  return types;
}

export function getAllowedTypes(repositoryPath: string): { enforced: boolean; types: string[] } {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const config = readConfiguration(normalizedRepo);
  const enforced = config.types?.enforceAllowedTypes || false;

  if (enforced) {
    // Auto-populate from types directory
    const typeDescriptions = getTypeDescriptions(normalizedRepo);
    const types = Object.keys(typeDescriptions);
    return { enforced, types };
  }

  return { enforced, types: [] };
}

export function addAllowedType(repositoryPath: string, type: string, description?: string): void {
  // Adding an allowed type means creating a type description
  const desc = description || `Description for ${type} type`;
  saveTypeDescription(repositoryPath, type, desc);
}

export function removeAllowedType(repositoryPath: string, type: string): boolean {
  // Removing an allowed type means deleting the type description
  return deleteTypeDescription(repositoryPath, type);
}

export function setEnforceAllowedTypes(repositoryPath: string, enforce: boolean): void {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const config = readConfiguration(normalizedRepo);

  if (!config.types) {
    config.types = { enforceAllowedTypes: false };
  }

  config.types.enforceAllowedTypes = enforce;
  writeConfiguration(normalizedRepo, config);
}
