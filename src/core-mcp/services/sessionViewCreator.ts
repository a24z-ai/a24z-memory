/**
 * Session View Creator Service
 *
 * Automatically generates CodebaseViews based on file anchors.
 * Creates session views with smart default cell structures for immediate use.
 */

import * as path from 'node:path';
import * as crypto from 'crypto';
import * as fs from 'node:fs';
import { CodebaseView, codebaseViewsStore } from '../store/codebaseViewsStore';

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

export interface SessionViewResult {
  viewId: string;
  view: CodebaseView;
  inferredPatterns: PatternInference;
}

/**
 * Service for creating session-based CodebaseViews
 */
export class SessionViewCreator {
  /**
   * Create a session view based on file anchors
   */
  static createFromAnchors(
    repositoryPath: string,
    anchors: string[],
    sessionId?: string
  ): SessionViewResult {
    // Generate unique session ID if not provided
    const id = sessionId || this.generateSessionId();

    // Infer patterns from the anchors
    const patterns = this.inferPatternsFromAnchors(anchors);

    // Create the session view
    const view: CodebaseView = {
      id: `session-${id}`,
      version: '1.0.0',
      name: `Session View (${path.basename(anchors[0] || 'unknown')})`,
      description: 'Auto-generated view based on note creation patterns',
      timestamp: new Date().toISOString(),
      cells: this.createCellsFromPatterns(patterns),
      overviewPath: `.a24z/overviews/session-${id}.md`,
      metadata: {
        generationType: 'session',
      },
    };

    // Save the view
    codebaseViewsStore.saveView(repositoryPath, view);

    // Create initial session log
    this.createSessionLog(repositoryPath, view);

    return {
      viewId: view.id,
      view,
      inferredPatterns: patterns,
    };
  }

  /**
   * Analyze file anchors to infer organizational patterns
   */
  private static inferPatternsFromAnchors(anchors: string[]): PatternInference {
    // Find common path prefix
    const commonPrefix = this.findCommonPrefix(anchors);

    // Analyze directory structure
    const directories = new Set<string>();
    const extensions = new Set<string>();

    for (const anchor of anchors) {
      const dir = path.dirname(anchor);
      directories.add(dir);

      const ext = path.extname(anchor);
      if (ext) extensions.add(ext);
    }

    // Determine structure type
    let detectedStructure: PatternInference['detectedStructure'] = 'flat';
    if (directories.size > 3) {
      detectedStructure =
        directories.has('src') || directories.has('lib') ? 'organized' : 'monorepo';
    }

    // Generate cell patterns based on structure
    const cells = this.generateDefaultCells(commonPrefix, detectedStructure);

    return {
      cells,
      commonPrefix,
      detectedStructure,
    };
  }

  /**
   * Generate default cell patterns based on detected structure
   */
  private static generateDefaultCells(
    commonPrefix: string,
    _structure: PatternInference['detectedStructure']
  ): PatternInference['cells'] {
    const basePrefix = commonPrefix || '';

    return [
      {
        name: 'source',
        patterns: [
          `${basePrefix}/src/**/*`,
          `${basePrefix}/lib/**/*`,
          `${basePrefix}/**/*.{ts,js,tsx,jsx,py,go,rs,java}`.replace(/^\/+/, ''),
        ].filter((p) => p),
        coordinates: [0, 0],
        confidence: 0.8,
      },
      {
        name: 'tests',
        patterns: [
          `${basePrefix}/test*/**/*`,
          `${basePrefix}/**/*.test.*`,
          `${basePrefix}/**/*.spec.*`,
        ].filter((p) => p),
        coordinates: [0, 1],
        confidence: 0.7,
      },
      {
        name: 'config',
        patterns: ['*.config.*', 'config/**/*', '.env*', 'package.json', 'tsconfig.json'],
        coordinates: [1, 0],
        confidence: 0.6,
      },
      {
        name: 'docs',
        patterns: ['*.md', 'docs/**/*', 'README*'],
        coordinates: [1, 1],
        confidence: 0.5,
      },
    ];
  }

  /**
   * Convert pattern inference to CodebaseView cells
   */
  private static createCellsFromPatterns(patterns: PatternInference): CodebaseView['cells'] {
    const cells: CodebaseView['cells'] = {};

    for (const cell of patterns.cells) {
      cells[cell.name] = {
        patterns: cell.patterns,
        coordinates: cell.coordinates,
        priority: Math.floor(cell.confidence * 10), // Convert confidence to priority
      };
    }

    return cells;
  }

  /**
   * Find common path prefix from anchors
   */
  private static findCommonPrefix(anchors: string[]): string {
    if (anchors.length === 0) return '';
    if (anchors.length === 1) return path.dirname(anchors[0]);

    const paths = anchors.map((anchor) => anchor.split('/'));
    let commonLength = 0;

    for (let i = 0; i < paths[0].length; i++) {
      const segment = paths[0][i];
      if (paths.every((p) => p[i] === segment)) {
        commonLength++;
      } else {
        break;
      }
    }

    return paths[0].slice(0, commonLength).join('/');
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${random}`;
  }

  /**
   * Create initial session log file
   */
  private static createSessionLog(repositoryPath: string, view: CodebaseView): void {
    const a24zDir = path.join(repositoryPath, '.a24z');
    const overviewsDir = path.join(a24zDir, 'overviews');

    // Ensure directories exist
    fs.mkdirSync(overviewsDir, { recursive: true });

    const logPath = path.join(overviewsDir, `${view.id}.md`);
    const logContent = `# Session Log

**View:** ${view.id} (${view.name})  
**Created:** ${view.timestamp}

## Activity

<!-- Activity entries will be added here as notes are created -->
`;

    fs.writeFileSync(logPath, logContent);
  }

  /**
   * Append an activity entry to the session log
   */
  static appendActivity(
    repositoryPath: string,
    viewId: string,
    noteId: string,
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
