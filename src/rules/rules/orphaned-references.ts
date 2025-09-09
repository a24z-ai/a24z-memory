import { LibraryRule, LibraryRuleViolation, LibraryRuleContext } from '../types';
import { existsSync } from 'fs';
import { join } from 'path';

export const orphanedReferences: LibraryRule = {
  id: 'orphaned-references',
  name: 'Orphaned File References',
  severity: 'error',
  category: 'critical',
  description: 'Context references files that no longer exist in the codebase',
  impact: 'AI agents will reference non-existent files, causing errors and confusion',
  fixable: false,
  enabled: true,

  async check(context: LibraryRuleContext): Promise<LibraryRuleViolation[]> {
    const violations: LibraryRuleViolation[] = [];
    const { views, notes, projectRoot } = context;

    // Check files referenced in view cells
    for (const view of views) {
      if (view.cells) {
        for (const cellName in view.cells) {
          const cell = view.cells[cellName];
          // Check if it's a file cell (has 'files' property)
          if ('files' in cell && Array.isArray(cell.files)) {
            for (const file of cell.files) {
              const fullPath = join(projectRoot, file);
              if (!existsSync(fullPath)) {
                violations.push({
                  ruleId: this.id,
                  severity: this.severity,
                  file: `views/${view.name}.json`,
                  message: `View "${view.name}" cell "${cellName}" references non-existent file: ${file}`,
                  impact: this.impact,
                  fixable: this.fixable,
                });
              }
            }
          }
        }
      }
    }

    // Check files referenced in notes
    for (const noteWithPath of notes) {
      for (const anchorPath of noteWithPath.note.anchors) {
        const fullPath = join(projectRoot, anchorPath);
        if (!existsSync(fullPath)) {
          violations.push({
            ruleId: this.id,
            severity: this.severity,
            file: `notes/${noteWithPath.note.id}.json`,
            message: `Note "${noteWithPath.note.id}" references non-existent file: ${anchorPath}`,
            impact: this.impact,
            fixable: this.fixable,
          });
        }
      }
    }

    return violations;
  },
};
