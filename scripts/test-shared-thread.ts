import { config } from 'dotenv';
import OpenAI from 'openai';
import type { CoreMessage } from 'ai';

// Load environment variables
config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testSharedThread() {
  console.log('🧪 Testing shared thread functionality...\n');

  // Step 1: Simulate orchestrator creating a thread
  console.log('1️⃣ Orchestrator: Creating thread...');
  const thread = await openai.beta.threads.create();
  console.log(`✅ Thread created: ${thread.id}\n`);

  // Step 2: First qualifier call with messages
  console.log('2️⃣ First qualifier call...');
  const firstMessages: CoreMessage[] = [
    { role: 'user', content: 'Hi, I want to assess my business for AI readiness' }
  ];

  const firstResponse = await fetch('http://localhost:3000/api/agents/qualifier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: firstMessages,
      threadId: thread.id
    }),
  });

  if (!firstResponse.ok) {
    throw new Error(`First request failed: ${firstResponse.status}`);
  }

  const firstResult = await firstResponse.json();
  console.log('First response:', {
    responsePreview: firstResult.response.substring(0, 100) + '...',
    isComplete: firstResult.isComplete
  });
  console.log('');

  // Step 3: Second qualifier call simulating conversation continuation
  console.log('3️⃣ Second qualifier call (conversation continuation)...');
  const secondMessages: CoreMessage[] = [
    ...firstMessages,
    { role: 'assistant', content: firstResult.response },
    { role: 'user', content: 'We have 15 employees and make around $2 million per year' }
  ];

  const secondResponse = await fetch('http://localhost:3000/api/agents/qualifier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: secondMessages,
      threadId: thread.id  // Same thread ID
    }),
  });

  if (!secondResponse.ok) {
    throw new Error(`Second request failed: ${secondResponse.status}`);
  }

  const secondResult = await secondResponse.json();
  console.log('Second response:', {
    responsePreview: secondResult.response.substring(0, 100) + '...',
    isComplete: secondResult.isComplete,
    qualifier: secondResult.qualifier
  });
  console.log('');

  // Step 4: Verify thread contains conversation history
  console.log('4️⃣ Verifying thread contains conversation history...');
  const messages = await openai.beta.threads.messages.list(thread.id);
  console.log(`Thread contains ${messages.data.length} messages:`);
  messages.data.reverse().forEach((msg, index) => {
    const content = msg.content[0].type === 'text'
      ? msg.content[0].text.value.substring(0, 50) + '...'
      : '[non-text content]';
    console.log(`  ${index + 1}. ${msg.role}: ${content}`);
  });
  console.log('');

  // Step 5: Clean up
  console.log('5️⃣ Cleaning up thread...');
  await openai.beta.threads.delete(thread.id);
  console.log(`✅ Thread ${thread.id} deleted\n`);

  console.log('🎉 Shared thread test completed successfully!');
}

testSharedThread().catch(console.error);