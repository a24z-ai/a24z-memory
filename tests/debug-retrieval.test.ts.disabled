import * as fs from 'node:fs';
import * as path from 'node:path';
import { saveNote, getNotesForPath } from '../src/core-mcp/store/notesStore';
// import { GetRepositoryNotesTool } from '../src/core-mcp/tools/GetRepositoryNotesTool';
import { AskA24zMemoryTool } from '../src/core-mcp/tools/AskA24zMemoryTool';

describe('Debug Retrieval Discrepancy', () => {
  const testPath = process.cwd(); // Use current working directory like the MCP server would
  
  beforeAll(() => {
    // Use repository-specific storage
    delete process.env.A24Z_TEST_DATA_DIR;
    
    // Save a test note
    console.log('Saving test note at path:', testPath);
    const saved = saveNote({
      note: 'Debug test note for retrieval',
      directoryPath: testPath,
      tags: ['debug', 'retrieval'],
      anchors: [testPath],
      confidence: 'high',
      type: 'explanation',
      metadata: { debug: true }
    });
    console.log('Saved note:', saved);
  });

  it('should find notes with direct getNotesForPath call', () => {
    console.log('\n=== Testing direct getNotesForPath ===');
    console.log('Querying path:', testPath);
    
    const notes = getNotesForPath(testPath, true, 50);
    console.log('Found notes:', notes.length);
    notes.forEach(n => {
      console.log(`- Note: ${n.note.substring(0, 50)}... (id: ${n.id})`);
    });
    
    expect(notes.length).toBeGreaterThan(0);
  });

  /*
  it('should find notes with GetRepositoryNotesTool', async () => {
    console.log('\n=== Testing GetRepositoryNotesTool ===');
    const tool = new GetRepositoryNotesTool();
    
    // Test with different path formats
    const pathVariations = [
      testPath,                              // Absolute path
      '.',                                   // Current directory
      './',                                  // Current directory with slash
      '',                                    // Empty string
      process.cwd(),                         // Explicit cwd
      path.resolve('.'),                     // Resolved current
    ];
    
    for (const testInputPath of pathVariations) {
      console.log(`\nTrying path: "${testInputPath}"`);
      
      const result = await tool.execute({
        path: testInputPath || '.',  // Default to '.' if empty
        includeParentNotes: true,
        maxResults: 50
      });
      
      const data = JSON.parse(result.content[0].text!);
      console.log(`- Success: ${data.success}`);
      console.log(`- Path used: ${data.path}`);
      console.log(`- Total notes: ${data.totalNotes}`);
      
      if (data.totalNotes > 0) {
        console.log('✅ Found notes with this path format!');
        expect(data.totalNotes).toBeGreaterThan(0);
        return; // Test passed
      }
    }
    
    // If we get here, no variation worked
    expect(false).toBe(true); // Force failure with message
  });
  */

  it('should find notes with AskA24zMemoryTool', async () => {
    console.log('\n=== Testing AskA24zMemoryTool ===');
    const tool = new AskA24zMemoryTool();
    
    // Test with different path formats
    const pathVariations = [
      testPath,                              // Absolute path
      '.',                                   // Current directory
      './',                                  // Current directory with slash
      '',                                    // Empty string
      process.cwd(),                         // Explicit cwd
      path.resolve('.'),                     // Resolved current
    ];
    
    for (const testInputPath of pathVariations) {
      console.log(`\nTrying path: "${testInputPath}"`);
      
      const result = await tool.execute({
        filePath: testInputPath || '.',  // Default to '.' if empty
        query: 'What notes exist here?',
        taskContext: 'debugging retrieval'
      });
      
      const response = result.content[0].text!;
      console.log(`Response preview: ${response.substring(0, 200)}...`);
      
      if (!response.includes('No relevant knowledge found')) {
        console.log('✅ Found notes with this path format!');
        expect(response).not.toContain('No relevant knowledge found');
        return; // Test passed
      }
    }
    
    // If we get here, no variation worked
    expect(false).toBe(true); // Force failure with message
  });

  it('should compare both tools with same input', async () => {
    console.log('\n=== Comparing Both Tools ===');
    
    const testInputPath = process.cwd();
    console.log('Using path:', testInputPath);
    
    // Test GetRepositoryNotesTool
    // const getTool = new GetRepositoryNotesTool();
    // const getResult = await getTool.execute({
    //   path: testInputPath,
    //   includeParentNotes: true,
    //   maxResults: 50
    // });
    // const getData = JSON.parse(getResult.content[0].text!);
    // console.log('GetRepositoryNotesTool found:', getData.totalNotes, 'notes');
    
    // Test AskA24zMemoryTool
    const askTool = new AskA24zMemoryTool();
    const askResult = await askTool.execute({
      filePath: testInputPath,
      query: 'What notes exist?',
      taskContext: 'comparison test'
    });
    const askResponse = askResult.content[0].text!;
    const hasNotes = !askResponse.includes('No relevant knowledge found');
    console.log('AskA24zMemoryTool found notes:', hasNotes);
    
    // They should both find notes or both not find notes
    if (getData.totalNotes > 0) {
      expect(hasNotes).toBe(true);
    } else {
      expect(hasNotes).toBe(false);
    }
  });
});