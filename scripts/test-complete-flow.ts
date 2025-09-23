#!/usr/bin/env tsx

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUALIFIER_ASSISTANT_ID = process.env.QUALIFIER_ASSISTANT_ID;
const ASSESSOR_ASSISTANT_ID = process.env.ASSESSOR_ASSISTANT_ID;
const ANALYZER_ASSISTANT_ID = process.env.ANALYZER_ASSISTANT_ID;

if (!QUALIFIER_ASSISTANT_ID) {
  throw new Error('QUALIFIER_ASSISTANT_ID environment variable is required');
}

if (!ASSESSOR_ASSISTANT_ID) {
  throw new Error('ASSESSOR_ASSISTANT_ID environment variable is required');
}

if (!ANALYZER_ASSISTANT_ID) {
  throw new Error('ANALYZER_ASSISTANT_ID environment variable is required');
}

// Pre-defined responses for systematic testing
const assessmentResponses = [
  "I'm ready to start the assessment", // Initial response
  "Yes, we have a good understanding of our local market in Durango and see opportunities for growth, especially with tourism businesses", // 1a - Market understanding
  "We know our main competitors but mostly focus on our own client work rather than monitoring them closely", // 1b - Competitive landscape
  "We've identified key pain points like client communication taking too much time and project management being disorganized", // 2a - Pain points
  "Our main goals are to increase efficiency, reduce time spent on admin work, and grow revenue by 20% this year", // 2b - Goal setting
  "Our team is adaptable and everyone wears multiple hats. We're all quick learners", // 3a - Team composition
  "I encourage the team to try new tools and processes when they'll help us work better", // 3b - Leadership
  "We're open to new ideas but need to be careful not to disrupt our client work", // 4a - Innovation focus
  "We're willing to try new things but prefer to start small and test before committing fully", // 4b - Risk tolerance
  "We use basic tools like email, Google Workspace, and some project management software", // 5a - Technology enablement
  "I handle most tech decisions myself with occasional help from a freelance IT person", // 5b - Tech support
  "Most of our data is in spreadsheets and Google Drive. We can access what we need", // 6a - Data accessibility
  "Our data is decent but could be better organized. We know what's accurate and what isn't", // 6b - Data quality
];

interface QualifierResponse {
  message: string;
  collected_responses: { [key: string]: string };
  needs_more_info: boolean;
}

interface AssessorResponse {
  message: string;
  collected_responses: { [key: string]: string };
  current_question_id: string;
  assessment_complete: boolean;
}

interface AnalyzerResponse {
  message: string;
  analysis_complete: boolean;
  scoring: any;
  strategy_recommendation: any;
  roadmap: any;
  concerns_analysis: any;
}

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Assessment Flow (All Questions)');
  console.log(`📋 Qualifier Assistant ID: ${QUALIFIER_ASSISTANT_ID}`);
  console.log(`📋 Assessor Assistant ID: ${ASSESSOR_ASSISTANT_ID}`);
  console.log(`📋 Analyzer Assistant ID: ${ANALYZER_ASSISTANT_ID}`);
  console.log('');

  try {
    // === PHASE 1: QUALIFIER ===
    console.log('🔵 === PHASE 1: QUALIFIER ===');

    const qualifierThread = await openai.beta.threads.create();
    console.log(`✅ Qualifier thread created: ${qualifierThread.id}`);

    const qualifierMessage = 'We are a 5-person marketing agency in Durango, Colorado with around $500K annual revenue. We want to do an AI readiness assessment.';
    console.log(`👤 User: ${qualifierMessage}`);

    await openai.beta.threads.messages.create(qualifierThread.id, {
      role: 'user',
      content: qualifierMessage,
    });

    const qualifierRun = await openai.beta.threads.runs.create(qualifierThread.id, {
      assistant_id: QUALIFIER_ASSISTANT_ID!,
      response_format: { type: 'json_object' },
    });

    let qualifierStatus = await openai.beta.threads.runs.retrieve(qualifierRun.id, {
      thread_id: qualifierThread.id,
    });

    while (qualifierStatus.status === 'queued' || qualifierStatus.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      qualifierStatus = await openai.beta.threads.runs.retrieve(qualifierRun.id, {
        thread_id: qualifierThread.id,
      });
    }

    const qualifierMessages = await openai.beta.threads.messages.list(qualifierThread.id);
    const qualifierResponseText = (qualifierMessages.data[0].content[0] as any).text.value;
    const qualifierData: QualifierResponse = JSON.parse(qualifierResponseText);

    console.log(`🤖 Qualifier: ${qualifierData.message.substring(0, 100)}...`);
    console.log(`📊 Collected Responses:`, qualifierData.collected_responses);
    console.log(`✅ Qualification Complete: ${!qualifierData.needs_more_info}`);

    await openai.beta.threads.delete(qualifierThread.id);
    console.log('');

    // === PHASE 2: ASSESSOR (COMPLETE ALL QUESTIONS) ===
    console.log('🟢 === PHASE 2: ASSESSOR (COMPLETE ALL QUESTIONS) ===');

    const assessorThread = await openai.beta.threads.create();
    console.log(`✅ Assessor thread created: ${assessorThread.id}`);

    // Add qualifier context
    const qualifierContext = `BUSINESS CONTEXT from qualification:
${Object.entries(qualifierData.collected_responses)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please use this context to personalize your assessment questions and language. Start by greeting them and explaining that you're the assessment specialist who will help them through the 6-category evaluation.`;

    await openai.beta.threads.messages.create(assessorThread.id, {
      role: 'user',
      content: qualifierContext,
    });
    console.log('✅ Added qualifier context to assessor thread');

    let assessmentComplete = false;
    let finalAssessmentData: any = {};
    let responseIndex = 0;

    // Continue assessment until complete or we run out of responses
    while (!assessmentComplete && responseIndex < assessmentResponses.length) {
      const userMessage = assessmentResponses[responseIndex];
      console.log(`👤 User: ${userMessage}`);

      await openai.beta.threads.messages.create(assessorThread.id, {
        role: 'user',
        content: userMessage,
      });

      console.log('🤖 Running assessor assistant...');
      const run = await openai.beta.threads.runs.create(assessorThread.id, {
        assistant_id: ASSESSOR_ASSISTANT_ID!,
        response_format: { type: 'json_object' },
      });

      let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: assessorThread.id,
      });

      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, {
          thread_id: assessorThread.id,
        });
      }

      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(assessorThread.id);
        const lastMessage = messages.data[0];

        if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
          const responseText = (lastMessage(content[0] as any)).text.value;

          try {
            const response: AssessorResponse = JSON.parse(responseText);
            console.log(`🤖 Assessor: ${response.message.substring(0, 100)}...`);
            console.log(`📋 Current Question: ${response.current_question_id}`);
            console.log(`📊 Collected So Far: ${Object.keys(response.collected_responses || {}).length} responses`);
            console.log(`✅ Assessment Complete: ${response.assessment_complete}`);

            // Update final data
            finalAssessmentData = response.collected_responses || {};
            assessmentComplete = response.assessment_complete;

            if (assessmentComplete) {
              console.log('🎉 Assessment completed successfully!');
              console.log(`📋 Final Assessment Data:`, finalAssessmentData);
              break;
            }
          } catch (parseError) {
            console.error('❌ Failed to parse assessor JSON:', parseError);
            console.log('Raw response:', responseText.substring(0, 200));
          }
        }
      } else {
        console.error(`❌ Assessor run failed with status: ${runStatus.status}`);
        break;
      }

      responseIndex++;
      console.log('');
    }

    if (!assessmentComplete) {
      console.log(`⚠️ Assessment not completed after ${responseIndex} responses`);
      console.log(`📊 Final collected data:`, finalAssessmentData);
    }

    await openai.beta.threads.delete(assessorThread.id);
    console.log('');

    // === PHASE 3: ANALYZER (only if assessment completed) ===
    if (assessmentComplete && Object.keys(finalAssessmentData).length > 0) {
      console.log('🟠 === PHASE 3: ANALYZER ===');

      const analyzerThread = await openai.beta.threads.create();
      console.log(`✅ Analyzer thread created: ${analyzerThread.id}`);

      const analysisContext = `ASSESSMENT DATA for analysis:

BUSINESS QUALIFIERS:
${Object.entries(qualifierData.collected_responses)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

ASSESSMENT RESPONSES:
${Object.entries(finalAssessmentData)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please analyze this data using the 6-category scoring framework with dynamic weighting based on the business qualifiers.`;

      await openai.beta.threads.messages.create(analyzerThread.id, {
        role: 'user',
        content: analysisContext,
      });

      const analysisMessage = "Please provide the complete analysis with scoring, strategy recommendation, and roadmap.";
      console.log(`👤 User: ${analysisMessage}`);

      await openai.beta.threads.messages.create(analyzerThread.id, {
        role: 'user',
        content: analysisMessage,
      });

      const analyzerRun = await openai.beta.threads.runs.create(analyzerThread.id, {
        assistant_id: ANALYZER_ASSISTANT_ID!,
        response_format: { type: 'json_object' },
      });

      let analyzerStatus = await openai.beta.threads.runs.retrieve(analyzerRun.id, {
        thread_id: analyzerThread.id,
      });

      while (analyzerStatus.status === 'queued' || analyzerStatus.status === 'in_progress') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        analyzerStatus = await openai.beta.threads.runs.retrieve(analyzerRun.id, {
          thread_id: analyzerThread.id,
        });
      }

      if (analyzerStatus.status === 'completed') {
        const analyzerMessages = await openai.beta.threads.messages.list(analyzerThread.id);
        const analyzerResponseText = analyzerMessages.data[0](content[0] as any)).text.value;

        try {
          const analysisResults: AnalyzerResponse = JSON.parse(analyzerResponseText);
          console.log(`🤖 Analyzer: ${analysisResults.message.substring(0, 100)}...`);
          console.log(`✅ Analysis Complete: ${analysisResults.analysis_complete}`);
          console.log(`🎯 Primary Strategy: ${analysisResults.strategy_recommendation?.primary_strategy}`);
        } catch (parseError) {
          console.error('❌ Failed to parse analyzer JSON:', parseError);
        }
      }

      await openai.beta.threads.delete(analyzerThread.id);
    } else {
      console.log('⚠️ Skipping analyzer phase - assessment not completed');
    }

    console.log('');
    console.log('🎉 === COMPLETE FLOW TEST FINISHED ===');
    if (assessmentComplete) {
      console.log('✅ Full qualifier → assessor → analyzer flow successful!');
    } else {
      console.log('⚠️ Assessment phase incomplete - need to debug assessor completion logic');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCompleteFlow().catch(console.error);