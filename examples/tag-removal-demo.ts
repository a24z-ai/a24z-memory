#!/usr/bin/env ts-node

/**
 * Demonstration of the new tag removal functionality
 *
 * This script shows how to use the new removeTagFromNotes function
 * and the enhanced deleteTagDescription/removeAllowedTag functions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  saveNote,
  removeTagFromNotes,
  deleteTagDescription,
  removeAllowedTag,
  addAllowedTag,
  getNotesForPath,
  getUsedTagsForPath,
} from '../src/core-mcp/store/notesStore';

// Create a temporary directory for the demo
const demoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a24z-demo-'));
fs.mkdirSync(path.join(demoDir, '.git')); // Make it a git repo

console.log('🚀 Tag Removal Demo\n');
console.log(`Demo directory: ${demoDir}\n`);

// Step 1: Create some notes with tags
console.log('1️⃣ Creating notes with various tags...');
saveNote({
  directoryPath: demoDir,
  note: 'Authentication module implementation',
  anchors: ['src/auth.ts'],
  tags: ['authentication', 'security', 'backend'],
  type: 'explanation',
  metadata: {},
});

saveNote({
  directoryPath: demoDir,
  note: 'Deprecated API endpoint - to be removed in v2',
  anchors: ['src/api/v1.ts'],
  tags: ['deprecated', 'api', 'backend'],
  type: 'gotcha',
  metadata: {},
});

saveNote({
  directoryPath: demoDir,
  note: 'Database connection pooling strategy',
  anchors: ['src/db.ts'],
  tags: ['database', 'performance', 'backend'],
  type: 'pattern',
  metadata: {},
});

saveNote({
  directoryPath: demoDir,
  note: 'Legacy code that needs refactoring',
  anchors: ['src/legacy.ts'],
  tags: ['deprecated', 'technical-debt', 'refactoring'],
  type: 'gotcha',
  metadata: {},
});

const initialNotes = getNotesForPath(demoDir, true, 100);
console.log(`✅ Created ${initialNotes.length} notes\n`);

// Step 2: Show current tags
console.log('2️⃣ Current tags in use:');
const usedTags = getUsedTagsForPath(demoDir);
console.log(`   ${usedTags.join(', ')}\n`);

// Step 3: Add tag descriptions (making them "allowed" tags)
console.log('3️⃣ Adding tag descriptions...');
addAllowedTag(demoDir, 'deprecated', 'Code marked for removal');
addAllowedTag(demoDir, 'backend', 'Backend-related code');
addAllowedTag(demoDir, 'security', 'Security-sensitive code');
console.log('✅ Tag descriptions added\n');

// Step 4: Remove 'deprecated' tag from all notes
console.log('4️⃣ Removing "deprecated" tag from all notes...');
const modifiedCount = removeTagFromNotes(demoDir, 'deprecated');
console.log(`✅ Removed "deprecated" tag from ${modifiedCount} notes\n`);

// Step 5: Show updated tags
console.log('5️⃣ Tags after removal:');
const updatedTags = getUsedTagsForPath(demoDir);
console.log(`   ${updatedTags.join(', ')}\n`);

// Step 6: Delete a tag description with automatic removal from notes
console.log('6️⃣ Deleting "backend" tag description AND removing from notes...');
const deleted = deleteTagDescription(demoDir, 'backend', true);
console.log(`✅ Tag description deleted: ${deleted}\n`);

// Step 7: Show final state
console.log('7️⃣ Final state:');
const finalTags = getUsedTagsForPath(demoDir);
console.log(`   Tags still in use: ${finalTags.join(', ')}`);

const finalNotes = getNotesForPath(demoDir, true, 100);
console.log(`   Total notes: ${finalNotes.length}\n`);

console.log('📝 Note details:');
finalNotes.forEach((note, i) => {
  console.log(`   Note ${i + 1}: Tags = [${note.tags.join(', ')}]`);
});

// Step 8: Demonstrate removeAllowedTag with default behavior
console.log('\n8️⃣ Using removeAllowedTag (removes from notes by default)...');
const securityRemoved = removeAllowedTag(demoDir, 'security', true); // explicit true, but it's the default
console.log(`✅ Security tag removed: ${securityRemoved}\n`);

const finalTagsAfterSecurity = getUsedTagsForPath(demoDir);
console.log(`   Final tags: ${finalTagsAfterSecurity.join(', ') || '(none)'}\n`);

// Cleanup
console.log('🧹 Cleaning up...');
fs.rmSync(demoDir, { recursive: true, force: true });
console.log('✅ Demo complete!');
