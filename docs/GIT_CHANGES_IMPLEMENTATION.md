Git Changes Modal - Design Document

  Overview

  The Git Changes Modal is a real-time git status monitoring feature integrated into the VSCode extension's Repository Maps view. It provides developers with immediate
   visual feedback about their working directory changes without requiring manual git commands or page refreshes.

  Architecture

  System Components

  graph TD
      A[RepoWatcher] --> B[WorkspaceManager]
      B --> C[MemoryPalacePanel]
      C --> D[MemoryPalacePage WebView]
      D --> E[RepositoryMapsView]
      E --> F[GitChangesModal]

      A --> G[VSCode File System]
      A --> H[Git Repository]

  Data Flow

  1. RepoWatcher monitors git repository for changes using efficient file watching
  2. WorkspaceManager receives git status updates and manages state
  3. MemoryPalacePanel sends git status to webview via IPC messages
  4. Frontend updates UI state and displays real-time changes
  5. GitChangesModal presents organized git status to user

  Implementation Details

  Backend Architecture

  RepoWatcher Integration

  // Enhanced RepoWatcher with proper enums
  enum TreeChangeReason {
    GitOperation = 'git-operation',
    NewFiles = 'new-files',
    BranchChange = 'branch-change',
    Initial = 'initial'
  }

  // Real-time git status monitoring
  this.repoWatcher.on('git-status-changed', ({ status, changedFiles }) => {
    this.notifyGitStatusChange(status, changedFiles);
  });

  WorkspaceManager Extensions

  - Git status state management (GitStatus | null)
  - Callback system for git status changes
  - Integration with existing workspace lifecycle
  - Proper cleanup and error handling

  IPC Communication

  // Initial git status (repositoryContext)
  {
    type: 'repositoryContext',
    gitStatus: workspaceManager.getCurrentGitStatus(),
    // ... other context data
  }

  // Real-time updates (gitStatusChanged)
  {
    type: 'gitStatusChanged',
    gitStatus: status,
    changedFiles: changedFiles
  }

  Frontend Architecture

  State Management

  // Git status state in MemoryPalacePage
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [gitChangesCount, setGitChangesCount] = useState(0);

  // Automatic count calculation
  const count = (gitStatus.staged?.length || 0) +
               (gitStatus.unstaged?.length || 0) +
               (gitStatus.untracked?.length || 0) +
               (gitStatus.deleted?.length || 0);

  UI Components

  GitChangesButton (in RepositoryMapsView header):
  - Visual indicator with change count badge
  - Color-coded states (transparent → orange when changes present)
  - Hover effects and tooltips
  - Conditional rendering (only in git repositories)

  GitChangesModal:
  - Categorized file lists with color coding
  - Interactive file opening
  - Responsive scrolling design
  - Empty state handling
  - Theme-aware styling

  User Experience Design

  Visual Design Principles

  1. Non-intrusive: Button integrates naturally into existing header
  2. Immediate Feedback: Real-time updates without user action
  3. Clear Categorization: Git status types clearly distinguished by color and icon
  4. Actionable: Click any file to open in editor

  Color Coding System

  - 🟢 Staged Changes (#10b981) - Plus icon
  - 🟡 Unstaged Changes (#f59e0b) - Edit icon
  - 🔵 Untracked Files (#3b82f6) - File icon
  - 🔴 Deleted Files (#ef4444) - Minus icon
  - 🟣 Renamed Files (#8b5cf6) - Edit icon

  Interaction Patterns

  - Button States: Transparent (no changes) → Orange badge (changes present)
  - Modal Trigger: Single click on git changes button
  - File Navigation: Click file name to open in editor
  - Modal Dismissal: Click outside modal or X button

  Performance Considerations

  Efficient Git Monitoring

  - RepoWatcher Strategy: Monitor only git-tracked files + directory creation events
  - Debouncing: 300ms debounce to prevent excessive updates
  - Smart Filtering: Only watch git operations that affect file tree structure

  Resource Management

  - Minimal Memory Footprint: Reuse existing WorkspaceManager instance
  - Proper Cleanup: All listeners cleaned up on component disposal
  - Lazy Loading: Modal only rendered when open and git status available

  Technical Specifications

  Type Safety

  interface GitStatus {
    staged: string[];
    unstaged: string[];
    untracked: string[];
    deleted?: string[];
    renamed?: Array<{ from: string; to: string }>;
  }

  Error Handling

  - Graceful degradation when git repository unavailable
  - Error boundary protection in React components
  - Comprehensive logging for debugging
  - Fallback states for all error conditions

  Browser Compatibility

  - Works in VSCode webview environment
  - Uses standard React patterns for maximum compatibility
  - CSS-in-JS styling for theme integration
  - No external dependencies beyond existing stack

  Testing Strategy

  Test Scenarios

  1. File Creation: New files appear in "Untracked Files"
  2. File Modification: Changes appear in "Unstaged Changes"
  3. File Staging: Files move from unstaged to "Staged Changes"
  4. File Deletion: Deletions appear in "Deleted Files"
  5. Branch Operations: Status updates after branch switches
  6. Real-time Updates: Changes appear without manual refresh

  Integration Points

  - VSCode file system operations
  - Git command line operations
  - Extension lifecycle events
  - Theme changes and responsiveness

  Future Enhancements

  Potential Features

  - Git Actions: Stage/unstage files directly from modal
  - Diff Preview: Show file diffs inline or in popup
  - Commit Interface: Quick commit functionality
  - Branch Indicator: Current branch display in button
  - Conflict Resolution: Merge conflict highlighting

  Scalability Considerations

  - Large Repositories: Performance testing with 10k+ files
  - Network Operations: Handle remote git operations
  - Multi-root Workspaces: Support for multiple git repositories
  - Advanced Git Features: Submodules, worktrees, LFS

  Success Metrics

  User Experience Goals

  - Immediate Awareness: Users see git changes within 500ms of file modification
  - Reduced Context Switching: No need to check terminal or git GUI
  - Improved Workflow: Faster file navigation from git status to editor

  Technical Performance

  - Response Time: < 300ms from file change to UI update
  - Resource Usage: < 5MB additional memory footprint
  - Reliability: > 99.9% uptime in development workflows

  Conclusion

  The Git Changes Modal successfully bridges the gap between git repository state and the visual development environment. By providing real-time, categorized git
  status information directly within the Repository Maps interface, developers can maintain better awareness of their working directory state without breaking their
  flow.

  The implementation leverages the existing RepoWatcher infrastructure for efficient monitoring while adding a polished, theme-aware UI component that feels native to
  the VSCode extension ecosystem.