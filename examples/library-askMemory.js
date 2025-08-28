/**
 * Example: Using the askMemory method with enhanced metadata
 */

const { A24zMemory } = require('a24z-memory');
const path = require('path');

async function main() {
  // Initialize memory for current repository
  const memory = new A24zMemory(process.cwd());

  // Save some example notes first
  console.log('📝 Saving example notes...\n');

  memory.saveNote({
    note: 'Authentication uses JWT tokens with refresh token rotation for security',
    anchors: [path.join(process.cwd(), 'src/auth/jwt.ts')],
    tags: ['authentication', 'security', 'jwt'],
    type: 'pattern',
    metadata: {
      implementedIn: 'v2.0.0',
      rfc: 'RFC-7519',
    },
  });

  memory.saveNote({
    note: 'OAuth2 integration planned for Q2 - will support Google and GitHub',
    anchors: [path.join(process.cwd(), 'src/auth/oauth.ts')],
    tags: ['authentication', 'oauth', 'roadmap'],
    type: 'decision',
    metadata: {
      jiraTicket: 'AUTH-456',
      targetQuarter: 'Q2-2024',
    },
  });

  memory.saveNote({
    note: 'Watch out: JWT token validation must check both signature AND expiry',
    anchors: [path.join(process.cwd(), 'src/middleware/auth.ts')],
    tags: ['authentication', 'security', 'validation'],
    type: 'gotcha',
    metadata: {
      discoveredIn: 'security-audit-2024',
    },
  });

  // Configure LLM (optional - will use Ollama if available)
  memory.configureLLM({
    provider: 'ollama',
    model: 'llama2',
    endpoint: 'http://localhost:11434',
    temperature: 0.3,
    includeFileContents: false, // Don't include file contents for this example
  });

  // Check if LLM is available
  const llmAvailable = await memory.isLLMAvailable();
  console.log(`🤖 LLM Available: ${llmAvailable}\n`);

  // Ask a question without filters
  console.log('❓ Question: "How does authentication work in this project?"\n');

  const response1 = await memory.askMemory({
    filePath: path.join(process.cwd(), 'src/auth'),
    query: 'How does authentication work in this project?',
    taskContext: 'I need to understand the current auth implementation',
  });

  console.log('📊 Response Metadata:');
  console.log(`  - LLM Used: ${response1.metadata.llmUsed}`);
  console.log(`  - Provider: ${response1.metadata.llmProvider || 'N/A'}`);
  console.log(`  - Notes Found: ${response1.metadata.notesFound}`);
  console.log(`  - Notes Used: ${response1.metadata.notesUsed}`);
  console.log(`  - Files Read: ${response1.metadata.filesRead}`);
  console.log('\n💡 Response:\n');
  console.log(response1.response);
  console.log('\n' + '='.repeat(80) + '\n');

  // Ask with filters
  console.log('❓ Question with Filters: "What security gotchas should I know?"\n');

  const response2 = await memory.askMemory({
    filePath: path.join(process.cwd(), 'src'),
    query: 'What security gotchas should I know?',
    filterTags: ['security'],
    filterTypes: ['gotcha'],
    options: {
      maxNotes: 5,
    },
  });

  console.log('📊 Response Metadata:');
  console.log(`  - Filters Applied:`);
  console.log(`    - Tags: ${response2.metadata.filters.tags?.join(', ') || 'none'}`);
  console.log(`    - Types: ${response2.metadata.filters.types?.join(', ') || 'none'}`);
  console.log(`  - Notes Found: ${response2.metadata.notesFound}`);
  console.log('\n💡 Filtered Response:\n');
  console.log(response2.response);

  // Show raw notes for transparency
  console.log('\n📚 Raw Notes Returned:');
  response2.notes.forEach((note, i) => {
    console.log(
      `\n  [${i + 1}] ${note.context.type.toUpperCase()} (${note.context.confidence} confidence)`
    );
    console.log(`      Tags: ${note.tags.join(', ')}`);
    console.log(`      Content: ${note.content.substring(0, 100)}...`);
  });
}

// Run the example
main().catch(console.error);
