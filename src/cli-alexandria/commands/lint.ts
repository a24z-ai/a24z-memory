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
  .option('--list-rules', 'List all available lint rules and their configurations')
  .action(async (options) => {
    const engine = new LibraryRulesEngine();

    // Handle --list-rules option
    if (options.listRules) {
      console.log(chalk.blue('📋 Available Alexandria Lint Rules:\n'));
      
      const rules = engine.getAllRules();
      for (const [ruleId, rule] of rules) {
        console.log(chalk.bold(`${ruleId}`));
        console.log(`  ${chalk.gray('Description:')} ${rule.description}`);
        console.log(`  ${chalk.gray('Default Severity:')} ${rule.severity}`);
        console.log(`  ${chalk.gray('Impact:')} ${rule.impact}`);
        
        if (rule.fixable) {
          console.log(`  ${chalk.gray('Fixable:')} ${chalk.green('Yes')}`);
        }
        
        console.log();
      }
      
      console.log(chalk.dim('Configure rules in your .alexandriarc.json file.'));
      console.log(chalk.dim('Use --enable or --disable flags to override configuration for this run.'));
      process.exit(0);
    }

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

    // Filter violations based on --errors-only flag
    const displayViolations = options.errorsOnly
      ? violations.filter((v) => v.severity === 'error')
      : violations;

    if (displayViolations.length === 0) {
      if (options.errorsOnly && violations.length > 0) {
        console.log(chalk.green('✨ No errors found! (warnings and info suppressed)'));
      } else {
        console.log(chalk.green('✨ No issues found!'));
      }
      process.exit(0);
    }

    // Group violations by file
    const violationsByFile = new Map<string, typeof violations>();
    for (const violation of displayViolations) {
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
    const displayedErrors = options.errorsOnly ? errorCount : errorCount;
    const displayedWarnings = options.errorsOnly ? 0 : warningCount;
    const displayedInfo = options.errorsOnly ? 0 : infoCount;

    if (displayedErrors > 0) {
      parts.push(chalk.red(`${displayedErrors} error${displayedErrors !== 1 ? 's' : ''}`));
    }
    if (displayedWarnings > 0) {
      parts.push(chalk.yellow(`${displayedWarnings} warning${displayedWarnings !== 1 ? 's' : ''}`));
    }
    if (displayedInfo > 0 && !options.quiet) {
      parts.push(chalk.blue(`${displayedInfo} info`));
    }

    console.log(
      chalk.bold(
        `✖ ${displayViolations.length} problem${displayViolations.length !== 1 ? 's' : ''} (${parts.join(', ')})`
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
