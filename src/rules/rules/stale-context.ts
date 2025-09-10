import { LibraryRule, LibraryRuleViolation, LibraryRuleContext } from '../types';
import { execSync } from 'child_process';
import { join } from 'path';
import { getNotesDir } from '../../utils/alexandria-paths';

export const staleContext: LibraryRule = {
  id: 'stale-context',
  name: 'Stale Context',
  severity: 'warning',
  category: 'quality',
  description: 'Context documentation has not been updated since referenced files changed',
  impact: 'AI agents may use outdated patterns and assumptions from stale documentation',
  fixable: false,
  enabled: true,

  async check(context: LibraryRuleContext): Promise<LibraryRuleViolation[]> {
    const violations: LibraryRuleViolation[] = [];
    const { views, notes, projectRoot } = context;

    try {
      // Helper to get last git modification date for a file
      const getLastGitModified = (filePath: string): Date | null => {
        try {
          const relativePath = filePath.replace(projectRoot + '/', '');
          const gitCommand = `cd "${projectRoot}" && git log -1 --format=%at -- "${relativePath}" 2>/dev/null`;
          const timestamp = execSync(gitCommand, { encoding: 'utf-8' }).trim();
          if (timestamp) {
            return new Date(parseInt(timestamp) * 1000);
          }
        } catch {
          // File might not be in git yet
        }
        return null;
      };

      // Check views with overview files
      for (const view of views) {
        // Only check views that have an overview file
        if (!view.overviewPath) continue;

        const overviewPath = join(projectRoot, view.overviewPath);
        const overviewLastModified = getLastGitModified(overviewPath);

        if (!overviewLastModified) continue;

        // Check if any referenced files have been modified after the overview
        let newestFileModification: Date | null = null;
        let newestFile: string | null = null;

        if (view.cells) {
          for (const cellName in view.cells) {
            const cell = view.cells[cellName];
            // Check if it's a file cell (has 'files' property)
            if ('files' in cell && Array.isArray(cell.files)) {
              for (const file of cell.files) {
                const filePath = join(projectRoot, file);
                const fileModified = getLastGitModified(filePath);
                if (
                  fileModified &&
                  (!newestFileModification || fileModified > newestFileModification)
                ) {
                  newestFileModification = fileModified;
                  newestFile = file;
                }
              }
            }
          }
        }

        if (newestFileModification && newestFileModification > overviewLastModified) {
          const hoursSinceUpdate = Math.floor(
            (newestFileModification.getTime() - overviewLastModified.getTime()) / (1000 * 60 * 60)
          );

          let timeMessage: string;
          if (hoursSinceUpdate < 24) {
            if (hoursSinceUpdate === 0) {
              timeMessage = 'was modified after';
            } else if (hoursSinceUpdate === 1) {
              timeMessage = 'has not been updated for 1 hour since';
            } else {
              timeMessage = `has not been updated for ${hoursSinceUpdate} hours since`;
            }
          } else {
            const daysSinceUpdate = Math.floor(hoursSinceUpdate / 24);
            if (daysSinceUpdate === 1) {
              timeMessage = 'has not been updated for 1 day since';
            } else {
              timeMessage = `has not been updated for ${daysSinceUpdate} days since`;
            }
          }

          violations.push({
            ruleId: this.id,
            severity: this.severity,
            file: view.overviewPath,
            message: `Overview "${view.overviewPath}" ${timeMessage} "${newestFile}" changed`,
            impact: this.impact,
            fixable: this.fixable,
          });
        }
      }

      // Check notes with file references
      for (const noteWithPath of notes) {
        if (!noteWithPath.note.anchors || noteWithPath.note.anchors.length === 0) continue;

        const notePath = join(getNotesDir(projectRoot), `${noteWithPath.note.id}.json`);
        const noteLastModified = getLastGitModified(notePath);

        if (!noteLastModified) continue;

        let newestFileModification: Date | null = null;
        let newestFile: string | null = null;

        for (const anchorPath of noteWithPath.note.anchors) {
          const filePath = join(projectRoot, anchorPath);
          const fileModified = getLastGitModified(filePath);
          if (fileModified && (!newestFileModification || fileModified > newestFileModification)) {
            newestFileModification = fileModified;
            newestFile = anchorPath;
          }
        }

        if (newestFileModification && newestFileModification > noteLastModified) {
          const hoursSinceUpdate = Math.floor(
            (newestFileModification.getTime() - noteLastModified.getTime()) / (1000 * 60 * 60)
          );

          let timeMessage: string;
          if (hoursSinceUpdate < 24) {
            if (hoursSinceUpdate === 0) {
              timeMessage = 'was modified after';
            } else if (hoursSinceUpdate === 1) {
              timeMessage = 'has not been updated for 1 hour since';
            } else {
              timeMessage = `has not been updated for ${hoursSinceUpdate} hours since`;
            }
          } else {
            const daysSinceUpdate = Math.floor(hoursSinceUpdate / 24);
            if (daysSinceUpdate === 1) {
              timeMessage = 'has not been updated for 1 day since';
            } else {
              timeMessage = `has not been updated for ${daysSinceUpdate} days since`;
            }
          }

          violations.push({
            ruleId: this.id,
            severity: this.severity,
            file: `notes/${noteWithPath.note.id}.json`,
            message: `Note "${noteWithPath.note.id}" ${timeMessage} "${newestFile}" changed`,
            impact: this.impact,
            fixable: this.fixable,
          });
        }
      }
    } catch (error) {
      // If git is not available or other errors, skip this rule
      console.warn('Stale context rule skipped:', error);
    }

    return violations;
  },
};
