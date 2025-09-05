import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeRepositoryPath } from '../utils/pathNormalization';
import { DEFAULT_REPOSITORY_CONFIG, DEFAULT_PATH_CONFIG } from '../config/defaultConfig';
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
import { codebaseViewsStore } from './codebaseViewsStore';

export { TokenLimitInfo } from '../utils/tokenCounter';

export interface StoredAnchoredNote {
  id: string;
  note: string;
  anchors: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  timestamp: number;
  reviewed?: boolean;
  codebaseViewId: string; // Required CodebaseView identifier
  cellCoordinates?: [number, number]; // Optional - computed dynamically via anchor-to-cell pattern matching
}

export interface AnchoredNoteWithPath {
  note: StoredAnchoredNote;
  path: string; // File system path where this note is stored (relative to repository root)
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
    compressionEnabled: boolean;
  };
  tags?: {
    enforceAllowedTags?: boolean; // Whether to enforce allowed tags (based on tag descriptions)
  };
  enabled_mcp_tools?: {
    create_repository_note?: boolean;
    get_notes?: boolean;
    get_repository_tags?: boolean;
    get_repository_types?: boolean;
    get_repository_guidance?: boolean;
    discover_a24z_tools?: boolean;
    delete_repository_note?: boolean;
    get_repository_note?: boolean;
    create_handoff_brief?: boolean;
    list_handoff_briefs?: boolean;
    get_stale_notes?: boolean;
    get_tag_usage?: boolean;
    delete_tag?: boolean;
    replace_tag?: boolean;
    get_note_coverage?: boolean;
    start_documentation_quest?: boolean;
    list_codebase_views?: boolean;
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

function getRepositoryDataDir(repositoryPath: string): string {
  // Always use repository-specific directory
  return path.join(repositoryPath, DEFAULT_PATH_CONFIG.dataDir);
}

function getNotesDir(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), DEFAULT_PATH_CONFIG.notesDir);
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
  return path.join(getRepositoryDataDir(repositoryPath), DEFAULT_PATH_CONFIG.configFile);
}

function getDefaultConfiguration(): RepositoryConfiguration {
  return DEFAULT_REPOSITORY_CONFIG;
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
      enabled_mcp_tools: {
        ...defaultConfig.enabled_mcp_tools,
        ...parsed.enabled_mcp_tools,
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
  note: Omit<StoredAnchoredNote, 'id' | 'timestamp'>,
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

export function readAllNotes(repositoryPath: string): AnchoredNoteWithPath[] {
  try {
    ensureDataDir(repositoryPath);
    const notesDir = getNotesDir(repositoryPath);

    // Read all notes from individual files
    const notes: AnchoredNoteWithPath[] = [];

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
            const note = JSON.parse(noteContent) as StoredAnchoredNote;
            if (note && typeof note === 'object' && note.id) {
              // Wrap the note with its path
              notes.push({
                note,
                path: path.relative(repositoryPath, fullPath),
              });
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

function writeNoteToFile(repositoryPath: string, note: StoredAnchoredNote): void {
  ensureNotesDir(repositoryPath, note.timestamp);
  const notePath = getNoteFilePath(repositoryPath, note.id, note.timestamp);
  const tmp = `${notePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(note, null, 2), { encoding: 'utf8' });
  fs.renameSync(tmp, notePath);
}

export function deleteNoteFile(repositoryPath: string, note: StoredAnchoredNote): void {
  const notePath = getNoteFilePath(repositoryPath, note.id, note.timestamp);
  if (fs.existsSync(notePath)) {
    fs.unlinkSync(notePath);
  }
}

export function saveNote(
  note: Omit<StoredAnchoredNote, 'id' | 'timestamp'> & { directoryPath: string }
): AnchoredNoteWithPath {
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
    metadata: note.metadata,
    reviewed: note.reviewed,
    codebaseViewId: note.codebaseViewId,
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

  const baseTimestamp = Date.now();
  const noteId = `note-${baseTimestamp}-${Math.random().toString(36).slice(2, 11)}`;

  // Ensure unique timestamp by adding a small counter if needed
  let timestamp = baseTimestamp;

  // Check if any existing note has this timestamp (though unlikely with millisecond precision)
  const existingNotes = readAllNotes(repoRoot);
  const timestampExists = existingNotes.some((n) => n.note.timestamp === timestamp);
  if (timestampExists) {
    // Add 1ms to ensure uniqueness
    timestamp = baseTimestamp + 1;
  }
  const notePath = getNoteFilePath(repoRoot, noteId, timestamp);

  const saved: StoredAnchoredNote = {
    ...noteWithoutDirectoryPath,
    anchors: normalizedAnchors, // Use normalized anchors
    id: noteId,
    timestamp: timestamp,
    reviewed:
      noteWithoutDirectoryPath.reviewed !== undefined ? noteWithoutDirectoryPath.reviewed : false,
  };

  // Write the note to its own file
  writeNoteToFile(repoRoot, saved);

  // Return the note wrapped with its path
  return {
    note: saved,
    path: path.relative(repoRoot, notePath),
  };
}

export interface AnchoredNotesResult {
  notes: Array<StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number }>;
  tokenInfo?: TokenLimitInfo;
}

/**
 * Get all notes for a path without any limits
 */
export function getNotesForPath(
  targetPath: string,
  includeParentNotes: boolean
): Array<StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number }> {
  // Resolve the path to absolute
  const normalized = path.resolve(targetPath);

  // Use the resolved path for finding the repository
  const normalizedRepo = normalizeRepositoryPath(normalized);

  // Convert the query path to be relative to the repo root for comparison
  const queryRelative = path.relative(normalizedRepo, normalized);

  const all = readAllNotes(normalizedRepo);
  return all
    .map((noteWithPath: AnchoredNoteWithPath) => {
      const n = noteWithPath.note;
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
      (x): x is StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number } =>
        x !== null
    )
    .filter((x: StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number }) =>
      includeParentNotes ? true : !x.isParentDirectory
    )
    .sort(
      (
        a: StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number },
        b: StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number }
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
): AnchoredNotesResult {
  // Get all notes first
  const allNotes = getNotesForPath(targetPath, includeParentNotes);

  // Apply limit based on type
  let results: Array<StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number }>;
  let tokenInfo: TokenLimitInfo | undefined;

  if (limitType === 'count') {
    // Simple count-based limiting
    results = allNotes.slice(0, Math.max(1, limit));
  } else {
    // Token-based limiting
    tokenInfo = getTokenLimitInfo(allNotes, limit);
    results = filterNotesByTokenLimit(allNotes, limit) as Array<
      StoredAnchoredNote & { isParentDirectory: boolean; pathDistance: number }
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
    enabled_mcp_tools?: Partial<RepositoryConfiguration['enabled_mcp_tools']>;
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
    enabled_mcp_tools: {
      ...currentConfig.enabled_mcp_tools,
      ...config.enabled_mcp_tools,
    },
  };

  writeConfiguration(repoRoot, updatedConfig);
  return updatedConfig;
}

export function validateNoteAgainstConfig(
  note: Omit<StoredAnchoredNote, 'id' | 'timestamp'>,
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

export function getNoteById(repositoryPath: string, noteId: string): StoredAnchoredNote | null {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notesWithPaths = readAllNotes(normalizedRepo);
  const found = notesWithPaths.find((nwp) => nwp.note.id === noteId);
  return found ? found.note : null;
}

export function deleteNoteById(repositoryPath: string, noteId: string): boolean {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notesWithPaths = readAllNotes(normalizedRepo);
  const found = notesWithPaths.find((nwp) => nwp.note.id === noteId);
  const noteToDelete = found ? found.note : null;

  if (!noteToDelete) {
    return false;
  }

  deleteNoteFile(normalizedRepo, noteToDelete);
  return true;
}

/**
 * Get all unreviewed notes for a given path
 */
export function getUnreviewedNotes(
  repositoryPath: string,
  directoryPath?: string
): StoredAnchoredNote[] {
  const targetPath = directoryPath || repositoryPath;
  const notes = getNotesForPath(targetPath, true);
  return notes.filter((note) => !note.reviewed);
}

/**
 * Mark a note as reviewed
 */
export function markNoteReviewed(repositoryPath: string, noteId: string): boolean {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notesWithPaths = readAllNotes(normalizedRepo);
  const found = notesWithPaths.find((nwp) => nwp.note.id === noteId);
  const note = found ? found.note : null;

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

export interface StaleAnchoredNote {
  note: StoredAnchoredNote;
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

export function checkStaleAnchoredNotes(repositoryPath: string): StaleAnchoredNote[] {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notesWithPaths = readAllNotes(normalizedRepo);
  const staleNotes: StaleAnchoredNote[] = [];

  for (const noteWithPath of notesWithPaths) {
    const note = noteWithPath.note;
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

/**
 * Merge multiple notes into a single consolidated note
 */
// Metadata for merged notes includes merged note IDs and any user-provided metadata
type MergeNoteMetadata = Record<string, unknown>;

export interface MergeAnchoredNotesInput {
  note: string;
  anchors: string[];
  tags: string[];
  metadata?: MergeNoteMetadata;
  noteIds: string[];
  codebaseViewId: string;
  deleteOriginals?: boolean;
}

export interface MergeAnchoredNotesResult {
  mergedNote: StoredAnchoredNote;
  deletedCount: number;
}

export function mergeNotes(
  repositoryPath: string,
  input: MergeAnchoredNotesInput
): MergeAnchoredNotesResult {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);

  // Create the merged note with metadata about the merge
  const mergedNoteData = {
    note: input.note,
    directoryPath: normalizedRepo,
    anchors: [...new Set(input.anchors)], // Deduplicate anchors
    tags: [...new Set(input.tags)], // Deduplicate tags
    codebaseViewId: input.codebaseViewId,
    metadata: {
      ...input.metadata,
      mergedFrom: input.noteIds,
      mergedAt: new Date().toISOString(),
    },
  };

  const savedAnchoredNoteWithPath = saveNote(mergedNoteData);

  let deletedCount = 0;
  if (input.deleteOriginals !== false) {
    // Default to true
    for (const noteId of input.noteIds) {
      if (deleteNoteById(normalizedRepo, noteId)) {
        deletedCount++;
      }
    }
  }

  return {
    mergedNote: savedAnchoredNoteWithPath.note,
    deletedCount,
  };
}

function getTagsDirectory(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'tags');
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
  const notesWithPaths = readAllNotes(normalizedRepo);
  let modifiedCount = 0;

  for (const noteWithPath of notesWithPaths) {
    const note = noteWithPath.note;
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

export function replaceTagInNotes(repositoryPath: string, oldTag: string, newTag: string): number {
  const normalizedRepo = normalizeRepositoryPath(repositoryPath);
  const notesWithPaths = readAllNotes(normalizedRepo);
  let modifiedCount = 0;

  for (const noteWithPath of notesWithPaths) {
    const note = noteWithPath.note;
    if (note.tags.includes(oldTag)) {
      // Replace the old tag with the new tag
      note.tags = note.tags.map((t) => (t === oldTag ? newTag : t));

      // Remove duplicates if the new tag was already present
      note.tags = [...new Set(note.tags)];

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

// =============================================================================
// View-Based Note Association Functions
// =============================================================================

/**
 * Create a note with view association
 */
export interface SaveAnchoredNoteWithViewInput {
  note: string;
  anchors: string[];
  tags: string[];
  metadata?: Record<string, unknown>;
  codebaseViewId: string;
  cellCoordinates?: [number, number];
}

export function saveNoteWithView(
  repositoryPath: string,
  input: SaveAnchoredNoteWithViewInput
): StoredAnchoredNote {
  const noteData = {
    note: input.note,
    anchors: input.anchors,
    tags: input.tags,
    metadata: input.metadata || {},
    reviewed: false,
    codebaseViewId: input.codebaseViewId,
    cellCoordinates: input.cellCoordinates,
    directoryPath: repositoryPath,
  };

  const result = saveNote(noteData);
  return result.note;
}

/**
 * Get all notes associated with a specific view
 */
export function getNotesForView(
  repositoryPath: string,
  codebaseViewId: string
): StoredAnchoredNote[] {
  const allNotes = getNotesForPath(repositoryPath, true);

  return allNotes.filter((note) => note.codebaseViewId === codebaseViewId);
}

/**
 * Get notes in a specific cell of a view
 */
export function getNotesForCell(
  repositoryPath: string,
  codebaseViewId: string,
  cellCoordinates: [number, number]
): StoredAnchoredNote[] {
  const viewNotes = getNotesForView(repositoryPath, codebaseViewId);

  return viewNotes.filter((note) => {
    if (!note.cellCoordinates) return false;
    const [row, col] = note.cellCoordinates;
    const [targetRow, targetCol] = cellCoordinates;
    return row === targetRow && col === targetCol;
  });
}

/**
 * Detect which view cell best matches a set of file anchors
 * This can be used to auto-assign notes to appropriate cells
 */
export function detectCellForAnchors(
  repositoryPath: string,
  codebaseViewId: string,
  anchors: string[]
): { cellName: string | null; coordinates: [number, number] | null; confidence: number } {
  const view = codebaseViewsStore.getView(repositoryPath, codebaseViewId);
  if (!view) {
    return { cellName: null, coordinates: null, confidence: 0 };
  }

  let bestMatch: { cellName: string; coordinates: [number, number]; confidence: number } = {
    cellName: '',
    coordinates: [0, 0],
    confidence: 0,
  };

  // Simple pattern matching - in practice you'd want more sophisticated glob matching
  for (const [cellName, cell] of Object.entries(view.cells)) {
    let matchCount = 0;
    let totalAnchors = anchors.length;

    for (const anchor of anchors) {
      for (const pattern of cell.patterns) {
        // Simple pattern matching - contains check
        if (anchor.includes(pattern.replace(/\*+/g, '')) || pattern.includes(anchor)) {
          matchCount++;
          break; // Only count each anchor once per cell
        }
      }
    }

    const confidence = totalAnchors > 0 ? matchCount / totalAnchors : 0;

    if (confidence > bestMatch.confidence) {
      bestMatch = {
        cellName,
        coordinates: cell.coordinates,
        confidence,
      };
    }
  }

  return bestMatch.confidence > 0
    ? bestMatch
    : { cellName: null, coordinates: null, confidence: 0 };
}

/**
 * Update a note's view association
 */
export function updateNoteView(
  repositoryPath: string,
  noteId: string,
  viewUpdate: {
    codebaseViewId?: string;
    cellCoordinates?: [number, number];
  }
): boolean {
  const note = getNoteById(repositoryPath, noteId);
  if (!note) {
    return false;
  }

  const updatedNote: StoredAnchoredNote = {
    ...note,
    codebaseViewId: viewUpdate.codebaseViewId ?? note.codebaseViewId,
    cellCoordinates: viewUpdate.cellCoordinates,
    timestamp: Date.now(), // Update timestamp when view association changes
  };

  // First delete the old note
  const deleted = deleteNoteById(repositoryPath, noteId);
  if (!deleted) return false;

  // Save the updated note (it will get a new ID and timestamp)
  const savedNote = saveNote({
    note: updatedNote.note,
    anchors: updatedNote.anchors,
    tags: updatedNote.tags,
    metadata: updatedNote.metadata,
    reviewed: updatedNote.reviewed,
    codebaseViewId: updatedNote.codebaseViewId,
    cellCoordinates: updatedNote.cellCoordinates,
    directoryPath: repositoryPath,
  });

  return savedNote !== null;
}

/**
 * Get notes that have no view association (orphaned notes)
 */
export function getOrphanedNotes(repositoryPath: string): StoredAnchoredNote[] {
  const allNotes = getNotesForPath(repositoryPath, true);

  return allNotes.filter((note) => !note.codebaseViewId);
}

/**
 * Get view statistics - count of notes per cell
 */
export function getViewStatistics(
  repositoryPath: string,
  codebaseViewId: string
): {
  totalNotes: number;
  cellStats: Record<string, { noteCount: number; coordinates: [number, number] }>;
  orphanedNotes: number;
} {
  const viewNotes = getNotesForView(repositoryPath, codebaseViewId);
  const view = codebaseViewsStore.getView(repositoryPath, codebaseViewId);

  const stats = {
    totalNotes: viewNotes.length,
    cellStats: {} as Record<string, { noteCount: number; coordinates: [number, number] }>,
    orphanedNotes: 0,
  };

  // Initialize cell stats
  if (view) {
    for (const [cellName, cell] of Object.entries(view.cells)) {
      stats.cellStats[cellName] = {
        noteCount: 0,
        coordinates: cell.coordinates,
      };
    }
  }

  // Count notes per cell
  for (const note of viewNotes) {
    if (note.cellCoordinates && view) {
      // Find cell by coordinates
      const cellEntry = Object.entries(view.cells).find(([, cell]) => {
        const [row, col] = cell.coordinates;
        const [noteRow, noteCol] = note.cellCoordinates!;
        return row === noteRow && col === noteCol;
      });

      if (cellEntry) {
        const [cellName] = cellEntry;
        stats.cellStats[cellName].noteCount++;
      } else {
        stats.orphanedNotes++;
      }
    } else {
      stats.orphanedNotes++;
    }
  }

  return stats;
}
