# a24z-Memory: Complete AI Agent Integration Guide

This is the **comprehensive guide** for connecting your AI agent (Cursor, VS Code, Claude, etc.) to the a24z-Memory MCP server for tribal knowledge management.

## 📚 Documentation Navigation

**New to a24z-Memory?**
- 🚀 **[Quick Start in README.md](./README.md)** - 2-minute setup
- 📖 **This Guide** - Complete reference and advanced configuration

**Need specific help?**
- 🔧 [MCP Setup Checklist](#complete-mcp-setup-checklist-for-llm-integration)
- 🔍 [Troubleshooting](#why-your-llm-might-not-be-using-the-mcp-tools)
- 💡 [System Prompt Guide](#system-prompt-configuration-guide)

**Ready to dive in?** Continue reading for complete setup instructions.

## 🚀 **Quick Start (3 Steps)**

### 1. Install & Start Server
```bash
npm install -g a24z-memory
npx a24z-memory  # Keep this running
```

### 2. Add System Prompt
Copy this into your AI agent's system prompt:

```markdown
When working on development tasks, you have access to a a24z-memory MCP server that serves as an expert development guide. Use it proactively to improve code quality and follow best practices.

### Available Tools

#### `discover_a24z_tools`
Discover all available a24z-Memory tools and their capabilities. Use this to explore all available functions.

#### `askA24zMemory`
Ask the a24z memory for contextual guidance based on tribal knowledge. This tool retrieves relevant notes and synthesizes an answer.
- **filePath**: **REQUIRED** - Absolute path to file or directory
- **query**: **REQUIRED** - Your specific question about the code
- **taskContext**: (Optional) Additional context about what you're trying to accomplish
- **filterTags**: (Optional) Filter results by specific tags
- **filterTypes**: (Optional) Filter by note types: 'decision', 'pattern', 'gotcha', 'explanation'

#### `create_repository_note`
Store important development insights and decisions for future reference.
- **note**: **REQUIRED** - The insight or decision to document (Markdown format)
- **directoryPath**: **REQUIRED** - Repository root path (absolute path starting with /)
- **anchors**: **REQUIRED** - File/directory paths this note relates to
- **tags**: **REQUIRED** - An array of semantic tags for categorization
- **confidence**: (Optional) 'high', 'medium', or 'low'. Default is 'medium'
- **type**: (Optional) 'decision', 'pattern', 'gotcha', or 'explanation'. Default is 'explanation'
- **metadata**: (Optional) Additional context

#### `get_repository_tags`
Get available tags for categorizing notes and understand existing categorization patterns.
- **path**: **REQUIRED** - File or directory path
- **includeUsedTags**: (Optional) Include previously used tags. Default is true
- **includeSuggestedTags**: (Optional) Include path-based tag suggestions. Default is true
- **includeGuidance**: (Optional) Include repository guidance. Default is true

#### `get_repository_guidance`
Get repository-specific guidance for creating effective notes.
- **path**: **REQUIRED** - Any path within the repository

#### `copy_guidance_template`
Copy note guidance templates to establish documentation standards.
- **path**: **REQUIRED** - Repository path where template should be copied
- **template**: (Optional) Template type: 'default', 'react-typescript', 'nodejs-api', 'python-data-science'
- **overwrite**: (Optional) Whether to overwrite existing guidance. Default is false

### Best Practices

1. **Discover tools first**: Use `discover_a24z_tools` to understand what's available
2. **Check existing knowledge**: Use `askA24zMemory` before starting work
3. **Get tags before creating notes**: Use `get_repository_tags` for consistent categorization
4. **Use absolute paths**: Always provide paths starting with `/`
5. **Document insights**: Use `create_repository_note` after solving problems
6. **Choose appropriate note types**: Use 'decision' for architecture, 'pattern' for reusable solutions, 'gotcha' for bugs/warnings, 'explanation' for general knowledge
```

### 3. Test It
Ask your AI agent: *"What a24z-Memory tools are available?"*
It should call `discover_a24z_tools` and show you all available tools.

---

## 📋 **Complete Tool Reference**

For detailed information about all available tools and their parameters, continue reading below.

---

## 📖 **The Complete System Prompt**

Below is the complete system prompt with all tools and best practices. This is what you should copy into your AI agent's system prompt configuration.

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

---

## 🎯 **System Prompt Configuration Guide**

### **Critical Success Factors**

**✅ Your system prompt MUST include:**

1. **Tool Definitions Section** - Complete "Available Tools" section with all 6 tools
2. **Exact Tool Names** - Use `askA24zMemory`
3. **Parameter Specifications** - Include all parameters with descriptions
4. **Best Practices** - Include usage guidelines and examples

**❌ Common System Prompt Mistakes:**

- Missing the "Available Tools" section entirely
- Using incorrect tool names with prefixes
- Incomplete parameter lists
- Missing required vs optional parameter indicators
- No usage examples or best practices

### **System Prompt Validation Checklist**

Before using your LLM, verify your system prompt contains:

```markdown
✅ When working on development tasks, you have access to a a24z-memory MCP server...

✅ ### Available Tools
✅ #### discover_a24z_tools
✅ #### askA24zMemory
✅ #### create_repository_note
✅ #### get_repository_tags
✅ #### get_repository_guidance
✅ #### copy_guidance_template

✅ ### Best Practices
✅ 1. Discover tools first...
✅ 2. Check for existing notes first...
✅ 3. Use absolute paths...
```

### **IDE-Specific System Prompt Setup**

#### **Cursor**
1. Go to **Settings → AI → System Prompt**
2. Paste the complete prompt from this guide
3. Ensure MCP server is running: `npx a24z-memory`
4. Test with: `discover_a24z_tools({ category: "all" })`

#### **VS Code with MCP Extension**
1. Install MCP extension for VS Code
2. Configure server in settings.json:
```json
{
  "mcpServers": {
    "a24z-memory": {
      "command": "npx",
      "args": ["-y", "a24z-memory"]
    }
  }
}
```
3. Add system prompt to AI extension settings
4. Verify server connection in extension logs

#### **Claude Code/Desktop**
1. Open Claude settings
2. Find "System Prompt" or "Instructions" section
3. Paste the complete prompt
4. Ensure `npx a24z-memory` is running in terminal
5. Test tool discovery

### **System Prompt Testing**

After configuration, test your setup:

1. **Start MCP Server**: `npx a24z-memory` (keep running)
2. **Test Tool Discovery**: Ask LLM to call `discover_a24z_tools`
3. **Test Knowledge Query**: Ask about a file in your repository
4. **Verify Responses**: Ensure LLM uses tools, not generic responses

### **Common System Prompt Issues**

**Issue: "Tool not found"**
- ✅ Server is running
- ✅ Tool names match exactly
- ✅ System prompt includes complete "Available Tools" section
- ✅ No typos in tool names

**Issue: LLM doesn't know when to use tools**
- ✅ Include clear "When to use" instructions for each tool
- ✅ Add specific use case examples
- ✅ Include best practices section
- ✅ Use trigger phrases like "development tasks"

**Issue: Parameter errors**
- ✅ Include all parameters with descriptions
- ✅ Mark required parameters with `**REQUIRED**`
- ✅ Provide parameter examples
- ✅ Include absolute path requirements

### **Advanced System Prompt Optimization**

For maximum effectiveness, include:

```markdown
**Context-Aware Usage:**

When working with code files:
1. First call discover_a24z_tools({ category: "knowledge" })
2. Then call askA24zMemory with the current file path
3. Use the insights to guide your implementation

When solving problems:
1. Document solutions with create_repository_note
2. Use appropriate tags and confidence levels
3. Include relevant file paths as anchors
```

**Example Working System Prompt:**

```markdown
When working on development tasks, you have access to a a24z-memory MCP server that serves as an expert development guide. Use it proactively to improve code quality and follow best practices.

### Available Tools

#### discover_a24z_tools
Discover all available a24z-Memory tools and their capabilities.

#### askA24zMemory
Ask the a24z memory for contextual guidance based on tribal knowledge. This tool retrieves relevant notes and synthesizes an answer.

- **Parameters**:
  - filePath: **REQUIRED** - Absolute path to the relevant file or directory
  - query: **REQUIRED** - Your specific question about the code
  - taskContext: (Optional) Additional context
  - filterTags: (Optional) Filter by tags
  - filterTypes: (Optional) Filter by note types

#### create_repository_note
Store important development insights and decisions for future reference.

- **Parameters**:
  - note: **REQUIRED** - The insight or decision to document (Markdown format)
  - directoryPath: **REQUIRED** - Repository root path (absolute path starting with /)
  - anchors: **REQUIRED** - File/directory paths this note relates to
  - tags: **REQUIRED** - An array of semantic tags for categorization
  - confidence: (Optional) 'high', 'medium', or 'low'. Default is 'medium'
  - type: (Optional) 'decision', 'pattern', 'gotcha', or 'explanation'. Default is 'explanation'
  - metadata: (Optional) Additional context

#### get_repository_tags
Get available tags for categorizing notes and understand existing categorization patterns.

- **Parameters**:
  - path: **REQUIRED** - File or directory path
  - includeUsedTags: (Optional) Include previously used tags. Default is true
  - includeSuggestedTags: (Optional) Include path-based tag suggestions. Default is true
  - includeGuidance: (Optional) Include repository guidance. Default is true

#### get_repository_guidance
Get repository-specific guidance for creating effective notes.

- **Parameters**:
  - path: **REQUIRED** - Any path within the repository

#### copy_guidance_template
Copy note guidance templates to establish documentation standards.

- **Parameters**:
  - path: **REQUIRED** - Repository path where template should be copied
  - template: (Optional) Template type: 'default', 'react-typescript', 'nodejs-api', 'python-data-science'
  - overwrite: (Optional) Whether to overwrite existing guidance. Default is false

### Best Practices

1. Discover tools first: Use discover_a24z_tools to understand available capabilities
2. Check for existing notes first: Use askA24zMemory before starting work
3. Use absolute paths: Always provide paths starting with /
4. Document learnings: Use create_repository_note after solving problems
```

---

## 🔧 **Complete MCP Setup Checklist for LLM Integration**

If your LLM still isn't using the a24z-Memory tools after configuration, use this checklist to troubleshoot:

### **Phase 1: MCP Server Setup**

✅ **Server Installation**
```bash
# Install the package globally
npm install -g a24z-memory

# Or install locally in your project
npm install a24z-memory

# Verify installation
npx a24z-memory --help
```

✅ **Server Running**
```bash
# Start the MCP server (keep this terminal running)
npx a24z-memory

# You should see:
# ✅ a24z-Memory MCP server started successfully
# 📁 MCP Server working directory: /path/to/cwd
# 📁 MCP Server __dirname: /path/to/installation
```

✅ **Tool Discovery Test**
```bash
# The server should list these tools:
# - askA24zMemory
# - create_repository_note
# - get_repository_tags
# - get_repository_guidance
# - copy_guidance_template
# - discover_a24z_tools
```

### **Phase 2: LLM Environment Configuration**

✅ **IDE/Editor Configuration**
- **Cursor**: Check if MCP server is running in terminal
- **VS Code**: Ensure MCP extension is installed and configured
- **Other editors**: Verify MCP client support

✅ **System Prompt Integration**
- Copy the complete system prompt from this guide
- Ensure all tool names match exactly
- Verify the prompt includes the "Available Tools" section

✅ **Tool Name Matching**
- Tools use simple names: `askA24zMemory`, `create_repository_note`, etc.
- No prefixes like `mcp__a24z-memory__` needed in tool calls
- Parameter names must match exactly as documented

### **Phase 3: Repository Setup**

✅ **Git Repository**
```bash
# Ensure you're in a git repository
git status

# Initialize git if needed
git init
```

✅ **Repository Path Validation**
```bash
# The directoryPath parameter must be the git root
pwd  # This should be your git repository root

# Test with a simple query
# filePath: Use absolute path like /Users/username/project/src/file.ts
```

### **Phase 4: Testing Tool Calls**

✅ **Basic Tool Discovery**
```javascript
// First, try the discovery tool
discover_a24z_tools({ category: "all" })
```

✅ **Simple Knowledge Query**
```javascript
askA24zMemory({
  filePath: "/absolute/path/to/your/project/src/some-file.ts",
  query: "What's known about this file?"
})
```

✅ **Note Creation Test**
```javascript
create_repository_note({
  note: "Test note to verify MCP functionality",
  directoryPath: "/absolute/path/to/your/git/repo",
  anchors: ["/absolute/path/to/your/project/src/some-file.ts"],
  tags: ["test", "verification"],
  confidence: "high",
  type: "explanation"
})
```

### **Phase 5: Common Issues & Solutions**

❌ **"Tool not found" Error**
- ✅ Server is running
- ✅ Tool names match exactly
- ✅ System prompt includes the tools section

❌ **"Path must be absolute" Error**
- ✅ Use complete paths starting with `/`
- ✅ No relative paths like `./file.ts` or `src/file.ts`
- ✅ Example: `/Users/username/projects/my-repo/src/file.ts`

❌ **"Not a git repository" Error**
- ✅ Run `git init` in your project root
- ✅ Use the git root directory as `directoryPath`
- ✅ Ensure `.git` folder exists

❌ **Empty Results from Queries**
- ✅ Try different file paths
- ✅ Use broader queries initially
- ✅ Check if any notes exist yet

### **Phase 6: Advanced Configuration**

✅ **Environment Variables**
```bash
# Set these if needed for your environment
export DEBUG=a24z-memory:*
export NODE_ENV=development
```

✅ **Custom Configuration**
- Review the server logs for detailed error messages
- Check that all file permissions are correct
- Ensure the LLM has access to the repository files

### **Quick Verification Script**

Create a test script to verify everything works:

```bash
#!/bin/bash
echo "🔍 Testing a24z-Memory MCP Setup"
echo "================================="

# Check if server starts
echo "1. Testing server startup..."
timeout 5s npx a24z-memory &
sleep 2
if [ $? -eq 0 ]; then
    echo "✅ Server starts successfully"
else
    echo "❌ Server failed to start"
fi

# Check git repository
echo "2. Testing git repository..."
if git status &>/dev/null; then
    echo "✅ Git repository detected"
else
    echo "❌ Not in a git repository"
fi

# Check absolute path
echo "3. Testing path resolution..."
REPO_ROOT=$(pwd)
echo "✅ Repository root: $REPO_ROOT"
echo "💡 Use this path as 'directoryPath' parameter"

echo "================================="
echo "Setup verification complete!"
```

---

## 📊 **Expected Behavior After Setup**

**When everything is configured correctly, your LLM should:**

1. **Automatically discover tools** when you mention development tasks
2. **Proactively ask for guidance** before starting complex work
3. **Provide context-aware responses** using your repository's knowledge
4. **Suggest note creation** after you solve problems
5. **Use absolute paths** without prompting for corrections

**If the LLM still doesn't use the tools:**
- Double-check the system prompt configuration
- Ensure the MCP server is running and accessible
- Try the `discover_a24z_tools` command to verify tool availability
- Check the LLM's error logs for connection issues

---

## 🔄 **Quick Start Commands**

```bash
# 1. Start the MCP server (in one terminal)
npx a24z-memory

# 2. Test basic functionality (in another terminal)
# Try: discover_a24z_tools({ category: "all" })

# 3. Verify your setup
git status  # Ensure you're in a git repo
pwd         # Note the absolute path for directoryPath
```

---

## 🚨 **Why Your LLM Might Not Be Using the MCP Tools**

### **Most Common Reasons & Solutions**

#### **1. System Prompt Not Configured**
**Symptoms**: LLM gives generic responses, doesn't mention tools
**Solution**:
- ✅ Copy the complete system prompt from this guide
- ✅ Include ALL 6 tools in "Available Tools" section
- ✅ Use exact tool names: `askA24zMemory`, not `mcp__a24z-memory__askA24zMemory`
- ✅ Include "Best Practices" section

#### **2. MCP Server Not Running**
**Symptoms**: "Tool not found" errors, no tool responses
**Solution**:
- ✅ Run `npx a24z-memory` in a separate terminal
- ✅ Keep the server running while using LLM
- ✅ Verify server starts with success message
- ✅ Check for port conflicts or permission issues

#### **3. Tool Name Mismatch**
**Symptoms**: "Tool not found" despite server running
**Solution**:
- ✅ Use simple names: `askA24zMemory`, `create_repository_note`
- ✅ Remove any `mcp__` prefixes
- ✅ Match parameter names exactly as documented
- ✅ Check for typos in tool names

#### **4. Missing Repository Context**
**Symptoms**: Path-related errors, "not a git repository" errors
**Solution**:
- ✅ Ensure you're in a git repository (`git status`)
- ✅ Use absolute paths starting with `/`
- ✅ Use git root directory as `directoryPath`
- ✅ Verify `.git` folder exists

#### **5. LLM Doesn't Know When to Use Tools**
**Symptoms**: LLM responds conversationally instead of using tools
**Solution**:
- ✅ Include clear "When to use" instructions for each tool
- ✅ Add specific use case examples
- ✅ Use trigger phrases like "development tasks"
- ✅ Include the `discover_a24z_tools` tool for exploration

#### **6. Parameter Format Issues**
**Symptoms**: Validation errors, "expected string, received undefined"
**Solution**:
- ✅ Use absolute paths for `filePath`, `directoryPath`, `anchors`
- ✅ Include all **REQUIRED** parameters
- ✅ Check parameter types match documentation
- ✅ Provide realistic example values

### **Quick Diagnostic Commands**

```bash
# 1. Test server startup
npx a24z-memory
# Expected: "✅ a24z-Memory MCP server started successfully"

# 2. Test git repository
git status
# Expected: On branch main (or any branch)

# 3. Check current directory
pwd
# Expected: Absolute path like /Users/username/project

# 4. Test tool discovery (in LLM)
discover_a24z_tools({ category: "all" })
# Expected: List of all 6 tools

# 5. Test basic knowledge query (in LLM)
askA24zMemory({
  filePath: "/absolute/path/to/your/project/src/file.ts",
  query: "What's known about this file?"
})
# Expected: Either knowledge or "No existing knowledge found"
```

### **LLM-Specific Troubleshooting**

#### **Cursor**
- ✅ MCP server running in integrated terminal
- ✅ System prompt configured in AI settings
- ✅ Try `Cmd+K` to check AI model access

#### **Claude Code**
- ✅ Server running in external terminal
- ✅ System prompt configured in settings
- ✅ Check Claude's connection to MCP server

#### **VS Code**
- ✅ MCP extension installed and configured
- ✅ System prompt in AI extension settings
- ✅ Check extension logs for connection errors

### **Advanced Debugging**

```bash
# Enable detailed logging
DEBUG=a24z-memory:* npx a24z-memory

# Test specific tool (replace with your values)
askA24zMemory({
  filePath: "/Users/yourname/project/src/example.ts",
  query: "test query"
})

# Check for existing notes
ls -la .a24z/
cat .a24z/repository-notes.json
```

### **If Everything Fails**

1. **Restart Everything**:
   ```bash
   # Stop MCP server (Ctrl+C)
   # Close and reopen your IDE/terminal
   # Start fresh: npx a24z-memory
   ```

2. **Minimal Test**:
   ```bash
   # Test with minimal system prompt
   # Use only askA24zMemory tool initially
   # Gradually add other tools
   ```

3. **Community Support**:
   - Check the repository for known issues
   - Review similar MCP integration problems
   - Consider creating a minimal reproduction case
```
