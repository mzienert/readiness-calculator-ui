#!/usr/bin/env tsx

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYZER_ASSISTANT_ID = process.env.ANALYZER_ASSISTANT_ID;

if (!ANALYZER_ASSISTANT_ID) {
  throw new Error('ANALYZER_ASSISTANT_ID environment variable is required');
}

interface AnalyzerResponse {
  message: string;
  analysis_complete: boolean;
  scoring: {
    [category: string]: {
      [questionKey: string]: number | string;
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

async function testAnalyzerDirectly() {
  console.log('🧪 Testing Analyzer Agent Directly');
  console.log(`📋 Analyzer Assistant ID: ${ANALYZER_ASSISTANT_ID}`);
  console.log('');

  try {
    // Create thread for analyzer
    console.log('🔄 Creating thread for analyzer...');
    const analyzerThread = await openai.beta.threads.create();
    console.log(`✅ Analyzer thread created: ${analyzerThread.id}`);
    console.log('');

    // Mock complete assessment data (simulating what assessor would provide)
    const mockQualifierData = {
      employee_count: '5',
      revenue_band: '$500K',
      business_type: 'Marketing Agency',
      location: 'Durango, Colorado'
    };

    const mockAssessmentData = {
      question_1a_response: 'We have a good understanding of our local market in Durango and see growth opportunities, especially with tourism businesses.',
      question_1b_response: 'We know our main competitors but mostly focus on our own client work rather than monitoring them closely.',
      question_2a_response: 'We have identified key pain points like client communication taking too much time and project management being disorganized.',
      question_2b_response: 'Our main goals are to increase efficiency, reduce time spent on admin work, and grow revenue by 20% this year.',
      question_3a_response: 'Our team is adaptable and everyone wears multiple hats. We are all quick learners.',
      question_3b_response: 'I encourage the team to try new tools and processes when they will help us work better.',
      question_4a_response: 'We are open to new ideas but need to be careful not to disrupt our client work.',
      question_4b_response: 'We are willing to try new things but prefer to start small and test before committing fully.',
      question_5a_response: 'We use basic tools like email, Google Workspace, and some project management software.',
      question_5b_response: 'I handle most tech decisions myself with occasional help from a freelance IT person.',
      question_6a_response: 'Most of our data is in spreadsheets and Google Drive. We can access what we need.',
      question_6b_response: 'Our data is decent but could be better organized. We know what is accurate and what is not.'
    };

    // Add assessment context to analyzer thread
    console.log('📤 Adding complete assessment context to analyzer thread...');
    const analysisContext = `ASSESSMENT DATA for analysis:

BUSINESS QUALIFIERS:
${Object.entries(mockQualifierData)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

ASSESSMENT RESPONSES:
${Object.entries(mockAssessmentData)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please analyze this data using the 6-category scoring framework with dynamic weighting based on the business qualifiers. Generate scores, determine the appropriate AI strategy recommendation, and create a phased roadmap. Start by greeting them and explaining that you're analyzing their assessment results.`;

    await openai.beta.threads.messages.create(analyzerThread.id, {
      role: 'user',
      content: analysisContext,
    });
    console.log('✅ Added assessment context to analyzer thread');

    // Ask for analysis
    const analysisMessage = "Please provide the complete analysis with scoring, strategy recommendation, and roadmap.";
    console.log(`👤 User: ${analysisMessage}`);

    await openai.beta.threads.messages.create(analyzerThread.id, {
      role: 'user',
      content: analysisMessage,
    });

    // Run the analyzer assistant
    console.log('🤖 Running analyzer assistant...');
    const run = await openai.beta.threads.runs.create(analyzerThread.id, {
      assistant_id: ANALYZER_ASSISTANT_ID!,
      response_format: { type: 'json_object' },
    });
    console.log(`🏃 Run started: ${run.id}`);

    // Wait for completion
    console.log('⏳ Waiting for analyzer response...');
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: analyzerThread.id,
    });

    let pollCount = 0;
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      pollCount++;
      console.log(`🔄 Poll ${pollCount}: Status ${runStatus.status}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: analyzerThread.id,
      });
    }

    console.log(`✅ Run completed with status: ${runStatus.status}`);

    if (runStatus.status === 'completed') {
      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(analyzerThread.id);
      const lastMessage = messages.data[0];

      if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
        const responseText = lastMessage.content[0].text.value;
        console.log(`📄 Raw response (${responseText.length} chars)`);
        console.log('');

        try {
          const analysisResults: AnalyzerResponse = JSON.parse(responseText);

          console.log('🎯 === ANALYZER RESULTS ===');
          console.log(`Message: ${analysisResults.message}`);
          console.log(`Analysis Complete: ${analysisResults.analysis_complete}`);
          console.log('');

          console.log('📊 === SCORING RESULTS ===');
          if (analysisResults.scoring && Object.keys(analysisResults.scoring).length > 0) {
            Object.entries(analysisResults.scoring).forEach(([category, scores]) => {
              console.log(`${category}: ${scores.total}/10 (${scores.level})`);
              Object.entries(scores).forEach(([key, value]) => {
                if (key !== 'total' && key !== 'level') {
                  console.log(`  ${key}: ${value}`);
                }
              });
            });
          } else {
            console.log('❌ No scoring data found');
          }
          console.log('');

          console.log('🎯 === STRATEGY RECOMMENDATION ===');
          if (analysisResults.strategy_recommendation) {
            console.log(`Primary Strategy: ${analysisResults.strategy_recommendation.primary_strategy}`);
            console.log(`Rationale: ${analysisResults.strategy_recommendation.rationale}`);
            console.log(`Constraining Factors: ${analysisResults.strategy_recommendation.constraining_factors?.join(', ') || 'None'}`);
            console.log(`Enabling Factors: ${analysisResults.strategy_recommendation.enabling_factors?.join(', ') || 'None'}`);
          } else {
            console.log('❌ No strategy recommendation found');
          }
          console.log('');

          console.log('🗺️ === ROADMAP ===');
          if (analysisResults.roadmap && Object.keys(analysisResults.roadmap).length > 0) {
            Object.entries(analysisResults.roadmap).forEach(([phase, details]) => {
              console.log(`${phase} (${details.timeline}): ${details.focus}`);
              if (details.specific_recommendations) {
                details.specific_recommendations.forEach(rec => console.log(`  - ${rec}`));
              }
            });
          } else {
            console.log('❌ No roadmap found');
          }
          console.log('');

          console.log('⚠️ === CONCERNS ANALYSIS ===');
          if (analysisResults.concerns_analysis) {
            console.log(`Identified Concerns: ${analysisResults.concerns_analysis.identified_concerns?.join(', ') || 'None'}`);
            if (analysisResults.concerns_analysis.mitigation_strategies) {
              Object.entries(analysisResults.concerns_analysis.mitigation_strategies).forEach(([concern, strategy]) => {
                console.log(`${concern}: ${strategy}`);
              });
            }
          } else {
            console.log('❌ No concerns analysis found');
          }

          console.log('');
          console.log('🎉 === ANALYZER TEST COMPLETE ===');
          console.log('✅ Analyzer successfully processed assessment data');
          console.log('✅ Generated scoring and strategy recommendation');
          console.log('✅ Analyzer agent working correctly!');

        } catch (parseError) {
          console.error('❌ Failed to parse analyzer JSON response:', parseError);
          console.log('');
          console.log('📝 Raw response:');
          console.log(responseText);
          console.log('');
          console.log('🔍 First 500 chars:');
          console.log(responseText.substring(0, 500));
        }
      }
    } else {
      console.error(`❌ Run failed with status: ${runStatus.status}`);
      console.error('Last error:', runStatus.last_error);
    }

    // Clean up
    console.log(`🗑️ Cleaning up analyzer thread: ${analyzerThread.id}`);
    await openai.beta.threads.delete(analyzerThread.id);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAnalyzerDirectly().catch(console.error);