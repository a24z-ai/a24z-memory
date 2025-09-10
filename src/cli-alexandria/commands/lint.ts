import { Command } from 'commander';
import { LibraryRulesEngine } from '../../rules';
import chalk from 'chalk';

export const lintCommand = new Command('lint')
  .description('Lint your Alexandria library for context quality issues')
  .option('--fix', 'Automatically fix fixable violations')
  .option('--json', 'Output results as JSON')
  .option('--quiet', 'Only show errors')
  .option('--errors-only', 'Exit with error code only if there are errors (not warnings)')
  .option('--enable <rules...>', 'Enable specific rules')
  .option('--disable <rules...>', 'Disable specific rules')
  .action(async (options) => {
    const engine = new LibraryRulesEngine();

    console.log(chalk.blue('🔍 Linting Alexandria library...\n'));

    const result = await engine.lint(process.cwd(), {
      enabledRules: options.enable,
      disabledRules: options.disable,
      fix: options.fix,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      const exitCode = options.errorsOnly
        ? result.errorCount > 0
          ? 1
          : 0
        : result.violations.length > 0
          ? 1
          : 0;
      process.exit(exitCode);
    }

    // Format output similar to ESLint
    const { violations, errorCount, warningCount, infoCount, fixableCount } = result;

    if (violations.length === 0) {
      console.log(chalk.green('✨ No issues found!'));
      process.exit(0);
    }

    // Group violations by file
    const violationsByFile = new Map<string, typeof violations>();
    for (const violation of violations) {
      const file = violation.file || 'General';
      if (!violationsByFile.has(file)) {
        violationsByFile.set(file, []);
      }
      violationsByFile.get(file)!.push(violation);
    }

    // Display violations
    for (const [file, fileViolations] of violationsByFile) {
      console.log(chalk.underline(file));

      for (const violation of fileViolations) {
        const icon =
          violation.severity === 'error' ? '✖' : violation.severity === 'warning' ? '⚠' : 'ℹ';
        const color =
          violation.severity === 'error'
            ? chalk.red
            : violation.severity === 'warning'
              ? chalk.yellow
              : chalk.blue;

        // Include line number if available
        const location = violation.line ? chalk.gray(`  ${violation.line}:1`) : '  ';

        console.log(`${location}  ${color(icon)} ${violation.message}`);
        if (!options.quiet) {
          console.log(chalk.gray(`      rule: ${violation.ruleId}`));
          console.log(chalk.gray(`      impact: ${violation.impact}`));
        }
      }
      console.log();
    }

    // Summary
    const parts = [];
    if (errorCount > 0) {
      parts.push(chalk.red(`${errorCount} error${errorCount !== 1 ? 's' : ''}`));
    }
    if (warningCount > 0) {
      parts.push(chalk.yellow(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`));
    }
    if (infoCount > 0 && !options.quiet) {
      parts.push(chalk.blue(`${infoCount} info`));
    }

    console.log(
      chalk.bold(
        `✖ ${violations.length} problem${violations.length !== 1 ? 's' : ''} (${parts.join(', ')})`
      )
    );

    if (fixableCount > 0 && !options.fix) {
      console.log(
        chalk.dim(
          `\n${fixableCount} error${fixableCount !== 1 ? 's' : ''} and warning${fixableCount !== 1 ? 's' : ''} potentially fixable with --fix`
        )
      );
    }

    // Determine exit code based on options
    const exitCode = options.errorsOnly ? (errorCount > 0 ? 1 : 0) : violations.length > 0 ? 1 : 0;
    process.exit(exitCode);
  });
