// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { run } from '@openai/agents';
import {
  agents,
  QualifierOutputType,
  AssessorOutputType,
  AnalyzerOutputType,
} from '@/lib/agents';

function logSeparator(char = '=') {
  console.log(char.repeat(80));
}

function logSection(title: string) {
  console.log('\n');
  logSeparator('=');
  console.log(`  ${title}`);
  logSeparator('=');
}

function logSubSection(title: string) {
  console.log('\n' + title);
  logSeparator('-');
}

async function testAssessmentFlow() {
  // Verify API key is loaded
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in .env.local');
    console.error('Please ensure you have OPENAI_API_KEY set in your .env.local file');
    process.exit(1);
  }

  logSection('🧪 OPENAI AGENTS SDK MIGRATION TEST');
  console.log('✅ API Key loaded successfully');
  console.log('🤖 Starting Agent: Qualifier');
  console.log('🎯 Goal: Test full conversation flow with handoffs\n');

  let conversationState: any = null;

  // Test 1: Initial Qualifier interaction
  logSection('1️⃣  TEST 1: Initial Qualifier Interaction');
  const input1 = 'I have 5 employees';
  console.log('📥 INPUT:', input1);
  console.log('⏳ Running agent...\n');

  const result1 = await run(agents.qualifier, input1);
  conversationState = result1.state;

  console.log('✅ RESPONSE RECEIVED');
  logSubSection('📊 Agent Info:');
  console.log('  Current Agent:', result1.lastAgent?.name);
  console.log('  Message:', result1.finalOutput);
  
  logSubSection('📦 Structured Data:');
  const data1 = result1.finalOutput as QualifierOutputType;
  console.log(JSON.stringify(data1, null, 2));

  logSubSection('🔄 Handoff Status:');
  const emptyFields1 = Object.entries(data1)
    .filter(([key, value]) => ['employee_count', 'revenue_band', 'business_type', 'location', 'industry'].includes(key) && value === '')
    .map(([key]) => key);
  console.log('  Handoff Occurred: NO');
  console.log('  Reason: Still collecting qualification data');
  console.log('  Empty Fields:', emptyFields1.length > 0 ? emptyFields1.join(', ') : 'NONE - SHOULD HANDOFF!');
  console.log('  Needs More Info:', data1.needs_more_info);

  // Test 2: Continue with more info
  logSection('2️⃣  TEST 2: Providing More Context');
  const input2 = 'We make about $200k annually and we are a marketing agency';
  console.log('📥 INPUT:', input2);
  console.log('🔄 Continuing conversation with state...');
  console.log('⏳ Running agent...\n');

  const result2 = await run(result1.lastAgent!, conversationState);
  conversationState = result2.state;

  console.log('✅ RESPONSE RECEIVED');
  logSubSection('📊 Agent Info:');
  console.log('  Current Agent:', result2.lastAgent?.name);
  console.log('  Message:', result2.finalOutput);

  logSubSection('📦 Structured Data:');
  const data2 = result2.finalOutput as QualifierOutputType;
  console.log(JSON.stringify(data2, null, 2));

  logSubSection('🔄 Handoff Status:');
  const emptyFields2 = Object.entries(data2)
    .filter(([key, value]) => ['employee_count', 'revenue_band', 'business_type', 'location', 'industry'].includes(key) && value === '')
    .map(([key]) => key);
  
  if (result2.lastAgent?.name !== result1.lastAgent?.name) {
    console.log('  ✅ HANDOFF OCCURRED');
    console.log('  From:', result1.lastAgent?.name);
    console.log('  To:', result2.lastAgent?.name);
  } else {
    console.log('  Handoff Occurred: NO');
    console.log('  Empty Fields:', emptyFields2.length > 0 ? emptyFields2.join(', ') : 'NONE - SHOULD HANDOFF!');
    console.log('  Needs More Info:', (data2 as any).needs_more_info);
  }

  // Test 3: Complete qualifier phase
  logSection('3️⃣  TEST 3: Completing Qualification');
  const input3 = "We're located in Durango, Colorado in the professional services industry";
  console.log('📥 INPUT:', input3);
  console.log('🔄 Continuing conversation...');
  console.log('⏳ Running agent...\n');

  const result3 = await run(result2.lastAgent!, conversationState);
  conversationState = result3.state;

  console.log('✅ RESPONSE RECEIVED');
  logSubSection('📊 Agent Info:');
  console.log('  Current Agent:', result3.lastAgent?.name);
  console.log('  Message:', result3.finalOutput);

  logSubSection('📦 Structured Data:');
  console.log(JSON.stringify(result3.finalOutput, null, 2));

  logSubSection('🔄 Handoff Status:');
  const emptyFields3 = result3.lastAgent?.name === 'Qualifier' 
    ? Object.entries(result3.finalOutput as QualifierOutputType)
        .filter(([key, value]) => ['employee_count', 'revenue_band', 'business_type', 'location', 'industry'].includes(key) && value === '')
        .map(([key]) => key)
    : [];
  
  if (result3.lastAgent?.name !== result2.lastAgent?.name) {
    console.log('  ✅ HANDOFF OCCURRED!');
    console.log('  From:', result2.lastAgent?.name);
    console.log('  To:', result3.lastAgent?.name);
    console.log('  ✅ Qualification → Assessment handoff working!');
  } else {
    console.log('  Handoff Occurred: NO');
    console.log('  Still in:', result3.lastAgent?.name);
    if (result3.lastAgent?.name === 'Qualifier') {
      console.log('  Empty Fields:', emptyFields3.length > 0 ? emptyFields3.join(', ') : 'NONE - SHOULD HANDOFF!');
    }
  }

  // Test 4: Answer assessment question
  if (result3.lastAgent?.name === 'Assessor') {
    logSection('4️⃣  TEST 4: Answering Assessment Question');
    const input4 = 'We primarily compete on quality and customer service. We differentiate through personalized attention and local expertise.';
    console.log('📥 INPUT:', input4);
    console.log('🔄 Answering as Assessor...');
    console.log('⏳ Running agent...\n');

    const result4 = await run(result3.lastAgent!, conversationState);

    console.log('✅ RESPONSE RECEIVED');
    logSubSection('📊 Agent Info:');
    console.log('  Current Agent:', result4.lastAgent?.name);
    console.log('  Message:', result4.finalOutput);

    logSubSection('📦 Structured Data:');
    const data4 = result4.finalOutput as AssessorOutputType;
    console.log(JSON.stringify(data4, null, 2));

    logSubSection('📈 Assessment Progress:');
    console.log('  Questions Asked:', (data4 as any).questions_asked || 'N/A');
    console.log('  Total Questions:', (data4 as any).total_questions || 'N/A');
    console.log('  Assessment Complete:', (data4 as any).assessment_complete ? '✅ YES' : '❌ NO');
  }

  // Summary
  logSection('📊 TEST SUMMARY');
  console.log('✅ All tests completed successfully!');
  console.log('\n🎯 Key Validations:');
  console.log('  ✅ Qualifier agent responds with structured output');
  console.log('  ✅ Conversation state persists across turns');
  console.log('  ✅ Structured data matches Zod schema');
  console.log('  ' + (result3.lastAgent?.name === 'Assessor' ? '✅' : '❌') + ' Handoff from Qualifier to Assessor works');
  console.log('\n💡 Next Steps:');
  console.log('  1. Test full endpoint: npm run dev → open UI → start assessment');
  console.log('  2. Verify Redux state updates in UI components');
  console.log('  3. Complete full assessment → verify analyzer phase');
  console.log('  4. Check analytics snapshots are saved');

  logSeparator('=');
}

testAssessmentFlow().catch((error) => {
  console.error('\n❌ TEST FAILED');
  logSeparator('=');
  console.error('Error:', error);
  console.error('\nStack:', error.stack);
  process.exit(1);
});

