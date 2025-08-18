import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

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

const DATA_DIR = path.join(os.homedir(), '.a24z');
const NOTES_FILE = path.join(DATA_DIR, 'repository-notes.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAllNotes(): StoredNote[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(NOTES_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(NOTES_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<NotesFileSchema>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.notes)) {
      return [];
    }
    return parsed.notes as StoredNote[];
  } catch {
    return [];
  }
}

function writeAllNotes(notes: StoredNote[]): void {
  ensureDataDir();
  const payload: NotesFileSchema = { version: 1, notes };
  const tmp = `${NOTES_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: 'utf8' });
  fs.renameSync(tmp, NOTES_FILE);
}

export function saveNote(note: Omit<StoredNote, 'id' | 'timestamp'>): StoredNote {
  const existing = readAllNotes();
  const saved: StoredNote = { ...note, id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, timestamp: Date.now() };
  existing.push(saved);
  writeAllNotes(existing);
  return saved;
}

export function getNotesForPath(targetPath: string, includeParentNotes: boolean, maxResults: number): Array<StoredNote & { isParentDirectory: boolean; pathDistance: number }> {
  const normalized = path.resolve(targetPath);
  const all = readAllNotes();
  const results = all
    .map(n => {
      const base = path.resolve(n.directoryPath);
      const isParent = normalized === base || normalized.startsWith(`${base}${path.sep}`);
      if (!isParent && !n.anchors.some(a => normalized.includes(path.basename(a)))) {
        return null;
      }
      const distance = isParent ? normalized.replace(base, '').split(path.sep).filter(Boolean).length : 9999;
      return { ...n, isParentDirectory: isParent, pathDistance: distance };
    })
    .filter((x): x is StoredNote & { isParentDirectory: boolean; pathDistance: number } => x !== null)
    .filter(x => includeParentNotes ? true : !x.isParentDirectory || x.directoryPath === normalized)
    .sort((a, b) => a.pathDistance - b.pathDistance || b.timestamp - a.timestamp)
    .slice(0, Math.max(1, maxResults));
  return results;
}

export function getUsedTagsForPath(targetPath: string): string[] {
  const notes = getNotesForPath(targetPath, true, 1000);
  const counts = new Map<string, number>();
  for (const n of notes) {
    for (const tag of n.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
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
