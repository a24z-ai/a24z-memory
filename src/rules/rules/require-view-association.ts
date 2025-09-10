import { LibraryRule, LibraryRuleViolation, LibraryRuleContext } from '../types';
import { ALEXANDRIA_DIRS } from '../../constants/paths';

export const requireViewAssociation: LibraryRule = {
  id: 'require-view-association',
  name: 'Require View Association',
  severity: 'error',
  category: 'critical',
  description: 'Every markdown file must be associated with at least one CodebaseView',
  impact: 'AI agents lack structured context for understanding this documentation',
  fixable: false,
  enabled: true,

  async check(context: LibraryRuleContext): Promise<LibraryRuleViolation[]> {
    const violations: LibraryRuleViolation[] = [];
    const { markdownFiles, views, notes } = context;

    // Build a set of all markdown files that are associated with views or notes
    const associatedFiles = new Set<string>();

    // Check files directly referenced in view cells and overviews
    for (const view of views) {
      // Check overview path
      if (
        'overviewPath' in view &&
        typeof view.overviewPath === 'string' &&
        view.overviewPath.endsWith('.md')
      ) {
        associatedFiles.add(view.overviewPath);
      }

      // Check files in cells
      if (view.cells) {
        for (const cellName in view.cells) {
          const cell = view.cells[cellName];
          // Check if it's a file cell (has 'files' property)
          if ('files' in cell && Array.isArray(cell.files)) {
            for (const file of cell.files) {
              if (file.endsWith('.md')) {
                associatedFiles.add(file);
              }
            }
          }
        }
      }
    }

    // Check files referenced in notes
    for (const noteWithPath of notes) {
      for (const anchorPath of noteWithPath.note.anchors) {
        if (anchorPath.endsWith('.md')) {
          associatedFiles.add(anchorPath);
        }
      }
    }

    // Find markdown files that are not associated
    for (const mdFile of markdownFiles) {
      const relativePath = mdFile.relativePath;

      // Skip alexandria's own files
      if (relativePath.startsWith(`${ALEXANDRIA_DIRS.PRIMARY}/`)) {
        continue;
      }

      if (!associatedFiles.has(relativePath)) {
        violations.push({
          ruleId: this.id,
          severity: this.severity,
          file: relativePath,
          message: `Markdown file "${relativePath}" is not associated with any CodebaseView`,
          impact: this.impact,
          fixable: this.fixable,
        });
      }
    }

    return violations;
  },
};
