# UI Configuration Guide for a24z-Memory

This guide explains how to build a UI for configuring a24z-memory settings, including LLM integration, tag management, and repository configuration.

## Configuration APIs

The a24z-memory library provides programmatic APIs for all configuration needs. Your UI can use these to provide a user-friendly configuration experience.

## 1. Repository Configuration

### Reading Current Configuration

```typescript
import { getRepositoryConfiguration } from 'a24z-memory';

const config = getRepositoryConfiguration('/path/to/repo');
// Returns:
{
  version: 1,
  limits: {
    noteMaxLength: 10000,
    maxTagsPerNote: 10,
    maxAnchorsPerNote: 20,
    tagDescriptionMaxLength: 2000
  },
  storage: {
    backupOnMigration: true,
    compressionEnabled: false
  },
  tags: {
    enforceAllowedTags: false
  }
}
```

### Updating Configuration

```typescript
import { updateRepositoryConfiguration } from 'a24z-memory';

const updated = updateRepositoryConfiguration('/path/to/repo', {
  limits: {
    noteMaxLength: 20000,
    maxTagsPerNote: 15
  },
  tags: {
    enforceAllowedTags: true
  }
});
```

### UI Component Example (React)

```tsx
function RepositorySettings({ repoPath }) {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    const cfg = getRepositoryConfiguration(repoPath);
    setConfig(cfg);
  }, [repoPath]);

  const handleSave = (newConfig) => {
    const updated = updateRepositoryConfiguration(repoPath, newConfig);
    setConfig(updated);
  };

  return (
    <div>
      <h2>Repository Settings</h2>
      
      <Section title="Note Limits">
        <NumberInput
          label="Max Note Length"
          value={config?.limits.noteMaxLength}
          onChange={(v) => handleSave({ limits: { noteMaxLength: v }})}
          min={100}
          max={100000}
        />
        <NumberInput
          label="Max Tags per Note"
          value={config?.limits.maxTagsPerNote}
          min={1}
          max={50}
        />
      </Section>

      <Section title="Tag Enforcement">
        <Toggle
          label="Enforce Allowed Tags"
          checked={config?.tags.enforceAllowedTags}
          onChange={(v) => handleSave({ tags: { enforceAllowedTags: v }})}
        />
      </Section>
    </div>
  );
}
```

## 2. LLM Configuration

### Configuration Structure

```typescript
interface LLMConfig {
  provider: 'ollama' | 'openai' | 'none';
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  includeFileContents?: boolean;
  fileContentBudget?: number;
  promptTemplate?: string;
}
```

### Reading/Writing LLM Configuration

```typescript
import * as fs from 'fs';
import * as path from 'path';

function getLLMConfig(repoPath: string): LLMConfig | null {
  const configPath = path.join(repoPath, '.a24z', 'llm-config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read LLM config:', e);
  }
  
  return null;
}

function saveLLMConfig(repoPath: string, config: LLMConfig): void {
  const configDir = path.join(repoPath, '.a24z');
  const configPath = path.join(configDir, 'llm-config.json');
  
  // Ensure directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Test Ollama connection
async function testOllamaConnection(endpoint: string = 'http://localhost:11434'): Promise<{
  connected: boolean;
  models?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${endpoint}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        models: data.models?.map(m => m.name) || []
      };
    }
    return { connected: false, error: `HTTP ${response.status}` };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}
```

### UI Component Example (React)

```tsx
function LLMConfiguration({ repoPath }) {
  const [config, setConfig] = useState<LLMConfig>({
    provider: 'none'
  });
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);

  // Load existing config
  useEffect(() => {
    const existing = getLLMConfig(repoPath);
    if (existing) setConfig(existing);
  }, [repoPath]);

  // Test Ollama connection when provider changes
  useEffect(() => {
    if (config.provider === 'ollama') {
      testOllamaConnection(config.endpoint).then(result => {
        setOllamaStatus(result);
        setAvailableModels(result.models || []);
      });
    }
  }, [config.provider, config.endpoint]);

  const handleSave = () => {
    saveLLMConfig(repoPath, config);
    alert('LLM configuration saved!');
  };

  return (
    <div className="llm-config">
      <h2>LLM Configuration</h2>
      
      <Select
        label="Provider"
        value={config.provider}
        onChange={(v) => setConfig({...config, provider: v})}
        options={[
          { value: 'none', label: 'No LLM (Local synthesis only)' },
          { value: 'ollama', label: 'Ollama (Local)' },
          { value: 'openai', label: 'OpenAI (Coming soon)' }
        ]}
      />

      {config.provider === 'ollama' && (
        <>
          <TextInput
            label="Endpoint"
            value={config.endpoint || 'http://localhost:11434'}
            onChange={(v) => setConfig({...config, endpoint: v})}
            placeholder="http://localhost:11434"
          />
          
          <ConnectionStatus status={ollamaStatus} />
          
          {availableModels.length > 0 && (
            <Select
              label="Model"
              value={config.model}
              onChange={(v) => setConfig({...config, model: v})}
              options={availableModels.map(m => ({ value: m, label: m }))}
            />
          )}
          
          <Slider
            label="Temperature"
            value={config.temperature || 0.3}
            onChange={(v) => setConfig({...config, temperature: v})}
            min={0}
            max={1}
            step={0.1}
          />
          
          <NumberInput
            label="Max Tokens"
            value={config.maxTokens || 1000}
            onChange={(v) => setConfig({...config, maxTokens: v})}
            min={100}
            max={10000}
          />
          
          <Checkbox
            label="Include File Contents in Prompt"
            checked={config.includeFileContents || false}
            onChange={(v) => setConfig({...config, includeFileContents: v})}
          />
          
          {config.includeFileContents && (
            <NumberInput
              label="File Content Token Budget"
              value={config.fileContentBudget || 2000}
              onChange={(v) => setConfig({...config, fileContentBudget: v})}
              min={500}
              max={5000}
            />
          )}
          
          <TextArea
            label="Custom Prompt Template (Optional)"
            value={config.promptTemplate || ''}
            onChange={(v) => setConfig({...config, promptTemplate: v})}
            placeholder="Leave empty for default template"
            rows={10}
          />
        </>
      )}
      
      <Button onClick={handleSave}>Save Configuration</Button>
    </div>
  );
}
```

## 3. Tag Management

### Tag APIs

```typescript
import {
  getTagsWithDescriptions,
  saveTagDescription,
  deleteTagDescription,
  getAllowedTags,
  setEnforceAllowedTags,
  removeTagFromNotes
} from 'a24z-memory';

// Get all tags with descriptions
const tags = getTagsWithDescriptions('/path/to/repo');
// Returns: [{ name: 'auth', description: 'Authentication related' }, ...]

// Add/update tag description
saveTagDescription('/path/to/repo', 'security', 'Security-related code and patterns');

// Delete tag (optionally remove from all notes)
deleteTagDescription('/path/to/repo', 'deprecated', true);

// Get enforcement status
const { enforced, tags } = getAllowedTags('/path/to/repo');

// Enable/disable enforcement
setEnforceAllowedTags('/path/to/repo', true);

// Remove tag from all notes
const notesModified = removeTagFromNotes('/path/to/repo', 'old-tag');
```

### UI Component Example

```tsx
function TagManager({ repoPath }) {
  const [tags, setTags] = useState([]);
  const [enforced, setEnforced] = useState(false);
  const [editingTag, setEditingTag] = useState(null);

  const loadTags = () => {
    const tagList = getTagsWithDescriptions(repoPath);
    setTags(tagList);
    
    const { enforced } = getAllowedTags(repoPath);
    setEnforced(enforced);
  };

  useEffect(() => {
    loadTags();
  }, [repoPath]);

  const handleSaveTag = (name, description) => {
    saveTagDescription(repoPath, name, description);
    loadTags();
  };

  const handleDeleteTag = (name, removeFromNotes) => {
    if (confirm(`Delete tag "${name}"? ${removeFromNotes ? 'This will remove it from all notes.' : ''}`)) {
      deleteTagDescription(repoPath, name, removeFromNotes);
      loadTags();
    }
  };

  return (
    <div className="tag-manager">
      <h2>Tag Management</h2>
      
      <Toggle
        label="Enforce Allowed Tags"
        checked={enforced}
        onChange={(v) => {
          setEnforceAllowedTags(repoPath, v);
          setEnforced(v);
        }}
        help="When enabled, only tags with descriptions can be used"
      />
      
      <TagList>
        {tags.map(tag => (
          <TagItem key={tag.name}>
            <TagName>{tag.name}</TagName>
            <TagDescription>{tag.description || 'No description'}</TagDescription>
            <Actions>
              <Button onClick={() => setEditingTag(tag)}>Edit</Button>
              <Button onClick={() => handleDeleteTag(tag.name, false)}>Delete</Button>
              <Button onClick={() => handleDeleteTag(tag.name, true)} variant="danger">
                Delete & Remove from Notes
              </Button>
            </Actions>
          </TagItem>
        ))}
      </TagList>
      
      <Button onClick={() => setEditingTag({ name: '', description: '' })}>
        Add New Tag
      </Button>
      
      {editingTag && (
        <TagEditor
          tag={editingTag}
          onSave={(name, desc) => {
            handleSaveTag(name, desc);
            setEditingTag(null);
          }}
          onCancel={() => setEditingTag(null)}
        />
      )}
    </div>
  );
}
```

## 4. Note Management

### Note APIs

```typescript
import {
  getNotesForPath,
  getNoteById,
  deleteNoteById,
  checkStaleNotes
} from 'a24z-memory';

// Get notes for a path
const notes = getNotesForPath('/path/to/file.ts', true, 100);

// Get specific note
const note = getNoteById('/path/to/repo', 'note-12345-abc');

// Delete note
const deleted = deleteNoteById('/path/to/repo', 'note-12345-abc');

// Check for stale notes (anchors that no longer exist)
const staleNotes = checkStaleNotes('/path/to/repo');
```

### UI Component Example

```tsx
function NoteManager({ repoPath }) {
  const [notes, setNotes] = useState([]);
  const [staleNotes, setStaleNotes] = useState([]);

  const loadNotes = () => {
    const allNotes = getNotesForPath(repoPath, true, 1000);
    setNotes(allNotes);
    
    const stale = checkStaleNotes(repoPath);
    setStaleNotes(stale);
  };

  const handleDelete = (noteId) => {
    if (confirm('Delete this note?')) {
      deleteNoteById(repoPath, noteId);
      loadNotes();
    }
  };

  return (
    <div>
      <h2>Note Management</h2>
      
      {staleNotes.length > 0 && (
        <Alert type="warning">
          {staleNotes.length} notes have stale anchors (files no longer exist)
          <Button onClick={() => {/* handle cleanup */}}>Clean Up</Button>
        </Alert>
      )}
      
      <NoteList>
        {notes.map(note => (
          <NoteCard key={note.id}>
            <NoteHeader>
              <NoteId>{note.id}</NoteId>
              <NoteType type={note.type}>{note.type}</NoteType>
              <Confidence level={note.confidence}>{note.confidence}</Confidence>
            </NoteHeader>
            <NoteContent>{note.note}</NoteContent>
            <NoteTags>{note.tags.join(', ')}</NoteTags>
            <NoteAnchors>
              {note.anchors.map(anchor => (
                <Anchor key={anchor} exists={!note.isStale}>
                  {anchor}
                </Anchor>
              ))}
            </NoteAnchors>
            <Actions>
              <Button onClick={() => handleDelete(note.id)}>Delete</Button>
            </Actions>
          </NoteCard>
        ))}
      </NoteList>
    </div>
  );
}
```

## 5. Complete Configuration UI Example

```tsx
function A24zMemoryConfigUI({ repoPath }) {
  const [activeTab, setActiveTab] = useState('repository');

  return (
    <div className="a24z-config">
      <h1>a24z-Memory Configuration</h1>
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="repository" label="Repository" />
        <Tab value="llm" label="LLM Integration" />
        <Tab value="tags" label="Tags" />
        <Tab value="notes" label="Notes" />
      </Tabs>
      
      <TabPanel value={activeTab} index="repository">
        <RepositorySettings repoPath={repoPath} />
      </TabPanel>
      
      <TabPanel value={activeTab} index="llm">
        <LLMConfiguration repoPath={repoPath} />
      </TabPanel>
      
      <TabPanel value={activeTab} index="tags">
        <TagManager repoPath={repoPath} />
      </TabPanel>
      
      <TabPanel value={activeTab} index="notes">
        <NoteManager repoPath={repoPath} />
      </TabPanel>
    </div>
  );
}
```

## 6. Electron Example

For Electron apps, you can use IPC to communicate between renderer and main process:

### Main Process

```typescript
// main.ts
import { ipcMain } from 'electron';
import {
  getRepositoryConfiguration,
  updateRepositoryConfiguration,
  getTagsWithDescriptions,
  saveTagDescription
} from 'a24z-memory';

ipcMain.handle('a24z:getConfig', (event, repoPath) => {
  return getRepositoryConfiguration(repoPath);
});

ipcMain.handle('a24z:updateConfig', (event, repoPath, config) => {
  return updateRepositoryConfiguration(repoPath, config);
});

ipcMain.handle('a24z:getTags', (event, repoPath) => {
  return getTagsWithDescriptions(repoPath);
});

ipcMain.handle('a24z:saveTag', (event, repoPath, name, description) => {
  return saveTagDescription(repoPath, name, description);
});

// Test Ollama connection
ipcMain.handle('a24z:testOllama', async (event, endpoint) => {
  try {
    const response = await fetch(`${endpoint}/api/tags`);
    const data = await response.json();
    return { connected: true, models: data.models?.map(m => m.name) };
  } catch (e) {
    return { connected: false, error: e.message };
  }
});
```

### Renderer Process

```typescript
// renderer.ts
const a24zAPI = {
  getConfig: (repoPath: string) => 
    ipcRenderer.invoke('a24z:getConfig', repoPath),
    
  updateConfig: (repoPath: string, config: any) =>
    ipcRenderer.invoke('a24z:updateConfig', repoPath, config),
    
  getTags: (repoPath: string) =>
    ipcRenderer.invoke('a24z:getTags', repoPath),
    
  saveTag: (repoPath: string, name: string, desc: string) =>
    ipcRenderer.invoke('a24z:saveTag', repoPath, name, desc),
    
  testOllama: (endpoint: string) =>
    ipcRenderer.invoke('a24z:testOllama', endpoint)
};

// Use in React components
function ConfigUI() {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    a24zAPI.getConfig('/current/repo').then(setConfig);
  }, []);
  
  // ... rest of UI
}
```

## 7. Validation and Error Handling

```typescript
// Validate configuration before saving
function validateLLMConfig(config: LLMConfig): string[] {
  const errors: string[] = [];
  
  if (config.provider === 'ollama') {
    if (!config.endpoint) {
      errors.push('Endpoint is required for Ollama');
    }
    if (!config.model) {
      errors.push('Model selection is required');
    }
    if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
      errors.push('Temperature must be between 0 and 1');
    }
    if (config.maxTokens && config.maxTokens < 100) {
      errors.push('Max tokens must be at least 100');
    }
  }
  
  return errors;
}

// Handle errors gracefully
async function saveConfigWithValidation(config: LLMConfig) {
  const errors = validateLLMConfig(config);
  
  if (errors.length > 0) {
    return {
      success: false,
      errors
    };
  }
  
  try {
    saveLLMConfig(repoPath, config);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      errors: [`Failed to save: ${e.message}`]
    };
  }
}
```

## Best Practices

1. **Always validate inputs** before saving configuration
2. **Test connections** before saving LLM endpoints
3. **Show clear status indicators** for connection states
4. **Provide helpful defaults** for all settings
5. **Include tooltips/help text** for complex options
6. **Allow import/export** of configurations
7. **Show preview** of how settings affect behavior
8. **Implement undo/reset** functionality
9. **Cache configuration** to reduce file system reads
10. **Handle permissions errors** gracefully

## Configuration Schema Reference

See the TypeScript interfaces in the library:
- `RepositoryConfiguration` - Core repository settings
- `LLMConfig` - LLM integration settings
- `TagInfo` - Tag definitions
- `StoredNote` - Note structure