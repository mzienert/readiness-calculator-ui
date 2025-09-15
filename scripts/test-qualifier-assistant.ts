#!/usr/bin/env tsx

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = 'asst_YpUQWu9pPY3PTNBH9ZVjV2mK';

interface QualifierResponse {
  message: string;
  collected_info: {
    employee_count?: string;
    revenue_band?: string;
    business_type?: string;
    location?: string;
  };
  needs_more_info: boolean;
}

async function testQualifierAssistant() {
  console.log('🧪 Testing OpenAI Qualifier Assistant');
  console.log(`📋 Assistant ID: ${ASSISTANT_ID}`);
  console.log('');

  try {
    // Create a new thread
    console.log('🔄 Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log(`✅ Thread created: ${thread.id}`);
    console.log('');

    // Test conversation flow
    const testMessages = [
      "Hello, I want to start an AI readiness assessment",
      "We have 5 employees including myself",
      "We're a small marketing agency in Durango, Colorado",
      "Our annual revenue is around $500,000"
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const userMessage = testMessages[i];
      console.log(`👤 User: ${userMessage}`);

      // Add user message to thread
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: userMessage,
      });

      // Run the assistant
      console.log('🤖 Running assistant...');
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID,
        response_format: { type: 'json_object' },
      });

      console.log(`🔍 Debug - Thread ID: ${thread.id}, Run ID: ${run.id}`);

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });

      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, {
          thread_id: thread.id,
        });
      }

      if (runStatus.status === 'completed') {
        // Get the assistant's response
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];

        if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
          const responseText = lastMessage.content[0].text.value;

          try {
            const response: QualifierResponse = JSON.parse(responseText);
            console.log(`🤖 Assistant: ${response.message}`);
            console.log(`📊 Collected Info:`, response.collected_info);
            console.log(`❓ Needs More Info: ${response.needs_more_info}`);

            // If qualification is complete, break the loop
            if (!response.needs_more_info) {
              console.log('✅ Qualification complete!');
              break;
            }
          } catch (parseError) {
            console.error('❌ Failed to parse JSON response:', parseError);
            console.log('Raw response:', responseText);
          }
        }
      } else {
        console.error(`❌ Run failed with status: ${runStatus.status}`);
        if (runStatus.last_error) {
          console.error('Error details:', runStatus.last_error);
        }
        break;
      }

      console.log('');
    }

    console.log(`🗑️ Cleaning up thread: ${thread.id}`);
    await openai.beta.threads.delete(thread.id);
    console.log('✅ Thread deleted');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQualifierAssistant().catch(console.error);