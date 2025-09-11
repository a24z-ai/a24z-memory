import { LibraryRule, LibraryRuleViolation, LibraryRuleContext } from '../types';
import { FilenameConventionOptions, FilenameStyle } from '../../config/types';
import * as path from 'path';
import * as fs from 'fs/promises';

// Default exceptions for common files
const DEFAULT_EXCEPTIONS = [
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'AUTHORS.md',
  'CONTRIBUTORS.md',
];

// Default extensions to check
const DEFAULT_EXTENSIONS = ['.md', '.mdx'];

// Default documentation folders
const DEFAULT_DOC_FOLDERS = ['docs', 'documentation', 'doc'];

export const filenameConvention: LibraryRule = {
  id: 'filename-convention',
  name: 'Filename Convention',
  severity: 'warning',
  category: 'structure',
  description: 'Enforces consistent filename conventions for documentation files',
  impact:
    'Inconsistent filename conventions make it harder to locate and reference documentation, reducing maintainability',
  fixable: true,
  enabled: true,
  options: {
    style: 'kebab-case' as FilenameStyle,
    extensions: DEFAULT_EXTENSIONS,
    exceptions: DEFAULT_EXCEPTIONS,
    documentFoldersOnly: false,
    autoFix: false,
  } as FilenameConventionOptions,

  async check(context: LibraryRuleContext): Promise<LibraryRuleViolation[]> {
    const violations: LibraryRuleViolation[] = [];
    const { files, markdownFiles, config } = context;

    // Get options from config or use defaults
    const ruleConfig = config?.context?.rules?.find((r) => r.id === 'filename-convention');
    const configOptions = ruleConfig?.options as FilenameConventionOptions | undefined;
    const defaultOptions = this.options as FilenameConventionOptions;

    const options: FilenameConventionOptions = {
      // Only set style if explicitly provided, not when separator is used
      style: configOptions?.style || (configOptions?.separator ? undefined : defaultOptions.style),
      separator: configOptions?.separator,
      caseStyle: configOptions?.caseStyle,
      extensions: configOptions?.extensions || defaultOptions.extensions || DEFAULT_EXTENSIONS,
      exclude: configOptions?.exclude || [],
      exceptions: configOptions?.exceptions || defaultOptions.exceptions || DEFAULT_EXCEPTIONS,
      documentFoldersOnly:
        configOptions?.documentFoldersOnly !== undefined
          ? configOptions.documentFoldersOnly
          : defaultOptions.documentFoldersOnly,
      autoFix: configOptions?.autoFix || defaultOptions.autoFix,
    };

    // Determine which files to check based on extensions
    let filesToCheck = options.extensions.includes('.md') || options.extensions.includes('.mdx')
      ? markdownFiles
      : files.filter(f => options.extensions.some(ext => f.relativePath.endsWith(ext)));

    for (const fileInfo of filesToCheck) {
      const fileName = path.basename(fileInfo.relativePath);
      const fileNameWithoutExt = path.basename(fileInfo.relativePath, path.extname(fileInfo.relativePath));
      const dirName = path.dirname(fileInfo.relativePath);

      // Check if file matches any exclude pattern
      if (options.exclude?.some(pattern => fileInfo.relativePath.includes(pattern))) {
        continue;
      }

      // Check if file is in exceptions list
      if (options.exceptions?.some((exception) => fileName === exception)) {
        continue;
      }

      // If documentFoldersOnly is true, only check files in documentation folders
      if (options.documentFoldersOnly) {
        const pathParts = dirName.split(path.sep).filter(Boolean);
        const isInDocFolder = pathParts.some((part) =>
          DEFAULT_DOC_FOLDERS.some((docFolder) => part.toLowerCase() === docFolder.toLowerCase())
        );

        if (!isInDocFolder) {
          continue;
        }
      }

      // Check if filename matches the specified convention
      const expectedFileName = convertToConvention(fileNameWithoutExt, options);
      const expectedFullName = expectedFileName + path.extname(fileInfo.relativePath);

      if (fileNameWithoutExt !== expectedFileName) {
        violations.push({
          ruleId: this.id,
          severity: this.severity,
          file: fileInfo.relativePath,
          message: `File "${fileName}" should be named "${expectedFullName}" to match ${getStyleName(options)} convention`,
          impact: this.impact,
          fixable: this.fixable,
          line: 1,
        });
      }
    }

    return violations;
  },

  async fix(violation: LibraryRuleViolation, context: LibraryRuleContext): Promise<void> {
    if (!violation.file) return;

    const { projectRoot, config } = context;
    const ruleConfig = config?.context?.rules?.find((r) => r.id === 'filename-convention');
    const configOptions = ruleConfig?.options as FilenameConventionOptions | undefined;
    const defaultOptions = this.options as FilenameConventionOptions;

    const options: FilenameConventionOptions = {
      style: configOptions?.style || defaultOptions.style,
      separator: configOptions?.separator,
      caseStyle: configOptions?.caseStyle,
      autoFix: configOptions?.autoFix || defaultOptions.autoFix,
    };

    if (!options.autoFix) {
      console.log(`Auto-fix is disabled for ${this.id}. Enable it in configuration to fix automatically.`);
      return;
    }

    const oldPath = path.join(projectRoot, violation.file);
    const fileName = path.basename(violation.file);
    const fileNameWithoutExt = path.basename(violation.file, path.extname(violation.file));
    const dirName = path.dirname(violation.file);

    const expectedFileName = convertToConvention(fileNameWithoutExt, options);
    const expectedFullName = expectedFileName + path.extname(violation.file);
    const newPath = path.join(projectRoot, dirName, expectedFullName);

    try {
      await fs.rename(oldPath, newPath);
      console.log(`Renamed "${fileName}" to "${expectedFullName}"`);
    } catch (error) {
      console.error(`Failed to rename file: ${error}`);
      throw error;
    }
  },

  convertToConvention,
  getStyleName,
};

// Helper method to convert filename to specified convention
export function convertToConvention(filename: string, options: FilenameConventionOptions): string {
    // Split into words by handling various cases
    const words = filename
      // Insert space before uppercase letters that follow lowercase
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Insert space before uppercase letters that follow uppercase and are followed by lowercase
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      // Replace separators with spaces
      .replace(/[-_.\s]+/g, ' ')
      .toLowerCase()
      .trim()
      .split(' ')
      .filter(Boolean);

    let result: string;

    // If custom separator is provided, use it (unless a specific style overrides it)
    if (options.separator && !options.style) {
      result = words.join(options.separator);
    } else {
      switch (options.style) {
        case 'snake_case':
          result = words.join('_');
          break;

        case 'kebab-case':
          result = words.join('-');
          break;

        case 'camelCase':
          if (words.length === 0) {
            result = '';
          } else {
            result = words[0] + words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
          }
          break;

        case 'PascalCase':
          result = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
          break;

        case 'lowercase':
          result = words.join('');
          break;

        case 'UPPERCASE':
          result = words.join('').toUpperCase();
          break;

        default:
          // Use custom separator if provided, otherwise default to kebab-case
          result = words.join(options.separator || '-');
      }
    }

    // Apply case style if specified and not already handled by style
    if (options.caseStyle && !['lowercase', 'UPPERCASE', 'camelCase', 'PascalCase'].includes(options.style || '')) {
      switch (options.caseStyle) {
        case 'lower':
          result = result.toLowerCase();
          break;
        case 'upper':
          result = result.toUpperCase();
          break;
        // 'mixed' leaves it as is
      }
    }

    return result;
  }

// Helper method to get human-readable style name
export function getStyleName(options: FilenameConventionOptions): string {
    if (options.style) {
      return options.style;
    }
    if (options.separator) {
      const separatorName = {
        '_': 'underscore-separated',
        '-': 'hyphen-separated',
        ' ': 'space-separated',
        '.': 'dot-separated',
      }[options.separator] || 'custom-separated';

      if (options.caseStyle) {
        return `${options.caseStyle}case ${separatorName}`;
      }
      return separatorName;
    }
    return 'specified';
  }