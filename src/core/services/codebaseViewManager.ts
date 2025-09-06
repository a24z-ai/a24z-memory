/**
 * Session View Creator Service
 *
 * Automatically generates CodebaseViews based on file anchors.
 * Creates session views with smart default cell structures for immediate use.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { CodebaseView } from '../../pure-core/types';

export interface PatternInference {
  cells: Array<{
    name: string;
    patterns: string[];
    coordinates: [number, number];
    confidence: number;
  }>;
  commonPrefix: string;
  detectedStructure: 'flat' | 'organized' | 'monorepo';
}

export interface CodebaseViewResult {
  viewId: string;
  view: CodebaseView;
  inferredPatterns: PatternInference;
}

/**
 * Service for creating session-based CodebaseViews
 */
export class CodebaseViewManager {

  /**
   * Append an activity entry to the session log
   */
  static appendActivity(
    repositoryPath: string,
    viewId: string,
    noteContent: string,
    mainAnchor: string
  ): void {
    const logPath = path.join(repositoryPath, '.a24z', 'overviews', `${viewId}.md`);

    // Only append if the log file exists (for session views)
    if (!fs.existsSync(logPath)) return;

    const timestamp =
      new Date().toISOString().split('T')[0] +
      ' ' +
      new Date().toLocaleTimeString('en-US', { hour12: false });
    const summary = noteContent.length > 50 ? noteContent.substring(0, 50) + '...' : noteContent;
    const fileName = path.basename(mainAnchor);

    const entry = `- ${timestamp} - Note created: "${summary}" (${fileName})\n`;

    // Read current content and append
    const currentContent = fs.readFileSync(logPath, 'utf-8');
    const updatedContent = currentContent.replace(
      '<!-- Activity entries will be added here as notes are created -->',
      `<!-- Activity entries will be added here as notes are created -->\n${entry}`
    );

    fs.writeFileSync(logPath, updatedContent);
  }
}
