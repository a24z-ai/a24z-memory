import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { normalizeRepositoryPath, getRepositoryName } from '../utils/pathNormalization';

export type NoteConfidence = 'high' | 'medium' | 'low';
export type NoteType = 'decision' | 'pattern' | 'gotcha' | 'explanation';

export interface StoredNote {
  id: string;
  note: string;
  directoryPath: string;
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
  console.log('[getRepositoryDataDir] DEBUG: repositoryPath =', repositoryPath);
  console.log('[getRepositoryDataDir] DEBUG: A24Z_TEST_DATA_DIR =', process.env.A24Z_TEST_DATA_DIR);
  if (process.env.A24Z_TEST_DATA_DIR) {
    console.log('[getRepositoryDataDir] DEBUG: using test data dir =', process.env.A24Z_TEST_DATA_DIR);
    return process.env.A24Z_TEST_DATA_DIR;
  }
  const result = path.join(repositoryPath, '.a24z');
  console.log('[getRepositoryDataDir] DEBUG: using repository-specific dir =', result);
  return result;
}

function getNotesFile(repositoryPath: string): string {
  return path.join(getRepositoryDataDir(repositoryPath), 'repository-notes.json');
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
    console.log('[readAllNotes] DEBUG: trying to read from =', notesFile);
    ensureDataDir(repositoryPath);
    if (!fs.existsSync(notesFile)) {
      console.log('[readAllNotes] DEBUG: file does not exist =', notesFile);
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

export function saveNote(note: Omit<StoredNote, 'id' | 'timestamp'>): StoredNote {
  const normalizedPath = normalizeRepositoryPath(note.directoryPath);
  const existing = readAllNotes(normalizedPath);
  const saved: StoredNote = { 
    ...note, 
    directoryPath: normalizedPath, // Use normalized path
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, 
    timestamp: Date.now() 
  };
  existing.push(saved);
  writeAllNotes(normalizedPath, existing);
  return saved;
}

export function getNotesForPath(targetPath: string, includeParentNotes: boolean, maxResults: number): Array<StoredNote & { isParentDirectory: boolean; pathDistance: number }> {
  console.log('[getNotesForPath] DEBUG: targetPath =', targetPath);
  const normalized = path.resolve(targetPath);
  console.log('[getNotesForPath] DEBUG: normalized =', normalized);
  const normalizedRepo = normalizeRepositoryPath(targetPath);
  console.log('[getNotesForPath] DEBUG: normalizedRepo =', normalizedRepo);
  const all = readAllNotes(normalizedRepo);
  console.log('[getNotesForPath] DEBUG: readAllNotes returned', all.length, 'notes');
  const results = all
    .map((n: StoredNote) => {
      const base = path.resolve(n.directoryPath);
      const isParent = normalized === base || normalized.startsWith(`${base}${path.sep}`);
      if (!isParent && !n.anchors.some((a: string) => normalized.includes(path.basename(a)))) {
        return null;
      }
      const distance = isParent ? normalized.replace(base, '').split(path.sep).filter(Boolean).length : 9999;
      return { ...n, isParentDirectory: isParent, pathDistance: distance };
    })
    .filter((x): x is StoredNote & { isParentDirectory: boolean; pathDistance: number } => x !== null)
    .filter((x: StoredNote & { isParentDirectory: boolean; pathDistance: number }) => includeParentNotes ? true : !x.isParentDirectory || x.directoryPath === normalized)
    .sort((a: StoredNote & { isParentDirectory: boolean; pathDistance: number }, b: StoredNote & { isParentDirectory: boolean; pathDistance: number }) => a.pathDistance - b.pathDistance || b.timestamp - a.timestamp)
    .slice(0, Math.max(1, maxResults));
  console.log('[getNotesForPath] DEBUG: returning', results.length, 'results');
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
