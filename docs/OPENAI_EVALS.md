# OpenAI Evals for AI Readiness Calculator

A comprehensive guide to implementing and leveraging OpenAI Evals for evaluating our multi-agent assessment system, tailored for learning and continuous improvement.

## Table of Contents
- [What Are OpenAI Evals?](#what-are-openai-evals)
- [Why Evals Matter for Our Project](#why-evals-matter-for-our-project)
- [Learning Roadmap](#learning-roadmap)
- [Eval Strategy for Our Agents](#eval-strategy-for-our-agents)
- [Implementation Steps](#implementation-steps)
- [OpenAI Dashboard Configuration](#openai-dashboard-configuration)
- [Eval Types & When to Use Them](#eval-types--when-to-use-them)
- [Practical Examples](#practical-examples)
- [Measurement & Iteration](#measurement--iteration)

## What Are OpenAI Evals?

OpenAI Evals is a framework for evaluating AI systems against specific benchmarks and criteria. Think of it as "unit testing for AI" - it helps ensure your AI behaves consistently and improves over time.

### Core Concepts:
- **Eval**: A test that measures specific AI behavior
- **Dataset**: Collection of inputs and expected outputs
- **Metrics**: Quantitative measures of performance (accuracy, relevance, etc.)
- **Baseline**: Initial performance measurement for comparison

### Key Benefits:
- **Systematic Improvement**: Identify specific weaknesses to address
- **Regression Prevention**: Catch when changes break existing behavior
- **Confidence Building**: Quantify AI reliability before deployment
- **Data-Driven Decisions**: Use metrics to guide development priorities

## Why Evals Matter for Our Project

Our AI Readiness Calculator has unique challenges that make evals crucial:

### 1. **Multi-Agent Consistency**
- Ensure all 4 agents (Qualifier, Assessment, Analysis, Reporting) work cohesively
- Prevent inconsistencies between agent outputs
- Validate proper handoffs between agents

### 2. **SMB Context Accuracy**
- Verify questions are appropriate for small/medium businesses
- Ensure rural/small business terminology is used correctly
- Validate that recommendations align with SMB constraints

### 3. **Assessment Quality**
- Measure whether questions effectively capture readiness dimensions
- Evaluate scoring methodology consistency
- Assess strategy recommendation relevance

### 4. **User Experience**
- Ensure conversations feel natural and empathetic
- Prevent overwhelming users with complex terminology
- Validate appropriate pacing and question sequencing

## Learning Roadmap

We'll progress through evals in order of complexity to build understanding:

### Phase 1: Foundation (Week 1)
- [ ] Set up OpenAI Dashboard for evals
- [ ] Create first simple eval (prompt comparison)
- [ ] Understand eval results and metrics
- [ ] Learn eval dataset creation

### Phase 2: Agent-Specific Evals (Week 2-3)
- [ ] QualifierAgent: Context collection accuracy
- [ ] AssessmentAgent: Question quality and relevance
- [ ] AnalysisAgent: Scoring consistency and strategy alignment
- [ ] ReportingAgent: Output format and clarity

### Phase 3: Integration Testing (Week 4)
- [ ] End-to-end workflow evaluation
- [ ] Multi-agent consistency testing
- [ ] User experience simulation
- [ ] Performance optimization

### Phase 4: Continuous Monitoring (Ongoing)
- [ ] Automated eval pipeline
- [ ] Production monitoring dashboard
- [ ] Regular eval dataset updates
- [ ] Performance trend analysis

## Eval Strategy for Our Agent Flow: Qualifier → Assessment → Analysis → Reporting

### Current Implementation State
- ✅ **QualifierAgent**: Implemented with OpenAI Assistants API
- ✅ **AssessmentAgent**: Implemented with JSON structured outputs
- ✅ **AnalysisAgent**: Implemented with scoring/strategy generation
- ❌ **ReportingAgent**: Not yet implemented (Beautiful.ai integration planned)

### 1. QualifierAgent Evals - **START HERE**
**API Endpoint**: `/api/agents/qualifier/route.ts`
**Assistant ID**: `QUALIFIER_ASSISTANT_ID` environment variable

**Purpose**: Validate effective SMB context collection for downstream agents

**Key Metrics**:
- Context completeness (`collected_responses` field accuracy)
- `needs_more_info` decision accuracy
- Question clarity for non-technical users
- Proper handoff to AssessmentAgent

**Current Output Structure**:
```json
{
  "message": "conversational response",
  "collected_responses": { "industry": "...", "size": "..." },
  "needs_more_info": boolean
}
```

**Eval Types**:
- **Factual**: Does `collected_responses` extract correct business context?
- **Conversational**: Are questions natural and empathetic?
- **Coverage**: Does it capture all necessary context dimensions?
- **Handoff Quality**: Is context sufficient for AssessmentAgent?

### 2. AssessmentAgent Evals
**API Endpoint**: `/api/agents/assessor/route.ts`
**Assistant ID**: `ASSESSOR_ASSISTANT_ID` environment variable

**Purpose**: Ensure high-quality, relevant assessment questions across 6 categories

**Key Metrics**:
- Question relevance to AI readiness per category
- `assessment_complete` decision accuracy
- Coverage of all 6 assessment categories (Market Strategy, Business Understanding, Workforce Acumen, Company Culture, Role of Technology, Data)
- Context utilization from QualifierAgent

**Current Output Structure**:
```json
{
  "message": "conversational response",
  "collected_responses": { "question_id": "response" },
  "current_question_id": "1a",
  "assessment_complete": boolean
}
```

**Eval Types**:
- **Content Quality**: Are questions well-designed for each category?
- **SMB Appropriateness**: Do questions fit SMB constraints from qualifier?
- **Category Coverage**: Equal representation across 6 dimensions?
- **Context Utilization**: Does it properly use qualifier context?

### 3. AnalysisAgent Evals
**API Endpoint**: `/api/agents/analyzer/route.ts`
**Assistant ID**: `ANALYZER_ASSISTANT_ID` environment variable

**Purpose**: Validate scoring accuracy, strategy recommendations, and roadmap generation

**Key Metrics**:
- Scoring consistency across similar business profiles
- Strategy alignment with readiness tier (Efficiency → Productivity → Effectiveness → Growth → Expert)
- Recommendation actionability for SMBs
- Dynamic weighting application from qualifier context

**Current Output Structure**:
```json
{
  "message": "conversational response",
  "analysis_complete": boolean,
  "scoring": { "category": { "questionKey": number, "total": number, "level": string }},
  "strategy_recommendation": { "primary_strategy": "...", "rationale": "..." },
  "roadmap": { "phase": { "timeline": "...", "focus": "..." }},
  "concerns_analysis": { "identified_concerns": [], "mitigation_strategies": {} }
}
```

**Eval Types**:
- **Scoring Accuracy**: Compare against expert assessments
- **Consistency**: Same inputs → same outputs across similar businesses
- **Strategy Relevance**: Match recommendations to context and scoring
- **Roadmap Quality**: Actionable, timeline-appropriate recommendations

### 4. ReportingAgent Evals - **NOT YET IMPLEMENTED**
**Status**: Planned for Beautiful.ai integration

**Future Purpose**: Ensure professional, actionable report generation

**Planned Metrics**:
- Report completeness and structure
- Beautiful.ai integration success
- Actionable recommendation specificity
- Multiple format generation

**Future Eval Types**:
- **Format Compliance**: Meets Beautiful.ai requirements
- **Content Quality**: Professional language and structure
- **Integration Reliability**: API success rates and error handling

## Implementation Steps

### Step 1: OpenAI Dashboard Setup

1. **Access Evals Platform**:
   ```bash
   # Install OpenAI CLI
   pip install openai

   # Authenticate
   openai api keys
   ```

2. **Create Organization Structure**:
   - Navigate to OpenAI Dashboard → Evals
   - Create project: "AI Readiness Calculator"
   - Set up team access and permissions

3. **Configure API Access**:
   ```javascript
   // Add to your .env.local
   OPENAI_EVALS_API_KEY=your-evals-specific-key
   OPENAI_ORG_ID=your-organization-id
   ```

### Step 2: Create Your First Eval

**Start Simple**: QualifierAgent Context Extraction

1. **Define Success Criteria**:
   ```yaml
   # Example eval config
   name: "qualifier-context-extraction"
   description: "Measures QualifierAgent's ability to extract business context"
   model: "gpt-4o"
   success_criteria:
     - industry_identified: true
     - company_size_captured: true
     - tech_level_assessed: true
   ```

2. **Create Test Dataset**:
   ```json
   [
     {
       "input": "We're a small accounting firm with 8 employees in rural Colorado",
       "expected_output": {
         "industry": "professional services",
         "size": "small",
         "tech_level": "emerging",
         "location": "rural"
       }
     }
   ]
   ```

### Step 3: Dashboard Configuration

**In OpenAI Dashboard**:

1. **Navigate to Evals Section**
   - Organization Settings → Evals
   - Create New Eval Set

2. **Configure Eval Parameters**:
   - **Model**: gpt-4o (recommended for consistency)
   - **Temperature**: 0.1 (for reproducible results)
   - **Max Tokens**: Appropriate for your agent outputs
   - **Evaluation Frequency**: Daily/Weekly based on development pace

3. **Set Up Monitoring**:
   - Performance alerts for score drops
   - Weekly summary reports
   - Integration with your CI/CD pipeline

### Step 4: Measurement Setup

**Key Metrics Dashboard**:
- Overall eval score trends
- Per-agent performance breakdown
- Category-specific accuracy rates
- Response time and cost metrics

## Eval Types & When to Use Them

### 1. **Factual Evals** (Easiest to start)
**Best for**: Objective, verifiable outputs
**Use with**: Context extraction, data parsing, category classification

```python
# Example: Verify industry classification
def eval_industry_classification(response):
    expected_industries = ["healthcare", "retail", "manufacturing", ...]
    extracted_industry = parse_industry(response)
    return extracted_industry in expected_industries
```

### 2. **Model-Graded Evals** (Most scalable)
**Best for**: Subjective quality assessment
**Use with**: Question quality, response helpfulness, language appropriateness

```python
# Example: Assess question quality using GPT-4
def eval_question_quality(question):
    grading_prompt = f"""
    Rate this assessment question for SMB AI readiness on a scale of 1-5:
    Question: {question}

    Criteria:
    - Clarity for non-technical users
    - Relevance to AI readiness
    - Appropriate for small business context
    """
    return grade_with_model(grading_prompt)
```

### 3. **Human Evals** (Highest quality)
**Best for**: Complex judgment, user experience validation
**Use with**: Overall assessment quality, empathy evaluation, strategy usefulness

```python
# Example: Human rating of conversation empathy
def eval_conversation_empathy(conversation):
    return human_rating_interface(
        conversation=conversation,
        criteria=["empathetic", "appropriate_pace", "non_overwhelming"]
    )
```

### 4. **A/B Testing Evals** (Best for optimization)
**Best for**: Comparing prompt variations, model versions
**Use with**: Prompt optimization, model selection, feature testing

## Practical Examples

### Example 1: QualifierAgent Business Context Eval

```json
{
  "eval_name": "qualifier_business_context",
  "description": "Tests QualifierAgent's ability to extract complete business context",
  "endpoint": "/api/agents/qualifier",
  "test_cases": [
    {
      "input_messages": [
        {"role": "user", "content": "Hi, I run a small restaurant in Durango with 12 employees. We use basic POS systems but that's about it for tech."}
      ],
      "expected_output": {
        "collected_responses": {
          "industry": "food_service",
          "business_size": "small",
          "location": "durango",
          "current_tech_level": "basic",
          "employee_count": "12"
        },
        "needs_more_info": false
      },
      "success_criteria": {
        "context_completeness": 0.8,
        "industry_accuracy": 1.0,
        "size_accuracy": 1.0,
        "needs_more_info_decision": true
      }
    }
  ]
}
```

### Example 2: AssessmentAgent Question Quality Eval

```python
# Model-graded eval for question appropriateness
evaluation_prompt = """
Evaluate this AI readiness assessment question for a small business context.

Question: "{question}"

Rate 1-5 on each criterion:
1. Clarity for non-technical business owners
2. Relevance to AI adoption readiness
3. Appropriateness for SMB constraints
4. Actionability of potential responses

Provide a JSON response with scores and brief reasoning.
"""

def grade_assessment_question(question):
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": evaluation_prompt.format(question=question)
        }],
        temperature=0.1
    )
    return parse_eval_response(response)
```

### Example 3: AnalysisAgent Scoring Consistency Eval

```python
# Test scoring consistency across similar business profiles
test_profiles = [
    {"industry": "retail", "size": "small", "tech_usage": "basic"},
    {"industry": "retail", "size": "small", "tech_usage": "minimal"},
    {"industry": "retail", "size": "medium", "tech_usage": "basic"}
]

def eval_scoring_consistency(profiles, responses):
    scores = [analyze_agent.score_readiness(p, r) for p, r in zip(profiles, responses)]

    # Similar profiles should have similar scores
    similar_variance = calculate_variance(scores[:2])  # First two are similar
    different_variance = calculate_variance([scores[0], scores[2]])  # Different sizes

    return {
        "consistency_score": 1.0 if similar_variance < 0.1 else 0.5,
        "differentiation_score": 1.0 if different_variance > 0.2 else 0.5
    }
```

## Measurement & Iteration

### Key Performance Indicators (KPIs)

1. **Accuracy Metrics**:
   - Context extraction accuracy: >95%
   - Question relevance score: >4.0/5.0
   - Scoring consistency: <10% variance
   - Strategy recommendation quality: >4.0/5.0

2. **User Experience Metrics**:
   - Conversation flow rating: >4.0/5.0
   - Empathy assessment: >4.0/5.0
   - Time to completion: <30 minutes
   - User satisfaction: >4.5/5.0

3. **Technical Metrics**:
   - Response time: <2 seconds per agent
   - Cost per assessment: <$2.00
   - Error rate: <1%
   - Uptime: >99.5%

### Iteration Process

1. **Weekly Eval Reviews**:
   - Analyze performance trends
   - Identify degradation patterns
   - Prioritize improvement areas
   - Update eval datasets

2. **Monthly Deep Dives**:
   - Review outlier cases
   - Update success criteria
   - Expand eval coverage
   - Optimize model parameters

3. **Quarterly Strategy Reviews**:
   - Evaluate eval effectiveness
   - Update business requirements
   - Plan new eval categories
   - Review competitive benchmarks

## Step 1 Results: QualifierAgent Evaluation

### Implementation Completed ✅
- **Eval Script**: `evals/qualifier-eval.ts`
- **NPM Command**: `npm run eval:qualifier`
- **Test Scenarios**: 6 SMB scenarios covering La Plata County business types

### First Eval Run Results (66.7% Pass Rate)

**✅ Strengths Identified:**
- **Industry Classification**: 100% accuracy across all business types (restaurant, marketing, retail, healthcare, construction, tourism)
- **Employee Count Extraction**: Consistently accurate team size detection
- **Location Detection**: Perfect identification of Colorado locations (Durango, Cortez, Bayfield, Four Corners)
- **Conversation Quality**: Natural, empathetic language appropriate for SMBs

**❌ Areas for Improvement:**
1. **"Needs More Info" Decision Logic**:
   - Retail store with complete context → incorrectly requested more info
   - Tourism business with complete context → incorrectly requested more info
   - Issue: Assistant being overly cautious instead of recognizing sufficient context

2. **Complex Business Model Handling**:
   - Seasonal employees ("6 full-time + 12 seasonal") → miscounted as "18"
   - Need better parsing of nuanced employment structures

### Key Learning: Eval-Driven Development Works!

The eval immediately revealed specific behavioral issues that weren't apparent in manual testing:
- **Pattern Recognition**: Assistant excellent at extracting structured data
- **Decision Boundary Issues**: "Needs more info" threshold needs calibration
- **Edge Case Handling**: Complex scenarios (seasonal business) need attention

### Recommended Actions:
1. **Fine-tune Assistant Instructions**: Adjust "needs more info" decision criteria
2. **Add Training Examples**: Include seasonal/part-time employee scenarios
3. **Expand Eval Coverage**: Add edge cases discovered during testing

### Next Eval Steps:
- Set up OpenAI Dashboard integration
- Create systematic A/B testing for decision boundary improvements
- Expand to AssessmentAgent evaluation

## Next Steps for Learning

### Immediate Actions (This Week):
1. ✅ **Create simple eval script** for QualifierAgent - **COMPLETED**
2. **Set up OpenAI Dashboard evals** using business context extraction
3. **Focus on specific behavior testing** - business types/sizes identification
4. **Document learnings** in this README

### Questions for Our Next Session:
1. Should we fix the "needs more info" logic before proceeding to Dashboard evals?
2. Do you want to expand QualifierAgent scenarios or move to AssessmentAgent?
3. Ready to set up OpenAI Dashboard integration for automated eval tracking?

Remember: Evals revealed issues in 10 minutes that manual testing missed. This validates the eval-driven development approach for AI agents!