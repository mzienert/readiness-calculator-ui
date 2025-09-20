#!/usr/bin/env tsx

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.QUALIFIER_ASSISTANT_ID;

if (!ASSISTANT_ID) {
  throw new Error('QUALIFIER_ASSISTANT_ID environment variable is required');
}

interface QualifierResponse {
  message: string;
  collected_responses: { [key: string]: string };
  needs_more_info: boolean;
}

interface EvalScenario {
  name: string;
  description: string;
  input: string;
  expected_extractions: {
    [key: string]: string;
  };
  expected_needs_more_info: boolean;
  success_criteria: {
    context_completeness_threshold: number; // 0-1 scale
    industry_match_required: boolean;
    size_match_required: boolean;
  };
}

// Test scenarios covering different SMB types in La Plata County context
const evalScenarios: EvalScenario[] = [
  {
    name: "Restaurant - Complete Context",
    description: "Small restaurant provides complete business context in one message",
    input: "Hi, I run a small restaurant in Durango with 12 employees. We use basic POS systems and have annual revenue around $800K. We want to assess our AI readiness.",
    expected_extractions: {
      business_type: "restaurant",
      employee_count: "12",
      location: "Durango",
      revenue_band: "$800K",
      tech_level: "basic"
    },
    expected_needs_more_info: false,
    success_criteria: {
      context_completeness_threshold: 0.8,
      industry_match_required: true,
      size_match_required: true
    }
  },
  {
    name: "Marketing Agency - Partial Context",
    description: "Marketing agency provides partial context, should need more info",
    input: "We're a marketing agency and want to do an AI assessment.",
    expected_extractions: {
      business_type: "marketing agency"
    },
    expected_needs_more_info: true,
    success_criteria: {
      context_completeness_threshold: 0.3,
      industry_match_required: true,
      size_match_required: false
    }
  },
  {
    name: "Retail Store - Medium Business",
    description: "Medium-sized retail business with specific location",
    input: "I own a retail store in Cortez, Colorado with 25 employees. We do about $2M in revenue annually and use some inventory management software.",
    expected_extractions: {
      business_type: "retail",
      employee_count: "25",
      location: "Cortez",
      revenue_band: "$2M",
      tech_level: "some software"
    },
    expected_needs_more_info: false,
    success_criteria: {
      context_completeness_threshold: 0.8,
      industry_match_required: true,
      size_match_required: true
    }
  },
  {
    name: "Healthcare Practice - Professional Services",
    description: "Healthcare practice typical of rural Colorado",
    input: "We're a small medical practice in Bayfield with 8 staff members including 2 doctors. Revenue is around $1.2M per year.",
    expected_extractions: {
      business_type: "healthcare",
      employee_count: "8",
      location: "Bayfield",
      revenue_band: "$1.2M"
    },
    expected_needs_more_info: false,
    success_criteria: {
      context_completeness_threshold: 0.7,
      industry_match_required: true,
      size_match_required: true
    }
  },
  {
    name: "Construction Company - Blue Collar SMB",
    description: "Construction business typical of SW Colorado",
    input: "I run a small construction company. We have 15 employees and work mostly on residential projects in the Four Corners area.",
    expected_extractions: {
      business_type: "construction",
      employee_count: "15",
      location: "Four Corners"
    },
    expected_needs_more_info: true, // Missing revenue, tech level
    success_criteria: {
      context_completeness_threshold: 0.5,
      industry_match_required: true,
      size_match_required: true
    }
  },
  {
    name: "Tourism Business - Seasonal SMB",
    description: "Tourism business reflecting La Plata County economy",
    input: "We operate a small hotel and adventure tour company in Durango. Seasonal business with 6 full-time and 12 seasonal employees, about $900K annual revenue.",
    expected_extractions: {
      business_type: "tourism",
      employee_count: "6 full-time, 12 seasonal",
      location: "Durango",
      revenue_band: "$900K",
      business_model: "seasonal"
    },
    expected_needs_more_info: false,
    success_criteria: {
      context_completeness_threshold: 0.8,
      industry_match_required: true,
      size_match_required: true
    }
  }
];

interface EvalResult {
  scenario: EvalScenario;
  actual_response: QualifierResponse;
  scores: {
    context_completeness: number;
    industry_match: boolean;
    size_match: boolean;
    needs_more_info_accuracy: boolean;
    overall_success: boolean;
  };
  analysis: string;
}

function calculateContextCompleteness(
  expected: { [key: string]: string },
  actual: { [key: string]: string }
): number {
  const expectedKeys = Object.keys(expected);
  if (expectedKeys.length === 0) return 1;

  let matches = 0;
  for (const key of expectedKeys) {
    const expectedValue = expected[key].toLowerCase();
    const actualValues = Object.values(actual).map(v => v.toLowerCase()).join(' ');

    // Check if the expected value concept appears in any actual value
    if (actualValues.includes(expectedValue) ||
        expectedValue.split(' ').some(word => actualValues.includes(word))) {
      matches++;
    }
  }

  return matches / expectedKeys.length;
}

function checkIndustryMatch(
  expectedType: string,
  actualResponses: { [key: string]: string }
): boolean {
  const expectedLower = expectedType.toLowerCase();
  const actualText = Object.values(actualResponses).join(' ').toLowerCase();

  // Check for industry keywords
  const industryKeywords = {
    restaurant: ['restaurant', 'food', 'dining', 'culinary'],
    'marketing agency': ['marketing', 'agency', 'advertising', 'digital'],
    retail: ['retail', 'store', 'shop', 'merchandise'],
    healthcare: ['medical', 'healthcare', 'practice', 'clinic', 'doctor'],
    construction: ['construction', 'building', 'contractor'],
    tourism: ['tourism', 'hotel', 'tour', 'hospitality', 'travel']
  };

  const keywords = industryKeywords[expectedType] || [expectedType];
  return keywords.some(keyword => actualText.includes(keyword));
}

function checkSizeMatch(
  expectedCount: string,
  actualResponses: { [key: string]: string }
): boolean {
  const actualText = Object.values(actualResponses).join(' ');
  const expectedNumber = parseInt(expectedCount.match(/\d+/)?.[0] || '0');

  // Extract numbers from actual responses
  const actualNumbers = actualText.match(/\d+/g)?.map(n => parseInt(n)) || [];

  // Check if expected number appears or is within reasonable range
  return actualNumbers.some(num => Math.abs(num - expectedNumber) <= 2);
}

async function runQualifierEval(scenario: EvalScenario): Promise<EvalResult> {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`💬 Input: "${scenario.input}"`);

  try {
    // Create thread and send message
    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: scenario.input,
    });

    // Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      response_format: { type: 'json_object' },
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: thread.id,
    });

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (lastMessage.role !== 'assistant' || lastMessage.content[0].type !== 'text') {
      throw new Error('Invalid response format');
    }

    const responseText = lastMessage.content[0].text.value;
    const actualResponse: QualifierResponse = JSON.parse(responseText);

    // Calculate scores
    const contextCompleteness = calculateContextCompleteness(
      scenario.expected_extractions,
      actualResponse.collected_responses || {}
    );

    const industryMatch = checkIndustryMatch(
      scenario.expected_extractions.business_type || '',
      actualResponse.collected_responses || {}
    );

    const sizeMatch = scenario.expected_extractions.employee_count ?
      checkSizeMatch(
        scenario.expected_extractions.employee_count,
        actualResponse.collected_responses || {}
      ) : true;

    const needsMoreInfoAccuracy = actualResponse.needs_more_info === scenario.expected_needs_more_info;

    // Determine overall success
    const criteriaChecks = [
      contextCompleteness >= scenario.success_criteria.context_completeness_threshold,
      !scenario.success_criteria.industry_match_required || industryMatch,
      !scenario.success_criteria.size_match_required || sizeMatch,
      needsMoreInfoAccuracy
    ];

    const overallSuccess = criteriaChecks.every(check => check);

    // Generate analysis
    const analysis = `
Context Completeness: ${(contextCompleteness * 100).toFixed(1)}% (threshold: ${(scenario.success_criteria.context_completeness_threshold * 100)}%)
Industry Match: ${industryMatch ? '✅' : '❌'} ${scenario.success_criteria.industry_match_required ? '(Required)' : '(Optional)'}
Size Match: ${sizeMatch ? '✅' : '❌'} ${scenario.success_criteria.size_match_required ? '(Required)' : '(Optional)'}
Needs More Info: ${needsMoreInfoAccuracy ? '✅' : '❌'} (Expected: ${scenario.expected_needs_more_info}, Got: ${actualResponse.needs_more_info})
    `.trim();

    // Clean up
    await openai.beta.threads.delete(thread.id);

    const result: EvalResult = {
      scenario,
      actual_response: actualResponse,
      scores: {
        context_completeness: contextCompleteness,
        industry_match: industryMatch,
        size_match: sizeMatch,
        needs_more_info_accuracy: needsMoreInfoAccuracy,
        overall_success: overallSuccess
      },
      analysis
    };

    // Print results
    console.log(`🤖 Response: "${actualResponse.message.substring(0, 100)}..."`);
    console.log(`📊 Collected: ${JSON.stringify(actualResponse.collected_responses, null, 2)}`);
    console.log(`🎯 Success: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📈 Analysis:\n${analysis}`);

    return result;

  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    throw error;
  }
}

async function runAllQualifierEvals(): Promise<void> {
  console.log('🚀 Starting QualifierAgent Evaluation Suite');
  console.log(`📋 Assistant ID: ${ASSISTANT_ID}`);
  console.log(`🧪 Running ${evalScenarios.length} test scenarios\n`);

  const results: EvalResult[] = [];
  let passCount = 0;

  for (const scenario of evalScenarios) {
    try {
      const result = await runQualifierEval(scenario);
      results.push(result);
      if (result.scores.overall_success) passCount++;
    } catch (error) {
      console.error(`Scenario "${scenario.name}" failed:`, error);
    }
  }

  // Summary report
  console.log('\n' + '='.repeat(80));
  console.log('📊 QUALIFIER AGENT EVALUATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Scenarios: ${evalScenarios.length}`);
  console.log(`Passed: ${passCount} (${((passCount / evalScenarios.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${evalScenarios.length - passCount}`);
  console.log('');

  // Detailed breakdown
  console.log('📈 DETAILED RESULTS:');
  console.log('-'.repeat(80));

  for (const result of results) {
    const status = result.scores.overall_success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.scenario.name}`);
    console.log(`   Context: ${(result.scores.context_completeness * 100).toFixed(1)}% | Industry: ${result.scores.industry_match ? '✅' : '❌'} | Size: ${result.scores.size_match ? '✅' : '❌'} | NeedsInfo: ${result.scores.needs_more_info_accuracy ? '✅' : '❌'}`);
  }

  console.log('\n🎯 Evaluation complete! Use these results to improve QualifierAgent performance.');
}

// Run the evaluation
if (require.main === module) {
  runAllQualifierEvals().catch(console.error);
}

export { runQualifierEval, runAllQualifierEvals, evalScenarios, type EvalResult };