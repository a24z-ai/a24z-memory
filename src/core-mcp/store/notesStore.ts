import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { normalizeRepositoryPath, getRepositoryName } from '../utils/pathNormalization';

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
}

export interface RepositoryConfiguration {
  version: number;
  limits: {
    noteMaxLength: number;
    maxTagsPerNote: number;
    maxTagLength: number;
    maxAnchorsPerNote: number;
  };
  storage: {
    backupOnMigration: boolean;
    compressionEnabled: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  limit?: number;
  actual?: number;
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
      maxTagLength: 50,
      maxAnchorsPerNote: 20
    },
    storage: {
      backupOnMigration: true,
      compressionEnabled: false
    }
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
        ...parsed.limits
      },
      storage: {
        ...defaultConfig.storage,
        ...parsed.storage
      }
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

function validateNote(note: Omit<StoredNote, 'id' | 'timestamp'>, config: RepositoryConfiguration): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Validate note length
  if (note.note.length > config.limits.noteMaxLength) {
    errors.push({
      field: 'note',
      message: `Note content exceeds maximum length of ${config.limits.noteMaxLength} characters`,
      limit: config.limits.noteMaxLength,
      actual: note.note.length
    });
  }
  
  // Validate number of tags
  if (note.tags.length > config.limits.maxTagsPerNote) {
    errors.push({
      field: 'tags',
      message: `Note has too many tags (${note.tags.length}). Maximum allowed: ${config.limits.maxTagsPerNote}`,
      limit: config.limits.maxTagsPerNote,
      actual: note.tags.length
    });
  }
  
  // Validate tag lengths
  const longTags = note.tags.filter(tag => tag.length > config.limits.maxTagLength);
  if (longTags.length > 0) {
    errors.push({
      field: 'tags',
      message: `Some tags exceed maximum length of ${config.limits.maxTagLength} characters: ${longTags.join(', ')}`,
      limit: config.limits.maxTagLength
    });
  }
  
  // Validate number of anchors
  if (note.anchors.length > config.limits.maxAnchorsPerNote) {
    errors.push({
      field: 'anchors',
      message: `Note has too many anchors (${note.anchors.length}). Maximum allowed: ${config.limits.maxAnchorsPerNote}`,
      limit: config.limits.maxAnchorsPerNote,
      actual: note.anchors.length
    });
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

function readAllNotes(repositoryPath: string): StoredNote[] {
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

function deleteNoteFile(repositoryPath: string, note: StoredNote): void {
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

export function saveNote(note: Omit<StoredNote, 'id' | 'timestamp'> & { directoryPath: string }): StoredNote {
  const repoRoot = normalizeRepositoryPath(note.directoryPath);
  const originalDirPath = path.resolve(note.directoryPath);
  
  // Load configuration and validate the note
  const config = readConfiguration(repoRoot);
  const { directoryPath, ...noteWithoutDirectoryPath } = note;
  
  // Validate the note before processing
  const validationErrors = validateNote(noteWithoutDirectoryPath, config);
  if (validationErrors.length > 0) {
    const errorMessages = validationErrors.map(err => err.message).join('; ');
    throw new Error(`Note validation failed: ${errorMessages}`);
  }
  
  // Normalize anchors to be relative paths to the repository root
  const normalizedAnchors = note.anchors.map(anchor => {
    // If anchor is already absolute, make it relative to repo root
    if (path.isAbsolute(anchor)) {
      return path.relative(repoRoot, anchor);
    } else if (anchor.startsWith('./') || anchor.startsWith('../')) {
      // Anchors starting with ./ or ../ are relative to the original directoryPath
      // Resolve them first, then make relative to repo root
      const resolved = path.resolve(originalDirPath, anchor);
      return path.relative(repoRoot, resolved);
    } else {
      // Already relative to repo root, keep as-is
      return anchor;
    }
  });
  
  const saved: StoredNote = { 
    ...noteWithoutDirectoryPath, 
    anchors: normalizedAnchors, // Use normalized anchors
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, 
    timestamp: Date.now() 
  };
  
  // Write the note to its own file
  writeNoteToFile(repoRoot, saved);
  return saved;
}

export function getNotesForPath(targetPath: string, includeParentNotes: boolean, maxResults: number): Array<StoredNote & { isParentDirectory: boolean; pathDistance: number }> {
  // Resolve the path to absolute
  const normalized = path.resolve(targetPath);
  
  // Use the resolved path for finding the repository
  const normalizedRepo = normalizeRepositoryPath(normalized);
  
  // Convert the query path to be relative to the repo root for comparison
  const queryRelative = path.relative(normalizedRepo, normalized);
  
  const all = readAllNotes(normalizedRepo);
  const results = all
    .map((n: StoredNote) => {
      // Since notes are stored in repository-specific .a24z directories,
      // any note in the current repository is considered to have the repo root as its directory
      const base = normalizedRepo;
      
      // A note is a "parent directory" note if it matches ONLY because the query is within its directory scope
      // We'll determine this after checking anchors
      let isParent = false;
      
      // Check if the target path matches any anchor
      // Anchors are stored as relative paths to the repo root
      const matchesAnchor = n.anchors.some((anchor: string) => {
        // Check if query path is the anchor itself or within the anchor directory
        // Both queryRelative and anchor are relative to repo root
        return queryRelative === anchor || 
               queryRelative.startsWith(`${anchor}${path.sep}`) ||
               // Also check if anchor is within the query (for directory queries)
               anchor.startsWith(`${queryRelative}${path.sep}`);
      });
      
      // Check if the query path is within the note's directory scope (which is the repo root)
      const queryInDirectory = normalized === base || normalized.startsWith(`${base}${path.sep}`);
      
      // If the note matches an anchor, it's not a parent directory note
      // If it doesn't match an anchor but the query is in its directory, it IS a parent directory note
      if (matchesAnchor) {
        isParent = false;
      } else if (queryInDirectory) {
        isParent = true;
      } else {
        // Doesn't match at all
        return null;
      }
      
      const distance = matchesAnchor ? 0 : (isParent ? normalized.replace(base, '').split(path.sep).filter(Boolean).length : 9999);
      return { ...n, isParentDirectory: isParent, pathDistance: distance };
    })
    .filter((x): x is StoredNote & { isParentDirectory: boolean; pathDistance: number } => x !== null)
    .filter((x: StoredNote & { isParentDirectory: boolean; pathDistance: number }) => includeParentNotes ? true : !x.isParentDirectory)
    .sort((a: StoredNote & { isParentDirectory: boolean; pathDistance: number }, b: StoredNote & { isParentDirectory: boolean; pathDistance: number }) => a.pathDistance - b.pathDistance || b.timestamp - a.timestamp)
    .slice(0, Math.max(1, maxResults));
  return results;
}

export function getUsedTagsForPath(targetPath: string): string[] {
  const normalizedRepo = normalizeRepositoryPath(targetPath);
  const notes = getNotesForPath(normalizedRepo, true, 1000);
  const counts = new Map<string, number>();
  for (const n of notes) {
    for (const tag of n.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export function getCommonTags(): Array<{ name: string; description?: string }> {
  return [
    { name: 'feature', description: 'Feature work' },
    { name: 'bugfix', description: 'Bug fixes' },
    { name: 'refactor', description: 'Refactoring' },
    { name: 'performance', description: 'Performance-related' },
    { name: 'security', description: 'Security considerations' },
    { name: 'testing', description: 'Testing and coverage' },
    { name: 'documentation', description: 'Docs and guides' },
    { name: 'configuration', description: 'Configs and env' },
    { name: 'authentication', description: 'Auth flows' },
    { name: 'database', description: 'Database and persistence' },
    { name: 'api', description: 'API design and integration' },
    { name: 'ui', description: 'UI and UX' },
    { name: 'architecture', description: 'Architecture decisions' },
    { name: 'deployment', description: 'Builds and deploys' },
    { name: 'migration', description: 'Migrations and upgrades' },
    { name: 'react', description: 'React-specific' },
    { name: 'typescript', description: 'TypeScript types and patterns' }
  ];
}

export function getSuggestedTagsForPath(targetPath: string): Array<{ name: string; reason?: string }> {
  const lower = targetPath.toLowerCase();
  const suggestions: Array<{ name: string; reason?: string }> = [];
  if (lower.includes('auth')) suggestions.push({ name: 'authentication', reason: 'Path contains "auth"' });
  if (lower.includes('test')) suggestions.push({ name: 'testing', reason: 'Path contains "test"' });
  if (lower.includes('db') || lower.includes('prisma') || lower.includes('schema')) suggestions.push({ name: 'database', reason: 'Database-related path' });
  if (lower.includes('api')) suggestions.push({ name: 'api', reason: 'API-related path' });
  if (lower.includes('perf') || lower.includes('optimiz')) suggestions.push({ name: 'performance', reason: 'Performance-related keywords' });
  if (lower.includes('security') || lower.includes('authz')) suggestions.push({ name: 'security', reason: 'Security-related keywords' });
  if (lower.includes('ui') || lower.includes('component') || lower.includes('view')) suggestions.push({ name: 'ui', reason: 'UI component path' });
  return suggestions;
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

export function migrateRepository(repositoryPath: string, options?: { force?: boolean; verbose?: boolean }): MigrationResult {
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
      message: `Repository already migrated. Found ${noteCount} notes in file-based storage.`
    };
  }
  
  // Check if legacy file exists
  if (!fs.existsSync(legacyFile)) {
    return {
      success: true,
      migrated: false,
      message: 'No legacy notes file found. Repository is using file-based storage.'
    };
  }
  
  // Check if migration is already in progress (both exist)
  if (fs.existsSync(legacyFile) && fs.existsSync(notesDir) && !options?.force) {
    return {
      success: false,
      migrated: false,
      error: 'Both legacy and new storage exist. Use force option to re-migrate.',
      message: 'Migration may be incomplete. Use --force to retry migration.'
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
      message: `Successfully migrated ${noteCount} notes to file-based storage.${backupPath ? ` Backup saved to ${path.basename(backupPath)}` : ''}`
    };
  } catch (error) {
    return {
      success: false,
      migrated: false,
      error: error instanceof Error ? error.message : String(error),
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`
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

export function updateRepositoryConfiguration(repositoryPath: string, config: {
  version?: number;
  limits?: Partial<RepositoryConfiguration['limits']>;
  storage?: Partial<RepositoryConfiguration['storage']>;
}): RepositoryConfiguration {
  const repoRoot = normalizeRepositoryPath(repositoryPath);
  const currentConfig = readConfiguration(repoRoot);
  
  const updatedConfig: RepositoryConfiguration = {
    ...currentConfig,
    ...(config.version !== undefined && { version: config.version }),
    limits: {
      ...currentConfig.limits,
      ...config.limits
    },
    storage: {
      ...currentConfig.storage,
      ...config.storage
    }
  };
  
  writeConfiguration(repoRoot, updatedConfig);
  return updatedConfig;
}

export function validateNoteAgainstConfig(note: Omit<StoredNote, 'id' | 'timestamp'>, repositoryPath: string): ValidationError[] {
  const repoRoot = normalizeRepositoryPath(repositoryPath);
  const config = readConfiguration(repoRoot);
  return validateNote(note, config);
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
