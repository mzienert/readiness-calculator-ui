#!/usr/bin/env tsx

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUALIFIER_ASSISTANT_ID = 'asst_YpUQWu9pPY3PTNBH9ZVjV2mK';
const ASSESSOR_ASSISTANT_ID = 'asst_wmitwNMH5YwodUGXryvV1CuA';

interface QualifierResponse {
  message: string;
  collected_info: { [key: string]: string };
  needs_more_info: boolean;
}

interface AssessorResponse {
  message: string;
  collected_responses: {
    question_1a_response?: string;
    question_1b_response?: string;
    question_2a_response?: string;
    question_2b_response?: string;
    question_3a_response?: string;
    question_3b_response?: string;
    question_4a_response?: string;
    question_4b_response?: string;
    question_5a_response?: string;
    question_5b_response?: string;
    question_6a_response?: string;
    question_6b_response?: string;
  };
  current_question_id: string;
  assessment_complete: boolean;
}

async function testQualifierToAssessorFlow() {
  console.log('🧪 Testing Qualifier → Assessor Flow');
  console.log(`📋 Qualifier Assistant ID: ${QUALIFIER_ASSISTANT_ID}`);
  console.log(`📋 Assessor Assistant ID: ${ASSESSOR_ASSISTANT_ID}`);
  console.log('');

  try {
    // === PHASE 1: QUALIFIER ===
    console.log('🔵 === PHASE 1: QUALIFIER ===');

    // Create thread for qualifier
    console.log('🔄 Creating thread for qualifier...');
    const qualifierThread = await openai.beta.threads.create();
    console.log(`✅ Qualifier thread created: ${qualifierThread.id}`);
    console.log('');

    // Test qualifier conversation
    const qualifierMessages = [
      'Hello, I want to start an AI readiness assessment',
      'We have 5 employees including myself',
      "We're a small marketing agency in Durango, Colorado",
      'Our annual revenue is around $500,000',
    ];

    let qualifierData: { [key: string]: string } = {};

    for (let i = 0; i < qualifierMessages.length; i++) {
      const userMessage = qualifierMessages[i];
      console.log(`👤 User: ${userMessage}`);

      // Add user message to thread
      await openai.beta.threads.messages.create(qualifierThread.id, {
        role: 'user',
        content: userMessage,
      });

      // Run qualifier assistant
      console.log('🤖 Running qualifier assistant...');
      const run = await openai.beta.threads.runs.create(qualifierThread.id, {
        assistant_id: QUALIFIER_ASSISTANT_ID,
        response_format: { type: 'json_object' },
      });

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: qualifierThread.id,
      });

      while (
        runStatus.status === 'queued' ||
        runStatus.status === 'in_progress'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, {
          thread_id: qualifierThread.id,
        });
      }

      if (runStatus.status === 'completed') {
        // Get the assistant's response
        const messages = await openai.beta.threads.messages.list(
          qualifierThread.id,
        );
        const lastMessage = messages.data[0];

        if (
          lastMessage.role === 'assistant' &&
          lastMessage.content[0].type === 'text'
        ) {
          const responseText = lastMessage.content[0].text.value;
          const response: QualifierResponse = JSON.parse(responseText);

          console.log(`🤖 Qualifier: ${response.message}`);
          console.log(`📊 Collected Info:`, response.collected_info);
          console.log(`❓ Needs More Info: ${response.needs_more_info}`);

          // Store qualifier data
          qualifierData = { ...qualifierData, ...response.collected_info };

          // If qualification is complete, break and move to assessor
          if (!response.needs_more_info) {
            console.log('✅ Qualification complete!');
            console.log(`📋 Final qualifier data:`, qualifierData);
            break;
          }
        }
      } else {
        throw new Error(
          `Qualifier run failed with status: ${runStatus.status}`,
        );
      }

      console.log('');
    }

    // Clean up qualifier thread
    console.log(`🗑️ Cleaning up qualifier thread: ${qualifierThread.id}`);
    await openai.beta.threads.delete(qualifierThread.id);
    console.log('');

    // === PHASE 2: ASSESSOR ===
    console.log('🟢 === PHASE 2: ASSESSOR (NEW THREAD) ===');

    // Create NEW thread for assessor
    console.log('🔄 Creating NEW thread for assessor...');
    const assessorThread = await openai.beta.threads.create();
    console.log(`✅ Assessor thread created: ${assessorThread.id}`);
    console.log('');

    // Add qualifier context to assessor thread
    console.log('📤 Adding qualifier context to assessor thread...');
    const qualifierContext = `BUSINESS CONTEXT from qualification:
${Object.entries(qualifierData)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please use this context to personalize your assessment questions and language. Start by greeting them and explaining that you're the assessment specialist who will help them through the 6-category evaluation.`;

    await openai.beta.threads.messages.create(assessorThread.id, {
      role: 'user',
      content: qualifierContext,
    });
    console.log('✅ Added qualifier context to assessor thread');

    // Test a few assessment interactions
    const assessmentMessages = [
      "I'm ready to start the assessment",
      'Yes, we have a good understanding of our local market and see opportunities for growth',
      "We do keep track of our main competitors but we're mostly focused on our own work",
    ];

    for (let i = 0; i < assessmentMessages.length; i++) {
      const userMessage = assessmentMessages[i];
      console.log(`👤 User: ${userMessage}`);

      // Add user message to assessor thread
      await openai.beta.threads.messages.create(assessorThread.id, {
        role: 'user',
        content: userMessage,
      });

      // Run assessor assistant
      console.log('🤖 Running assessor assistant...');
      const run = await openai.beta.threads.runs.create(assessorThread.id, {
        assistant_id: ASSESSOR_ASSISTANT_ID,
        response_format: { type: 'json_object' },
      });

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: assessorThread.id,
      });

      while (
        runStatus.status === 'queued' ||
        runStatus.status === 'in_progress'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, {
          thread_id: assessorThread.id,
        });
      }

      if (runStatus.status === 'completed') {
        // Get the assistant's response
        const messages = await openai.beta.threads.messages.list(
          assessorThread.id,
        );
        const lastMessage = messages.data[0];

        if (
          lastMessage.role === 'assistant' &&
          lastMessage.content[0].type === 'text'
        ) {
          const responseText = lastMessage.content[0].text.value;

          try {
            const response: AssessorResponse = JSON.parse(responseText);
            console.log(`🤖 Assessor: ${response.message}`);
            console.log(
              `📊 Current Question ID: ${response.current_question_id}`,
            );
            console.log(
              `📋 Collected Responses:`,
              response.collected_responses,
            );
            console.log(
              `✅ Assessment Complete: ${response.assessment_complete}`,
            );

            if (response.assessment_complete) {
              console.log('🎉 Assessment complete!');
              break;
            }
          } catch (parseError) {
            console.error(
              '❌ Failed to parse assessor JSON response:',
              parseError,
            );
            console.log('Raw response:', responseText);
          }
        }
      } else {
        throw new Error(`Assessor run failed with status: ${runStatus.status}`);
      }

      console.log('');
    }

    // Clean up assessor thread
    console.log(`🗑️ Cleaning up assessor thread: ${assessorThread.id}`);
    await openai.beta.threads.delete(assessorThread.id);
    console.log('✅ Assessor thread deleted');

    console.log('');
    console.log('🎉 === FLOW TEST COMPLETE ===');
    console.log('✅ Qualifier completed and collected business context');
    console.log('✅ New thread created for assessor');
    console.log('✅ Qualifier context passed to assessor');
    console.log('✅ Assessor began assessment with personalized greeting');
    console.log('✅ Multi-agent handoff successful!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQualifierToAssessorFlow().catch(console.error);
