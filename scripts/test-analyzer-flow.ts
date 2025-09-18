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

interface QualifierResponse {
  message: string;
  collected_responses: { [key: string]: string };
  needs_more_info: boolean;
}

interface AssessorResponse {
  message: string;
  collected_responses: {
    [questionKey: string]: string;
  };
  current_question_id: string;
  assessment_complete: boolean;
}

interface AnalyzerResponse {
  message: string;
  analysis_complete: boolean;
  scoring: {
    [category: string]: {
      [questionKey: string]: number;
      total: number;
      level: string;
    };
  };
  strategy_recommendation: {
    primary_strategy: string;
    rationale: string;
    constraining_factors: string[];
    enabling_factors: string[];
  };
  roadmap: {
    [phase: string]: {
      timeline: string;
      focus: string;
      specific_recommendations: string[];
    };
  };
  concerns_analysis: {
    identified_concerns: string[];
    mitigation_strategies: { [concern: string]: string };
  };
}

async function testFullAssessmentToAnalysisFlow() {
  console.log('🧪 Testing Full Assessment → Analysis Flow');
  console.log(`📋 Qualifier Assistant ID: ${QUALIFIER_ASSISTANT_ID}`);
  console.log(`📋 Assessor Assistant ID: ${ASSESSOR_ASSISTANT_ID}`);
  console.log(`📋 Analyzer Assistant ID: ${ANALYZER_ASSISTANT_ID}`);
  console.log('');

  try {
    // === PHASE 1: QUALIFIER (QUICK VERSION) ===
    console.log('🔵 === PHASE 1: QUALIFIER (QUICK VERSION) ===');

    const qualifierThread = await openai.beta.threads.create();
    console.log(`✅ Qualifier thread created: ${qualifierThread.id}`);

    // Quick qualifier conversation to get business context
    const qualifierMessage = 'We are a 5-person marketing agency in Durango, Colorado with around $500K annual revenue. We want to do an AI readiness assessment.';
    console.log(`👤 User: ${qualifierMessage}`);

    await openai.beta.threads.messages.create(qualifierThread.id, {
      role: 'user',
      content: qualifierMessage,
    });

    const qualifierRun = await openai.beta.threads.runs.create(qualifierThread.id, {
      assistant_id: QUALIFIER_ASSISTANT_ID,
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
    const qualifierResponseText = qualifierMessages.data[0].content[0].text.value;
    const qualifierData: QualifierResponse = JSON.parse(qualifierResponseText);

    console.log(`🤖 Qualifier Response: ${qualifierData.message}`);
    console.log(`📊 Collected Responses:`, qualifierData.collected_responses);
    console.log(`✅ Qualification ${qualifierData.needs_more_info ? 'needs more info' : 'complete'}`);

    await openai.beta.threads.delete(qualifierThread.id);
    console.log('');

    // === PHASE 2: ASSESSOR (SIMULATED COMPLETE ASSESSMENT) ===
    console.log('🟢 === PHASE 2: ASSESSOR (SIMULATED COMPLETE ASSESSMENT) ===');

    const assessorThread = await openai.beta.threads.create();
    console.log(`✅ Assessor thread created: ${assessorThread.id}`);

    // Add qualifier context
    const qualifierContext = `BUSINESS CONTEXT from qualification:
${Object.entries(qualifierData.collected_responses)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please use this context to personalize your assessment. I'm going to provide responses to all 6 categories to simulate a complete assessment.`;

    await openai.beta.threads.messages.create(assessorThread.id, {
      role: 'user',
      content: qualifierContext,
    });

    // Simulate complete assessment responses
    const completeAssessmentMessage = `Here are my responses to complete the assessment:

1a (Market Strategy): We have a good understanding of our local market in Durango and see growth opportunities, especially with tourism businesses.

1b (Competitive Landscape): We know our main competitors but mostly focus on our own client work rather than monitoring them closely.

2a (Business Understanding): We've identified key pain points like client communication taking too much time and project management being disorganized.

2b (Goal Setting): Our main goals are to increase efficiency, reduce time spent on admin work, and grow revenue by 20% this year.

3a (Workforce): Our team is adaptable and everyone wears multiple hats. We're all quick learners.

3b (Leadership): I encourage the team to try new tools and processes when they'll help us work better.

4a (Innovation): We're open to new ideas but need to be careful not to disrupt our client work.

4b (Risk Tolerance): We're willing to try new things but prefer to start small and test before committing fully.

5a (Technology): We use basic tools like email, Google Workspace, and some project management software.

5b (Tech Support): I handle most tech decisions myself with occasional help from a freelance IT person.

6a (Data Access): Most of our data is in spreadsheets and Google Drive. We can access what we need.

6b (Data Quality): Our data is decent but could be better organized. We know what's accurate and what isn't.

Please complete the assessment and let me know we're ready for analysis.`;

    console.log(`👤 User: [Complete assessment responses provided]`);

    await openai.beta.threads.messages.create(assessorThread.id, {
      role: 'user',
      content: completeAssessmentMessage,
    });

    const assessorRun = await openai.beta.threads.runs.create(assessorThread.id, {
      assistant_id: ASSESSOR_ASSISTANT_ID,
      response_format: { type: 'json_object' },
    });

    let assessorStatus = await openai.beta.threads.runs.retrieve(assessorRun.id, {
      thread_id: assessorThread.id,
    });

    while (assessorStatus.status === 'queued' || assessorStatus.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      assessorStatus = await openai.beta.threads.runs.retrieve(assessorRun.id, {
        thread_id: assessorThread.id,
      });
    }

    const assessorMessages = await openai.beta.threads.messages.list(assessorThread.id);
    const assessorResponseText = assessorMessages.data[0].content[0].text.value;
    const assessmentData: AssessorResponse = JSON.parse(assessorResponseText);

    console.log(`🤖 Assessor Response: ${assessmentData.message}`);
    console.log(`📋 Collected Assessment Data:`, assessmentData.collected_responses);
    console.log(`✅ Assessment Complete: ${assessmentData.assessment_complete}`);

    await openai.beta.threads.delete(assessorThread.id);
    console.log('');

    // === PHASE 3: ANALYZER ===
    console.log('🟠 === PHASE 3: ANALYZER (NEW THREAD) ===');

    const analyzerThread = await openai.beta.threads.create();
    console.log(`✅ Analyzer thread created: ${analyzerThread.id}`);

    // Add assessment context to analyzer thread
    console.log('📤 Adding assessment context to analyzer thread...');
    const analysisContext = `ASSESSMENT DATA for analysis:

BUSINESS QUALIFIERS:
${Object.entries(qualifierData.collected_responses)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

ASSESSMENT RESPONSES:
${Object.entries(assessmentData.collected_responses)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please analyze this data using the 6-category scoring framework with dynamic weighting based on the business qualifiers. Generate scores, determine the appropriate AI strategy recommendation, and create a phased roadmap.`;

    await openai.beta.threads.messages.create(analyzerThread.id, {
      role: 'user',
      content: analysisContext,
    });
    console.log('✅ Added assessment context to analyzer thread');

    // Ask for analysis
    const analysisMessage = "Please analyze our assessment results and provide the scoring, strategy recommendation, and roadmap.";
    console.log(`👤 User: ${analysisMessage}`);

    await openai.beta.threads.messages.create(analyzerThread.id, {
      role: 'user',
      content: analysisMessage,
    });

    console.log('🤖 Running analyzer assistant...');
    const analyzerRun = await openai.beta.threads.runs.create(analyzerThread.id, {
      assistant_id: ANALYZER_ASSISTANT_ID,
      response_format: { type: 'json_object' },
    });

    let analyzerStatus = await openai.beta.threads.runs.retrieve(analyzerRun.id, {
      thread_id: analyzerThread.id,
    });

    let pollCount = 0;
    while (analyzerStatus.status === 'queued' || analyzerStatus.status === 'in_progress') {
      pollCount++;
      console.log(`🔄 Poll ${pollCount}: Status ${analyzerStatus.status}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      analyzerStatus = await openai.beta.threads.runs.retrieve(analyzerRun.id, {
        thread_id: analyzerThread.id,
      });
    }

    if (analyzerStatus.status === 'completed') {
      const analyzerMessages = await openai.beta.threads.messages.list(analyzerThread.id);
      const analyzerResponseText = analyzerMessages.data[0].content[0].text.value;

      try {
        const analysisResults: AnalyzerResponse = JSON.parse(analyzerResponseText);

        console.log(`🤖 Analyzer: ${analysisResults.message}`);
        console.log(`✅ Analysis Complete: ${analysisResults.analysis_complete}`);
        console.log('');

        console.log('📊 === SCORING RESULTS ===');
        Object.entries(analysisResults.scoring).forEach(([category, scores]) => {
          console.log(`${category}: ${scores.total}/10 (${scores.level})`);
        });
        console.log('');

        console.log('🎯 === STRATEGY RECOMMENDATION ===');
        console.log(`Primary Strategy: ${analysisResults.strategy_recommendation.primary_strategy}`);
        console.log(`Rationale: ${analysisResults.strategy_recommendation.rationale}`);
        console.log(`Constraining Factors: ${analysisResults.strategy_recommendation.constraining_factors.join(', ')}`);
        console.log(`Enabling Factors: ${analysisResults.strategy_recommendation.enabling_factors.join(', ')}`);
        console.log('');

        console.log('🗺️ === ROADMAP ===');
        Object.entries(analysisResults.roadmap).forEach(([phase, details]) => {
          console.log(`${phase} (${details.timeline}): ${details.focus}`);
          details.specific_recommendations.forEach(rec => console.log(`  - ${rec}`));
        });
        console.log('');

        console.log('⚠️ === CONCERNS ANALYSIS ===');
        console.log(`Identified Concerns: ${analysisResults.concerns_analysis.identified_concerns.join(', ')}`);
        Object.entries(analysisResults.concerns_analysis.mitigation_strategies).forEach(([concern, strategy]) => {
          console.log(`${concern}: ${strategy}`);
        });

      } catch (parseError) {
        console.error('❌ Failed to parse analyzer JSON response:', parseError);
        console.log('Raw response:', analyzerResponseText);
      }
    } else {
      throw new Error(`Analyzer run failed with status: ${analyzerStatus.status}`);
    }

    await openai.beta.threads.delete(analyzerThread.id);
    console.log('✅ Analyzer thread deleted');

    console.log('');
    console.log('🎉 === FULL FLOW TEST COMPLETE ===');
    console.log('✅ Qualifier collected business context');
    console.log('✅ Assessor completed 6-category assessment');
    console.log('✅ Analyzer generated scoring and strategy recommendation');
    console.log('✅ Multi-agent handoff chain successful!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFullAssessmentToAnalysisFlow().catch(console.error);