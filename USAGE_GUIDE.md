# a24z-Memory: AI Agent Integration Guide

This guide provides instructions on how to configure your AI agent (in IDEs like Cursor, VS Code, or terminals like Gemini CLI) to use the `a24z-Memory` tools. The goal is to ensure your AI agent always has access to the specialized tools for interacting with your project's knowledge base.

## Core Concept: System Prompts

To make the `a24z-Memory` tools available, you need to add a specific set of rules to your AI agent's **system prompt** or **pre-prompt**. This is a special instruction that tells the agent how to behave and what tools it can use.

Below are the rules you need to add, followed by instructions for specific IDEs and terminals.

---

### The Ruleset to Add

Copy the following text into your agent's system prompt or custom instructions. This text defines the available tools and provides best practices for their use.

```markdown
When working on development tasks, you have access to a a24z-memory MCP server that serves as an expert development guide. Use it proactively to improve code quality and follow best practices.

### Available Tools

#### `mcp__a24z-memory__askA24zMemory`
Ask the a24z memory for contextual guidance based on tribal knowledge. This tool retrieves relevant notes and synthesizes an answer.

- **When to use**: When you need expert advice on implementation approaches, architecture decisions, or code review. Also use it to get existing notes for a file or directory.
- **Parameters**:
  - `filePath`: Path to the relevant file or directory.
  - `query`: Your specific question about the code. To get all notes, you can use a general query like "What's known about this file?".
  - `taskContext`: (Optional) Additional context about what you are trying to accomplish.

#### `mcp__a24z-memory__create_repository_note`
Store important development insights and decisions for future reference.

- **When to use**: After implementing significant features, fixing complex bugs, or making architectural decisions.
- **Parameters**:
  - `note`: The insight or decision to document (in Markdown).
  - `directoryPath`: Path where this knowledge applies.
  - `tags`: An array of semantic tags for categorization. Use `get_repository_tags` to see available tags.
  - `anchors`: (Optional) An array of additional paths or keywords to associate with the note.
  - `confidence`: (Optional) 'high', 'medium', or 'low'.
  - `type`: (Optional) 'decision', 'pattern', 'gotcha', or 'explanation'.
  - `metadata`: (Optional) Additional context.

#### `mcp__a24z-memory__get_repository_tags`
Get available tags for categorizing notes in a repository path.

- **When to use**: Before creating a note to see what tags are available.
- **Parameters**:
  - `path`: The file or directory path you're working with.
  - `includeUsedTags`: (Optional) Include tags already used in this path (default: true).
  - `includeSuggestedTags`: (Optional) Include tags suggested for this path (default: true).

#### `mcp__a24z-memory__user_prompt`
Request input from the user through a dialog when you need clarification.

- **When to use**: When implementation details are ambiguous or you need user preferences.
- **Parameters**:
  - `message`: Question for the user.
  - `type`: 'text', 'confirm', 'select', or 'multiline'.
  - `options`: For 'select' type prompts.

### Best Practices

1.  **Check for existing notes first**: Before starting work on any file or directory, use `askA24zMemory` with a general query to understand existing context and requirements.
2.  **Ask for guidance early**: When encountering unfamiliar patterns or complex decisions, use `askA24zMemory` with specific questions about the code.
3.  **Document your learnings**: After solving complex problems or making important decisions, use `create_repository_note` to help future developers (including yourself).
4.  **Be specific in queries**: When asking for guidance, provide clear context about what you're trying to achieve and what specific guidance you need.
```

---

## IDE/Terminal-Specific Instructions

### Cursor

1.  Open Cursor's settings.
2.  Navigate to the **"Code"** or **"AI"** section.
3.  Find the **"Edit System Prompt"** or a similar option.
4.  Paste the ruleset into the system prompt editor.
5.  Save the changes.

### VS Code (with compatible AI extensions)

1.  Identify the AI extension you are using (e.g., Claude, Gemini).
2.  Open the extension's settings.
3.  Look for an option like **"Custom Instructions,"** **"System Prompt,"** or **"Pre-prompt."**
4.  Paste the ruleset into the appropriate field.
5.  Save the settings.

### Windsurf

1.  Go to **Settings → Cascade**.
2.  Find the **"System Prompt"** or **"Instructions"** section.
3.  Paste the ruleset into the text area.
4.  Save your configuration.

### Claude Code/Desktop

1.  Open the application's settings or preferences.
2.  Look for a section related to **"AI Behavior"** or **"System Prompt."**
3.  Paste the ruleset into the provided editor.
4.  Save the settings.

### Gemini CLI

1.  Locate your Gemini CLI configuration file (usually at `~/.gemini/settings.json`).
2.  Open the file in a text editor.
3.  Add a `system_prompt` key with the ruleset as its value.
    ```json
    {
      "system_prompt": "When working on development tasks, you have access to..."
    }
    ```
4.  Save the file.

### Jules

1.  Refer to the Jules documentation for modifying agent behavior.
2.  Find the configuration for defining system prompts or agent instructions.
3.  Paste the ruleset into the relevant configuration field.
4.  Apply the new configuration.

By following these instructions, your AI agent will be equipped with the `a24z-Memory` tools, enabling it to assist you more effectively in your development workflow.
