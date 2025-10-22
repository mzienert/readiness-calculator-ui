import { NextRequest } from 'next/server';
import { run } from '@openai/agents';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  agents,
  QualifierOutputType,
  AssessorOutputType,
  AnalyzerOutputType,
} from '@/lib/agents';
import { getSession, setSession } from '@/lib/agents/session-store';
import { analyticsApi } from '@/lib/services/analytics';

export const maxDuration = 60;

interface AssessmentRequest {
  message: string;
  sessionId?: string;
  chatId: string;
}

interface AssessmentResponse {
  message: string;
  data: QualifierOutputType | AssessorOutputType | AnalyzerOutputType;
  currentAgent: string;
  sessionId: string;
  isComplete: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n');
  console.log('='.repeat(80));
  console.log('🔄 [Assessment] NEW REQUEST STARTED');
  console.log('='.repeat(80));

  try {
    // Step 1: Authentication
    console.log('📍 STEP 1: Checking authentication...');
    const session = await auth();
    if (!session?.user) {
      console.log('❌ [Assessment] No authenticated user found');
      return new ChatSDKError('unauthorized:api').toResponse();
    }
    console.log(`✅ [Assessment] Authenticated user: ${session.user.id}`);

    // Step 2: Parse request body
    console.log('\n📍 STEP 2: Parsing request body...');
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('✅ [Assessment] Request body parsed:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.log('❌ [Assessment] Failed to parse request body:', parseError);
      return new ChatSDKError('bad_request:api', 'Invalid JSON in request body').toResponse();
    }

    const { message, sessionId, chatId }: AssessmentRequest = requestBody;

    if (!message) {
      console.log('❌ [Assessment] No message provided in request');
      return new ChatSDKError('bad_request:api', 'Message is required').toResponse();
    }

    console.log(`✅ [Assessment] Message: "${message}"`);
    console.log(`✅ [Assessment] SessionId: ${sessionId || 'NONE (new session)'}`);
    console.log(`✅ [Assessment] ChatId: ${chatId}`);

    // Step 3: Session management
    console.log('\n📍 STEP 3: Managing session...');
    const newSessionId = sessionId || crypto.randomUUID();
    console.log(`🆔 [Assessment] Using session ID: ${newSessionId}`);
    
    const existingState = sessionId ? getSession(sessionId) : undefined;
    console.log(`📦 [Assessment] Existing state found: ${!!existingState}`);
    
    if (existingState) {
      console.log(`📦 [Assessment] Existing state details:`, {
        currentAgent: existingState._currentAgent?.name || 'unknown',
        historyLength: existingState.history?.length || 0,
        currentTurn: existingState._currentTurn,
      });
    }

    // Step 4: Agent selection
    console.log('\n📍 STEP 4: Selecting agent...');
    const startAgent = existingState ? existingState._currentAgent : agents.qualifier;
    console.log(`🤖 [Assessment] Selected agent: ${startAgent.name}`);
    console.log(`🤖 [Assessment] Agent model: ${startAgent.model || 'default'}`);

    // Step 5: Build input
    console.log('\n📍 STEP 5: Building input...');
    let input: string | any[];
    
    if (existingState) {
      console.log(`📚 [Assessment] Continuing conversation - appending to history`);
      console.log(`📚 [Assessment] Existing history length: ${existingState.history.length}`);
      input = [...existingState.history, { role: 'user' as const, content: message }];
      console.log(`📚 [Assessment] New input length: ${input.length}`);
      console.log(`📚 [Assessment] Last 2 items:`, JSON.stringify(input.slice(-2), null, 2));
    } else {
      console.log(`📝 [Assessment] Starting new conversation with plain message`);
      input = message;
    }
    
    console.log(`✅ [Assessment] Input type: ${typeof input}`);
    console.log(`✅ [Assessment] Is array: ${Array.isArray(input)}`);
    if (Array.isArray(input)) {
      console.log(`✅ [Assessment] Array length: ${input.length}`);
    }

    // Step 6: Call SDK
    console.log('\n📍 STEP 6: Calling OpenAI Agents SDK...');
    console.log(`🚀 [Assessment] About to call run() with agent: ${startAgent.name}`);
    console.log(`🚀 [Assessment] Agent instructions (first 200 chars):`, startAgent.instructions?.substring(0, 200) + '...');
    console.log(`🚀 [Assessment] Agent model:`, startAgent.model);
    console.log(`🚀 [Assessment] Agent has handoffs:`, startAgent.handoffs?.length || 0);
    if (startAgent.handoffs && startAgent.handoffs.length > 0) {
      console.log(`🚀 [Assessment] Handoff targets:`, startAgent.handoffs.map((h: any) => h.name || h).join(', '));
    }
    
    let result;
    try {
      const sdkStartTime = Date.now();
      result = await run(startAgent, input);
      const sdkDuration = Date.now() - sdkStartTime;
      console.log(`✅ [Assessment] SDK run() completed in ${sdkDuration}ms`);
    } catch (sdkError) {
      console.log('❌ [Assessment] SDK run() threw an error:');
      console.log('❌ [Assessment] Error type:', typeof sdkError);
      console.log('❌ [Assessment] Error:', sdkError);
      console.log('❌ [Assessment] Error message:', sdkError instanceof Error ? sdkError.message : String(sdkError));
      console.log('❌ [Assessment] Error stack:', sdkError instanceof Error ? sdkError.stack : 'No stack');
      throw sdkError;
    }
    
    // Step 7: Process result
    console.log('\n📍 STEP 7: Processing SDK result...');
    console.log(`📦 [Assessment] Result object keys:`, Object.keys(result));
    console.log(`📦 [Assessment] Result.state keys:`, Object.keys(result.state || {}));
    console.log(`📦 [Assessment] Result.lastAgent:`, result.lastAgent?.name);
    console.log(`📦 [Assessment] Result.finalOutput type:`, typeof result.finalOutput);
    
    // Check if this was a handoff
    const resultAgent = result.lastAgent?.name;
    const startAgentName = startAgent.name;
    const handoffOccurred = resultAgent !== startAgentName;
    
    if (handoffOccurred) {
      console.log(`🔄 [Assessment] 🎉 HANDOFF DETECTED!`);
      console.log(`   From: ${startAgentName}`);
      console.log(`   To: ${resultAgent}`);
      console.log(`   ✅ Handoff successful!`);
    } else {
      console.log(`📍 [Assessment] No handoff - still on ${resultAgent}`);
    }
    
    console.log(`\n📄 [Assessment] Full structured output:`);
    console.log(JSON.stringify(result.finalOutput, null, 2));
    
    // Agent-specific logging
    if (result.lastAgent?.name === 'Qualifier') {
      const qualData = result.finalOutput as QualifierOutputType;
      console.log(`\n🔍 [Assessment] QUALIFIER DATA INSPECTION:`);
      console.log(`   - Employee Count: "${qualData.employee_count}"`);
      console.log(`   - Revenue Band: "${qualData.revenue_band}"`);
      console.log(`   - Business Type: "${qualData.business_type}"`);
      console.log(`   - Location: "${qualData.location}"`);
      console.log(`   - Industry: "${qualData.industry}"`);
      console.log(`   - Needs More Info: ${qualData.needs_more_info}`);
      
      const emptyFields = [];
      if (!qualData.employee_count) emptyFields.push('employee_count');
      if (!qualData.revenue_band) emptyFields.push('revenue_band');
      if (!qualData.business_type) emptyFields.push('business_type');
      if (!qualData.location) emptyFields.push('location');
      if (!qualData.industry) emptyFields.push('industry');
      
      console.log(`   - Empty Fields: ${emptyFields.length > 0 ? emptyFields.join(', ') : 'NONE - ALL COLLECTED!'}`);
      console.log(`   - Should Handoff: ${emptyFields.length === 0 ? 'YES ✅' : 'NO ❌'}`);
    } else if (result.lastAgent?.name === 'Assessor') {
      const assData = result.finalOutput as AssessorOutputType;
      console.log(`\n🔍 [Assessment] ASSESSOR DATA INSPECTION:`);
      console.log(`   - Current Question ID: "${assData.current_question_id}"`);
      console.log(`   - Questions Asked: ${assData.questions_asked}`);
      console.log(`   - Total Questions: ${assData.total_questions}`);
      console.log(`   - Assessment Complete: ${assData.assessment_complete ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Message Preview: "${assData.message.substring(0, 100)}..."`);
      console.log(`   - Should Handoff: ${assData.assessment_complete ? 'YES ✅' : 'NO ❌'}`);
    } else if (result.lastAgent?.name === 'Analyzer') {
      const anaData = result.finalOutput as AnalyzerOutputType;
      console.log(`\n🔍 [Assessment] ANALYZER DATA INSPECTION:`);
      console.log(`   - Overall Score: ${anaData.overall_score}`);
      console.log(`   - Primary Strategy: "${anaData.primary_strategy}"`);
      console.log(`   - Analysis Complete: ${anaData.analysis_complete ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   - Category Scores:`);
      console.log(`     * Market Strategy: ${anaData.market_strategy_score}`);
      console.log(`     * Business Understanding: ${anaData.business_understanding_score}`);
      console.log(`     * Workforce Acumen: ${anaData.workforce_acumen_score}`);
      console.log(`     * Company Culture: ${anaData.company_culture_score}`);
      console.log(`     * Role of Technology: ${anaData.role_of_technology_score}`);
      console.log(`     * Data: ${anaData.data_score}`);
    }

    // Step 8: Save state
    console.log('\n📍 STEP 8: Saving session state...');
    console.log(`📦 [Assessment] State history length: ${result.state.history?.length || 0}`);
    console.log(`📦 [Assessment] State current turn: ${result.state._currentTurn || 0}`);
    console.log(`📦 [Assessment] State current agent: ${result.state._currentAgent?.name || 'none'}`);
    
    if (result.state.history && result.state.history.length > 0) {
      console.log(`\n📜 [Assessment] Conversation History (last 3 messages):`);
      const last3 = result.state.history.slice(-3);
      last3.forEach((msg: any, idx: number) => {
        let preview = 'N/A';
        try {
          if (typeof msg.content === 'string') {
            preview = msg.content.substring(0, 80);
          } else if (msg.content !== undefined && msg.content !== null) {
            const stringified = JSON.stringify(msg.content);
            if (stringified && stringified !== 'undefined') {
              preview = stringified.substring(0, 80);
            }
          }
        } catch (e) {
          preview = '[Unable to display]';
        }
        console.log(`   ${idx + 1}. [${msg.role}]: ${preview}...`);
      });
    }
    
    try {
      setSession(newSessionId, result.state);
      console.log(`✅ [Assessment] Session state saved successfully for: ${newSessionId}`);
    } catch (saveError) {
      console.log(`⚠️  [Assessment] Failed to save session state:`, saveError);
    }

    // Step 9: Extract output
    console.log('\n📍 STEP 9: Extracting structured output...');
    const outputData = result.finalOutput as QualifierOutputType | AssessorOutputType | AnalyzerOutputType;
    const currentAgentName = result.lastAgent?.name || 'Qualifier';
    console.log(`✅ [Assessment] Current agent: ${currentAgentName}`);
    console.log(`✅ [Assessment] Output data keys:`, Object.keys(outputData));
    console.log(`✅ [Assessment] Message length: ${outputData.message.length} chars`);

    // Step 10: Check completion
    console.log('\n📍 STEP 10: Checking if assessment complete...');
    const isComplete =
      currentAgentName === 'Analyzer' &&
      (outputData as AnalyzerOutputType).analysis_complete;
    console.log(`✅ [Assessment] Is complete: ${isComplete}`);

    if (isComplete) {
      console.log(`🎉 [Assessment] Assessment complete!`);
    }

    // Step 11: Save analytics (TODO: Fix server-side fetch issue)
    console.log('\n📍 STEP 11: Saving analytics snapshot...');
    // const agentType = currentAgentName.toLowerCase() as 'qualifier' | 'assessor' | 'analyzer';
    // TODO: Analytics API needs absolute URL for server-side fetch
    // For now, skipping analytics saves (non-critical feature)
    console.log(`⚠️  [Assessment] Analytics save skipped (needs absolute URL fix)`);
    // try {
    //   await analyticsApi.saveSnapshot({
    //     sessionId: newSessionId,
    //     agentType,
    //     snapshotData: outputData,
    //   });
    //   console.log(`✅ [Assessment] Analytics snapshot saved`);
    // } catch (analyticsError) {
    //   console.log(`⚠️  [Assessment] Analytics save failed (non-critical):`, analyticsError);
    // }

    // Step 12: Build response
    console.log('\n📍 STEP 12: Building response...');
    const duration = Date.now() - startTime;
    console.log(`⏱️  [Assessment] Total duration: ${duration}ms`);

    const response: AssessmentResponse = {
      message: outputData.message,
      data: outputData,
      currentAgent: currentAgentName,
      sessionId: newSessionId,
      isComplete,
    };

    console.log(`\n📤 [Assessment] RESPONSE BEING SENT TO CLIENT:`);
    console.log(`   - Current Agent: ${response.currentAgent}`);
    console.log(`   - Session ID: ${response.sessionId}`);
    console.log(`   - Is Complete: ${response.isComplete}`);
    console.log(`   - Message (first 150 chars): "${response.message.substring(0, 150)}..."`);
    console.log(`   - Data Object Keys: ${Object.keys(response.data).join(', ')}`);
    console.log(`\n📦 [Assessment] Full Response Data:`);
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ REQUEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\n');

    return Response.json(response);
  } catch (error) {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('❌ FATAL ERROR IN ASSESSMENT ENDPOINT');
    console.log('='.repeat(80));
    console.log('❌ [Assessment] Error type:', typeof error);
    console.log('❌ [Assessment] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.log('❌ [Assessment] Error message:', error instanceof Error ? error.message : String(error));
    console.log('❌ [Assessment] Error object:', error);
    
    if (error instanceof Error && error.stack) {
      console.log('❌ [Assessment] Stack trace:');
      console.log(error.stack);
    }

    if (error && typeof error === 'object') {
      console.log('❌ [Assessment] Error keys:', Object.keys(error));
      console.log('❌ [Assessment] Full error object:', JSON.stringify(error, null, 2));
    }

    console.log('='.repeat(80));
    console.log('\n');

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return new ChatSDKError(
      'bad_request:api',
      `Assessment processing failed: ${errorMessage}`
    ).toResponse();
  }
}

