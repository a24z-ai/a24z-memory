#!/usr/bin/env npx tsx
/**
 * Example: Replace Tag Tool Demo
 * This example demonstrates how to use the ReplaceTagTool to rename tags across all notes
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ReplaceTagTool } from '../dist/core-mcp/tools/ReplaceTagTool.js';
import { saveNote, saveTagDescription, getNotesForPath, getTagDescriptions } from '../dist/core-mcp/store/notesStore.js';

async function main() {
  // Create a temporary test repository
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replace-tag-demo-'));
  const repoPath = path.join(tempDir, 'test-repo');
  fs.mkdirSync(repoPath, { recursive: true });
  fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });

  console.log('🚀 Replace Tag Tool Demo\n');
  console.log(`📁 Test repository: ${repoPath}\n`);

  // Step 1: Create some notes with tags
  console.log('1️⃣ Creating sample notes with tags...\n');
  
  saveNote({
    note: 'Authentication service handles user login and session management',
    anchors: ['src/services/auth.ts'],
    tags: ['authentication', 'security', 'bug-fix'],
    type: 'explanation',
    metadata: {},
    directoryPath: repoPath,
  });

  saveNote({
    note: 'Fixed race condition in token refresh mechanism',
    anchors: ['src/services/auth.ts', 'src/middleware/auth.ts'],
    tags: ['bug-fix', 'concurrency', 'authentication'],
    type: 'gotcha',
    metadata: {},
    directoryPath: repoPath,
  });

  saveNote({
    note: 'API rate limiting implementation',
    anchors: ['src/middleware/rateLimit.ts'],
    tags: ['security', 'performance', 'api'],
    type: 'pattern',
    metadata: {},
    directoryPath: repoPath,
  });

  // Step 2: Create tag descriptions
  console.log('2️⃣ Creating tag descriptions...\n');
  
  saveTagDescription(repoPath, 'bug-fix', 'Issues that were fixed in the codebase');
  saveTagDescription(repoPath, 'authentication', 'Authentication and authorization related');
  saveTagDescription(repoPath, 'security', 'Security-related implementations and fixes');

  // Show initial state
  console.log('📊 Initial state:');
  const initialNotes = getNotesForPath(repoPath, true);
  console.log(`   - Total notes: ${initialNotes.length}`);
  console.log(`   - Notes with 'bug-fix' tag: ${initialNotes.filter(n => n.tags.includes('bug-fix')).length}`);
  
  const initialTags = getTagDescriptions(repoPath);
  console.log(`   - Tag descriptions: ${Object.keys(initialTags).join(', ')}\n`);

  // Step 3: Replace 'bug-fix' with 'bugfix' using the tool
  console.log('3️⃣ Replacing "bug-fix" with "bugfix"...\n');
  
  const tool = new ReplaceTagTool();
  
  // First, try without confirmation (should be blocked)
  console.log('   ⚠️  Attempting without confirmation...');
  const blockedResult = await tool.execute({
    directoryPath: repoPath,
    oldTag: 'bug-fix',
    newTag: 'bugfix',
    confirmReplacement: false,
  });
  
  const blockedResponse = JSON.parse(blockedResult.content[0].text);
  console.log(`   ❌ ${blockedResponse.error}: ${blockedResponse.message}\n`);

  // Now replace with confirmation
  console.log('   ✅ Replacing with confirmation...');
  const result = await tool.execute({
    directoryPath: repoPath,
    oldTag: 'bug-fix',
    newTag: 'bugfix',
    confirmReplacement: true,
    transferDescription: true,
  });

  const response = JSON.parse(result.content[0].text);
  console.log(`   📝 ${response.summary}\n`);

  // Step 4: Show the results
  console.log('4️⃣ Results after replacement:\n');
  
  const finalNotes = getNotesForPath(repoPath, true);
  console.log('   📋 Notes after replacement:');
  finalNotes.forEach((note, index) => {
    console.log(`      Note ${index + 1}: tags = [${note.tags.join(', ')}]`);
  });
  
  console.log('\n   📚 Tag descriptions after replacement:');
  const finalTags = getTagDescriptions(repoPath);
  Object.entries(finalTags).forEach(([tag, desc]) => {
    console.log(`      - ${tag}: ${desc}`);
  });

  // Step 5: Try replacing with an existing tag that has a description
  console.log('\n5️⃣ Replacing "concurrency" with "security" (existing tag with description)...\n');
  
  const result2 = await tool.execute({
    directoryPath: repoPath,
    oldTag: 'concurrency',
    newTag: 'security',
    confirmReplacement: true,
    transferDescription: true,
  });

  const response2 = JSON.parse(result2.content[0].text);
  console.log(`   📝 ${response2.summary}`);
  console.log(`   ℹ️  Description action: ${response2.results.descriptionAction}\n`);

  // Show final state
  console.log('📊 Final state:');
  const finalNotes2 = getNotesForPath(repoPath, true);
  finalNotes2.forEach((note, index) => {
    console.log(`   Note ${index + 1}: tags = [${note.tags.join(', ')}]`);
  });

  // Cleanup
  console.log('\n🧹 Cleaning up temporary files...');
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✨ Demo completed!\n');
}

main().catch(console.error);