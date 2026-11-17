import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { sendOpenRouterChat, streamOpenRouterChat } from '../src/lib/openrouter';

async function main() {
  console.log('='.repeat(65));
  console.log('🚀 OpenRouter API End-to-End Test Runner');
  console.log('='.repeat(65));

  // Check if OPENROUTER_API_KEY is present
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.error('\n❌ ERROR: OPENROUTER_API_KEY environment variable is not set!\n');
    console.log('📋 To fix this:');
    console.log('  1. Create a free API key at: https://openrouter.ai/keys');
    console.log('  2. Add it to your .env.local file:');
    console.log('     OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx');
    console.log('  3. Or export it in your shell:');
    console.log('     $env:OPENROUTER_API_KEY="sk-or-v1-..."   # PowerShell (Windows)');
    console.log('     set OPENROUTER_API_KEY=sk-or-v1-...     # Command Prompt (Windows)');
    console.log('     export OPENROUTER_API_KEY="sk-or-v1-..." # Linux/macOS\n');
    console.log('Note: Never commit your actual API key to git. It is kept in .env.local.\n');
    process.exit(1);
  }

  // Model slug (can be overridden via CLI argument: e.g. tsx scripts/test-openrouter.ts anthropic/claude-opus-5.5)
  // Reference for all models: https://openrouter.ai/models
  const modelSlug = process.argv[2] || 'anthropic/claude-3.5-sonnet';

  console.log(`\n🔑 API Key detected: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`);
  console.log(`🤖 Selected model:   ${modelSlug}`);
  console.log('📡 Sending request to OpenRouter...\n');

  try {
    const userPrompt = 'Hello! Please confirm in one short sentence that the OpenRouter connection to NEXA15 is working.';

    console.log(`Prompt: "${userPrompt}"\n`);
    console.log('--- Streaming Model Response ---');

    let fullText = '';
    for await (const chunk of streamOpenRouterChat({
      model: modelSlug,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant integrating with the NEXA15 school attendance platform.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })) {
      process.stdout.write(chunk);
      fullText += chunk;
    }

    console.log('\n--------------------------------');
    console.log('\n✅ Success! Received valid response from OpenRouter.');
    console.log(`Total response length: ${fullText.length} characters`);
  } catch (error: any) {
    console.error('\n❌ Request failed with error:');
    console.error(error.message || error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
