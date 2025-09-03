# Multi-Agent Architecture Documentation

## Overview

The AI Readiness Calculator uses a multi-agent conversation system to provide a structured, empathetic assessment experience for La Plata County SMBs. This document defines clear agent boundaries, responsibilities, and handoff protocols.

## Agent Architecture

### 1. QualifierAgent

**Primary Responsibility**: Context Collection & Dynamic Weighting Setup

**Core Functions**:
- Collect SMB context (employee count, revenue band, business type/industry)
- Establish conversation tone and expectations appropriate for SMB audience
- Set dynamic weighting parameters for scoring based on business characteristics
- Validate business fits target demographic (La Plata County SMB focus)

**Specific Tasks**:
- Ask qualifying questions about business size and type
- Determine if business is appropriate for assessment (SMB vs Enterprise)
- Set assessment parameters (question weighting, industry-specific considerations)
- Establish conversational baseline (formal vs casual tone based on business type)
- Hand off qualified context to AssessmentAgent

**Success Criteria**:
- SMB context fully captured and validated
- Dynamic weights established for 6 assessment categories
- Appropriate conversational tone set
- Clean handoff to AssessmentAgent with complete context

**Questions to Clarify**:
- Should QualifierAgent handle basic business eligibility screening?
- How detailed should industry classification be at this stage?
- Does QualifierAgent set conversation personality or just parameters?

---

### 2. AssessmentAgent

**Primary Responsibility**: 6-Category Question Management & Response Collection

**Core Functions**:
- Conduct structured assessment across 6 categories (one question at a time)
- Maintain empathetic, SMB-appropriate conversation flow
- Handle clarifications and follow-up questions during assessment
- Collect and structure responses for analysis

**Specific Tasks**:
- Present questions one-by-one across all 6 categories:
  - Market Strategy
  - Business Understanding  
  - Workforce Acumen
  - Company Culture
  - Role of Technology
  - Data
- Provide clarifications for business terminology ("What's a KPI?", "What's CRM?")
- Maintain conversation context and empathetic responses
- Structure responses using consistent data schema
- Determine when assessment is complete vs needs follow-up

**Success Criteria**:
- All 6 categories assessed with quality responses
- User engagement maintained throughout process
- Consistent data structure captured for analysis
- Clean handoff to AnalysisAgent with complete assessment data

**Questions to Clarify**:
- Does AssessmentAgent do any scoring/analysis or pure data collection?
- How does it handle incomplete responses or user drop-offs?
- Should it provide immediate feedback or wait for analysis phase?
- What level of clarification/education should it provide during questions?

---

### 3. AnalysisAgent

**Primary Responsibility**: Post-Processing Scoring & Strategy Determination

**Core Functions**:
- Apply dynamic weighting to assessment responses
- Generate readiness scores across 6 categories
- Determine AI strategy recommendation (5-tier system)
- Analyze concerns and generate mitigation strategies
- Create phased roadmap recommendations

**Specific Tasks**:
- Score responses using dynamic weights from QualifierAgent
- Calculate overall readiness score and category breakdowns
- Map scores to appropriate AI strategy tier:
  - Efficiency → Productivity → Effectiveness → Growth → Expert
- Identify potential concerns and barriers from responses
- Generate 3-phase roadmap (3-month, 6-month, long-term)
- Prepare structured data for ReportingAgent

**Success Criteria**:
- Accurate scoring with proper dynamic weighting applied
- Appropriate strategy recommendation based on readiness level
- Actionable roadmap with realistic timelines for SMB context
- Clean handoff to ReportingAgent with complete analysis

**Questions to Clarify**:
- Does AnalysisAgent present findings to user or just prepare data?
- How does it handle edge cases where scores don't map clearly to strategies?
- Should it provide immediate verbal summary before formal report?
- Does it do concern analysis or just scoring?

---

### 4. ReportingAgent

**Primary Responsibility**: Professional Report Generation & Delivery

**Core Functions**:
- Generate professional reports via Beautiful.ai MCP integration
- Create multiple output formats (PDF, presentation, dashboard)
- Handle report delivery and access management
- Provide fallback reporting if Beautiful.ai unavailable

**Specific Tasks**:
- Transform analysis data into Beautiful.ai compatible format
- Generate modular report sections:
  - Executive Summary
  - Detailed Category Scoring
  - Addressing Concerns
  - Strategic Recommendations
  - Phased Roadmap
- Create multiple format outputs for different use cases
- Handle Beautiful.ai API failures gracefully with fallbacks
- Provide report access/download links to user

**Success Criteria**:
- Professional-quality reports generated successfully
- Multiple format options available
- Robust error handling for API failures
- Clear report delivery to end user

**Questions to Clarify**:
- Does ReportingAgent provide report summary in chat or just links?
- How does it handle Beautiful.ai rate limits or downtime?
- Should it create reports incrementally or all at once?
- What fallback report generation method should be used?

---

### 5. OrchestrationAgent (Coordinator)

**Primary Responsibility**: Agent State Management & Handoff Coordination

**Core Functions**:
- Manage agent transitions and state handoffs
- Maintain conversation context across agents
- Handle error recovery and agent fallbacks
- Coordinate data flow between agents

**Specific Tasks**:
- Initialize assessment flow and determine starting agent
- Manage smooth transitions between agents
- Maintain conversation state and context
- Handle agent failures and retry logic
- Coordinate data persistence and event emission
- Manage session state and user experience continuity

**Success Criteria**:
- Seamless user experience across agent transitions
- Reliable state management and data persistence
- Robust error handling and recovery
- Consistent conversation flow throughout process

**Questions to Clarify**:
- Should OrchestrationAgent have its own conversational personality?
- How does it handle partial failures or agent timeouts?
- Does it maintain conversation history or delegate to individual agents?
- Should it provide meta-commentary about assessment progress?

---

## Key Clarification Questions

### Agent Boundaries

1. **Scoring Responsibility**: 
   - Does AssessmentAgent do any scoring or purely collect data?
   - Is all scoring/analysis handled by AnalysisAgent?

2. **Conversation Management**:
   - Which agent maintains conversation personality/tone throughout?
   - How do agents hand off conversational context?

3. **User Interaction**:
   - Do multiple agents interact directly with users or only through orchestrator?
   - Should users be aware of agent transitions?

4. **Error Handling**:
   - Which agent handles clarification requests during assessment?
   - How do agents recover from incomplete or confusing responses?

5. **State Management**:
   - Where is assessment state stored between agent transitions?
   - How is data persistence handled across the flow?

### Implementation Decisions Needed

1. **Agent Communication Pattern**:
   - Direct agent-to-agent communication or through orchestrator?
   - Synchronous vs asynchronous agent handoffs?

2. **Data Flow Architecture**:
   - Where does dynamic weighting data live during assessment?
   - How is assessment progress tracked and persisted?

3. **User Experience Design**:
   - Should agent transitions be transparent or visible to users?
   - How do we maintain conversation continuity across agents?

4. **Fallback Strategies**:
   - What happens if an agent fails mid-process?
   - How do we handle partial completions?

---

## Next Steps

1. **Review and refine agent boundaries** based on implementation requirements
2. **Define data schemas** for agent handoffs and state management
3. **Design state management system** for conversation continuity
4. **Create agent interaction protocols** for handoff procedures
5. **Plan error handling strategies** for robust user experience

---

*This document will be updated as agent implementation progresses and boundaries are refined through development.*