import { LibraryRule, LibraryRuleViolation, LibraryRuleContext } from '../types';
import { DocumentOrganizationOptions } from '../../config/types';
import * as path from 'path';
import { globby } from 'globby';

// Default allowed root-level documentation files
const DEFAULT_ROOT_EXCEPTIONS = [
  'README.md',
  'readme.md',
  'CHANGELOG.md',
  'changelog.md',
  'CONTRIBUTING.md',
  'contributing.md',
  'LICENSE.md',
  'license.md',
  'CODE_OF_CONDUCT.md',
  'code_of_conduct.md',
  'SECURITY.md',
  'security.md',
  'AUTHORS.md',
  'authors.md',
  'CONTRIBUTORS.md',
  'contributors.md',
  'INSTALL.md',
  'install.md',
  'SETUP.md',
  'setup.md',
];

// Default documentation folder names
const DEFAULT_DOC_FOLDERS = ['docs', 'documentation', 'doc'];

export const documentOrganization: LibraryRule = {
  id: 'document-organization',
  name: 'Document Organization',
  severity: 'warning',
  category: 'structure',
  description: 'Ensures documentation files are properly organized in designated folders',
  impact:
    'Disorganized documentation makes it harder for both humans and AI agents to find relevant information',
  fixable: false,
  enabled: true,
  options: {
    documentFolders: DEFAULT_DOC_FOLDERS,
    rootExceptions: DEFAULT_ROOT_EXCEPTIONS,
    checkNested: true,
  } as DocumentOrganizationOptions,

  async check(context: LibraryRuleContext): Promise<LibraryRuleViolation[]> {
    const violations: LibraryRuleViolation[] = [];
    const { projectRoot, config } = context;

    // Get options from config or use defaults
    const ruleConfig = config?.context?.rules?.find((r) => r.id === 'document-organization');
    const configOptions = ruleConfig?.options as DocumentOrganizationOptions | undefined;
    const defaultOptions = this.options as DocumentOrganizationOptions;

    const options: DocumentOrganizationOptions = {
      documentFolders:
        configOptions?.documentFolders || defaultOptions.documentFolders || DEFAULT_DOC_FOLDERS,
      rootExceptions:
        configOptions?.rootExceptions || defaultOptions.rootExceptions || DEFAULT_ROOT_EXCEPTIONS,
      checkNested:
        configOptions?.checkNested !== undefined
          ? configOptions.checkNested
          : defaultOptions.checkNested !== false,
    };

    try {
      // Find all markdown files in the repository
      const markdownFiles = await globby(['**/*.md', '**/*.mdx'], {
        cwd: projectRoot,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/.alexandria/**',
          '**/coverage/**',
        ],
        gitignore: true,
        dot: false,
        onlyFiles: true,
      });

      for (const file of markdownFiles) {
        const fileName = path.basename(file);
        const dirName = path.dirname(file);
        const pathParts = dirName.split(path.sep).filter(Boolean);

        // Check if file is in root directory
        if (dirName === '.' || dirName === '') {
          // Check if it's an allowed root file
          const isAllowedException =
            options.rootExceptions?.some(
              (exception) => fileName.toLowerCase() === exception.toLowerCase()
            ) || false;

          if (!isAllowedException) {
            violations.push({
              ruleId: this.id,
              severity: this.severity,
              file: file,
              message: `Documentation file "${fileName}" should be in a documentation folder (e.g., ${options.documentFolders?.join(', ') || 'docs'}) instead of the root directory`,
              impact: this.impact,
              fixable: this.fixable,
              line: 1,
            });
          }
        } else {
          // Check if file is in a proper documentation folder
          let isInDocFolder = false;

          if (options.checkNested) {
            // Check if any parent directory is a documentation folder
            isInDocFolder = pathParts.some(
              (part) =>
                options.documentFolders?.some(
                  (docFolder) => part.toLowerCase() === docFolder.toLowerCase()
                ) || false
            );
          } else {
            // Only check immediate parent directory
            const immediateParent = pathParts[pathParts.length - 1];
            isInDocFolder =
              options.documentFolders?.some(
                (docFolder) => immediateParent?.toLowerCase() === docFolder.toLowerCase()
              ) || false;
          }

          // Also check if it's in a special directory that might be okay
          const isInSpecialDir = pathParts.some(
            (part) =>
              part === '.github' ||
              part === 'templates' ||
              part === 'examples' ||
              part === '.changeset'
          );

          if (!isInDocFolder && !isInSpecialDir) {
            // Check if this specific file is an exception even when not in root
            const isException = DEFAULT_ROOT_EXCEPTIONS.some(
              (exception) => fileName.toLowerCase() === exception.toLowerCase()
            );

            if (!isException) {
              violations.push({
                ruleId: this.id,
                severity: this.severity,
                file: file,
                message: `Documentation file "${file}" should be in a documentation folder (e.g., ${options.documentFolders?.map((f) => `${f}/`).join(', ') || 'docs/'})`,
                impact: this.impact,
                fixable: this.fixable,
                line: 1,
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Document organization rule skipped:', error);
    }

    return violations;
  },
};
