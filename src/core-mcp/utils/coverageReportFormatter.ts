import type { NoteCoverageReport } from './noteCoverage';

/**
 * Format coverage report as markdown
 */
export function formatCoverageReport(report: NoteCoverageReport): string {
  const { metrics, coverageByType, filesWithMostNotes, largestUncoveredFiles, staleNotes } = report;

  let output = '# Note Coverage Report\n\n';

  // Summary
  output += '## Summary\n\n';
  output += `📊 **Overall Coverage**: ${metrics.fileCoveragePercentage.toFixed(1)}% of eligible files have notes\n\n`;

  // Key metrics
  output += '### Key Metrics\n\n';
  output += `- **Eligible Files**: ${metrics.totalEligibleFiles} files\n`;
  output += `- **Files with Notes**: ${metrics.filesWithNotes} files\n`;
  output += `- **Coverage**: ${metrics.fileCoveragePercentage.toFixed(1)}%\n`;
  output += `- **Total Notes**: ${metrics.totalNotes}\n`;
  output += `- **Avg Notes per Covered File**: ${metrics.averageNotesPerCoveredFile.toFixed(1)}\n\n`;

  if (metrics.totalEligibleDirectories > 0) {
    output += '### Directory Coverage\n\n';
    output += `- **Eligible Directories**: ${metrics.totalEligibleDirectories}\n`;
    output += `- **Directories with Notes**: ${metrics.directoriesWithNotes}\n`;
    output += `- **Coverage**: ${metrics.directoryCoveragePercentage.toFixed(1)}%\n\n`;
  }

  // Coverage by file type
  output += '## Coverage by File Type\n\n';

  const sortedTypes = Object.entries(coverageByType)
    .sort((a, b) => b[1].totalFiles - a[1].totalFiles)
    .slice(0, 10);

  if (sortedTypes.length > 0) {
    output += '| Extension | Files | Covered | Coverage | Notes |\n';
    output += '|-----------|-------|---------|----------|-------|\n';

    sortedTypes.forEach(([type, info]) => {
      output += `| .${type} | ${info.totalFiles} | ${info.filesWithNotes} | ${info.coveragePercentage.toFixed(1)}% | ${info.totalNotes} |\n`;
    });
    output += '\n';
  }

  // Files with most notes
  if (filesWithMostNotes.length > 0) {
    output += '## Most Documented Files\n\n';
    filesWithMostNotes.forEach((file, index) => {
      output += `${index + 1}. \`${file.path}\` - ${file.noteCount} notes\n`;
    });
    output += '\n';
  }

  // Largest uncovered files
  if (largestUncoveredFiles.length > 0) {
    output += '## Largest Uncovered Files\n\n';
    output += 'These files might benefit from documentation:\n\n';

    largestUncoveredFiles.forEach((file, index) => {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      const sizeKB = (file.size / 1024).toFixed(1);
      const sizeStr = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      output += `${index + 1}. \`${file.path}\` (${sizeStr})\n`;
    });
    output += '\n';
  }

  // Stale notes
  if (staleNotes.length > 0) {
    output += `## ⚠️ Stale Notes (${staleNotes.length})\n\n`;
    output += 'These notes reference files that no longer exist:\n\n';

    staleNotes.slice(0, 10).forEach((stale) => {
      output += `- **${stale.noteId}**: \`${stale.anchor}\`\n`;
      output += `  > ${stale.noteContent}\n`;
    });

    if (staleNotes.length > 10) {
      output += `\n...and ${staleNotes.length - 10} more stale notes\n`;
    }
    output += '\n';
  }

  // Recommendations
  output += '## 📝 Recommendations\n\n';

  if (metrics.fileCoveragePercentage < 30) {
    output +=
      '- **Low Coverage**: Consider adding notes to key files to improve knowledge retention\n';
  } else if (metrics.fileCoveragePercentage < 60) {
    output +=
      '- **Moderate Coverage**: Good start! Focus on documenting complex or frequently changed files\n';
  } else {
    output += '- **Good Coverage**: Excellent documentation coverage! Keep it up!\n';
  }

  if (staleNotes.length > 0) {
    output += `- **Clean up stale notes**: ${staleNotes.length} notes reference non-existent files\n`;
  }

  if (largestUncoveredFiles.length > 0) {
    output +=
      '- **Document large files**: Large files without notes might contain complex logic worth documenting\n';
  }

  const typesWithLowCoverage = Object.entries(coverageByType)
    .filter(([_, info]) => info.coveragePercentage < 20 && info.totalFiles > 5)
    .map(([type]) => type);

  if (typesWithLowCoverage.length > 0) {
    output += `- **Focus on file types**: Consider adding notes for .${typesWithLowCoverage[0]} files (low coverage)\n`;
  }

  return output;
}

/**
 * Format coverage report as JSON
 */
export function formatCoverageReportAsJson(report: NoteCoverageReport): string {
  return JSON.stringify(
    {
      summary: {
        coverage: `${report.metrics.fileCoveragePercentage.toFixed(1)}%`,
        eligibleFiles: report.metrics.totalEligibleFiles,
        filesWithNotes: report.metrics.filesWithNotes,
        totalNotes: report.metrics.totalNotes,
      },
      metrics: report.metrics,
      coverageByType: report.coverageByType,
      topDocumentedFiles: report.filesWithMostNotes,
      largestUncoveredFiles: report.largestUncoveredFiles,
      staleNotesCount: report.staleNotes.length,
    },
    null,
    2
  );
}

/**
 * Format a simple coverage summary
 */
export function formatCoverageSummary(report: NoteCoverageReport): string {
  const { metrics } = report;
  const coverageEmoji =
    metrics.fileCoveragePercentage >= 70
      ? '🟢'
      : metrics.fileCoveragePercentage >= 40
        ? '🟡'
        : '🔴';

  return `${coverageEmoji} Coverage: ${metrics.fileCoveragePercentage.toFixed(1)}% (${metrics.filesWithNotes}/${metrics.totalEligibleFiles} files)`;
}
