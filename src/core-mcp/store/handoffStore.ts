import * as fs from 'fs';
import * as path from 'path';
import { normalizeRepositoryPath } from '../utils/pathNormalization';

export interface HandoffReference {
  anchor: string;
  context: string;
}

export interface CreateHandoffParams {
  title: string;
  overview: string;
  references: HandoffReference[];
  directoryPath: string;
}

export interface HandoffBrief {
  id: string;
  timestamp: number;
  filepath: string;
}

/**
 * Generate a unique handoff ID
 */
function generateHandoffId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get the handoffs directory for a repository
 */
function getHandoffsDir(repositoryPath: string): string {
  const normalizedPath = normalizeRepositoryPath(repositoryPath);
  return path.join(normalizedPath, '.a24z', 'handoffs');
}

/**
 * Format handoff as markdown
 */
function formatHandoffAsMarkdown(params: CreateHandoffParams): string {
  const lines: string[] = [
    `# ${params.title}`,
    '',
    '## Overview',
    params.overview,
    '',
    '## Code & Context',
    '',
  ];

  for (const ref of params.references) {
    lines.push(`\`${ref.anchor}\``);
    lines.push(`- ${ref.context}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Save a handoff brief
 */
export function saveHandoffBrief(params: CreateHandoffParams): HandoffBrief {
  const timestamp = Date.now();
  const id = generateHandoffId();
  const handoffId = `handoff-${timestamp}-${id}`;

  // Create year/month directory structure
  const date = new Date(timestamp);
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  const handoffsDir = getHandoffsDir(params.directoryPath);
  const yearMonthDir = path.join(handoffsDir, year, month);

  // Ensure directory exists
  fs.mkdirSync(yearMonthDir, { recursive: true });

  // Save markdown file
  const filename = `${handoffId}.md`;
  const filepath = path.join(yearMonthDir, filename);
  const content = formatHandoffAsMarkdown(params);

  fs.writeFileSync(filepath, content, 'utf8');

  return {
    id: handoffId,
    timestamp,
    filepath,
  };
}

/**
 * Get all handoff briefs for a repository
 */
export function getHandoffBriefs(
  repositoryPath: string,
  options?: {
    limit?: number;
    since?: number;
  }
): HandoffBrief[] {
  const handoffsDir = getHandoffsDir(repositoryPath);
  const results: HandoffBrief[] = [];

  if (!fs.existsSync(handoffsDir)) {
    return results;
  }

  // Read year directories
  const years = fs
    .readdirSync(handoffsDir)
    .filter((y) => fs.statSync(path.join(handoffsDir, y)).isDirectory())
    .sort()
    .reverse(); // Most recent first

  for (const year of years) {
    const yearDir = path.join(handoffsDir, year);
    const months = fs
      .readdirSync(yearDir)
      .filter((m) => fs.statSync(path.join(yearDir, m)).isDirectory())
      .sort()
      .reverse(); // Most recent first

    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      const files = fs
        .readdirSync(monthDir)
        .filter((f) => f.endsWith('.md'))
        .sort()
        .reverse(); // Most recent first

      for (const file of files) {
        // Extract timestamp from filename
        const match = file.match(/handoff-(\d+)-([a-z0-9]+)\.md/);
        if (!match) continue;

        const timestamp = parseInt(match[1], 10);
        const id = `handoff-${match[1]}-${match[2]}`;

        // Apply filters
        if (options?.since && timestamp < options.since) continue;

        const filepath = path.join(monthDir, file);

        results.push({
          id,
          timestamp,
          filepath,
        });

        // Apply limit
        if (options?.limit && results.length >= options.limit) {
          return results;
        }
      }
    }
  }

  return results;
}

/**
 * Get handoff content by reading the file
 */
export function getHandoffContent(repositoryPath: string, handoffId: string): string | null {
  // Extract timestamp from ID to find the file
  const match = handoffId.match(/handoff-(\d+)-([a-z0-9]+)/);
  if (!match) return null;

  const timestamp = parseInt(match[1], 10);
  const date = new Date(timestamp);
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  const handoffsDir = getHandoffsDir(repositoryPath);
  const filepath = path.join(handoffsDir, year, month, `${handoffId}.md`);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  return fs.readFileSync(filepath, 'utf8');
}

/**
 * Delete a handoff brief (used for ephemeral handoffs)
 */
export function deleteHandoffBrief(repositoryPath: string, handoffId: string): boolean {
  // Extract timestamp from ID to find the file
  const match = handoffId.match(/handoff-(\d+)-([a-z0-9]+)/);
  if (!match) return false;

  const timestamp = parseInt(match[1], 10);
  const date = new Date(timestamp);
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  const handoffsDir = getHandoffsDir(repositoryPath);
  const filepath = path.join(handoffsDir, year, month, `${handoffId}.md`);

  if (!fs.existsSync(filepath)) {
    return false;
  }

  try {
    fs.unlinkSync(filepath);
    return true;
  } catch {
    return false;
  }
}

export interface HandoffBriefWithTitle extends HandoffBrief {
  title: string;
}

/**
 * Get all handoff briefs with their titles extracted from the markdown files
 */
export function getHandoffBriefsWithTitles(
  repositoryPath: string,
  options?: {
    limit?: number;
    since?: number;
  }
): HandoffBriefWithTitle[] {
  const briefs = getHandoffBriefs(repositoryPath, options);
  const results: HandoffBriefWithTitle[] = [];

  for (const brief of briefs) {
    try {
      const content = fs.readFileSync(brief.filepath, 'utf8');
      // Extract title from the first markdown heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : 'Untitled Handoff';

      results.push({
        ...brief,
        title,
      });
    } catch {
      // If we can't read the file, skip it or use a fallback title
      results.push({
        ...brief,
        title: `Handoff ${brief.id}`,
      });
    }
  }

  return results;
}
