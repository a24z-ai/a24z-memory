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

function getGuidanceFile(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'note-guidance.md');
}

function ensureDataDir(repositoryPath: string): void {
  const dataDir = getRepositoryDataDir(repositoryPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readAllNotes(repositoryPath: string): StoredNote[] {
  try {
    const notesFile = getNotesFile(repositoryPath);
    ensureDataDir(repositoryPath);
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

function writeAllNotes(repositoryPath: string, notes: StoredNote[]): void {
  const notesFile = getNotesFile(repositoryPath);
  ensureDataDir(repositoryPath);
  const payload: NotesFileSchema = { version: 1, notes };
  const tmp = `${notesFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: 'utf8' });
  fs.renameSync(tmp, notesFile);
}

export function saveNote(note: Omit<StoredNote, 'id' | 'timestamp'> & { directoryPath: string }): StoredNote {
  const repoRoot = normalizeRepositoryPath(note.directoryPath);
  const originalDirPath = path.resolve(note.directoryPath);
  
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
  
  const existing = readAllNotes(repoRoot);
  const { directoryPath, ...noteWithoutDirectoryPath } = note;
  const saved: StoredNote = { 
    ...noteWithoutDirectoryPath, 
    anchors: normalizedAnchors, // Use normalized anchors
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, 
    timestamp: Date.now() 
  };
  existing.push(saved);
  writeAllNotes(repoRoot, existing);
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
