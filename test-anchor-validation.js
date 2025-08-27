const { saveNote } = require('./dist/core-mcp/store/notesStore.js');
const path = require('path');

// Test 1: Try to save a note without anchors
console.log('Test 1: Saving note without anchors...');
try {
  const noteWithoutAnchors = {
    note: 'Test note without anchors',
    directoryPath: __dirname,
    tags: ['test'],
    confidence: 'medium',
    type: 'explanation',
    metadata: {},
    // anchors is missing!
  };

  const result = saveNote(noteWithoutAnchors);
  console.error('ERROR: Note was saved without anchors! This should not happen.');
  console.log('Result:', result);
} catch (error) {
  console.log('✅ Correctly rejected: ' + error.message);
}

// Test 2: Try to save a note with empty anchors array
console.log('\nTest 2: Saving note with empty anchors array...');
try {
  const noteWithEmptyAnchors = {
    note: 'Test note with empty anchors',
    directoryPath: __dirname,
    anchors: [],
    tags: ['test'],
    confidence: 'medium',
    type: 'explanation',
    metadata: {},
  };

  const result = saveNote(noteWithEmptyAnchors);
  console.error('ERROR: Note was saved with empty anchors! This should not happen.');
  console.log('Result:', result);
} catch (error) {
  console.log('✅ Correctly rejected: ' + error.message);
}

// Test 3: Save a note with valid anchors
console.log('\nTest 3: Saving note with valid anchors...');
try {
  const validNote = {
    note: 'Test note with valid anchors',
    directoryPath: __dirname,
    anchors: ['src/test.ts'],
    tags: ['test'],
    confidence: 'medium',
    type: 'explanation',
    metadata: {},
  };

  const result = saveNote(validNote);
  console.log('✅ Successfully saved with anchors:', result.id);
} catch (error) {
  console.error('ERROR: Failed to save valid note: ' + error.message);
}
