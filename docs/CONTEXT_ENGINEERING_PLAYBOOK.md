# AI Readiness Wizard — Context Engineering Playbook (Draft v1)

## Purpose

This playbook defines the structure, standards, and processes for maintaining consistent, reliable, and scalable agent collaboration within the AI Readiness Wizard system. It ensures that all agents function cohesively under the orchestration layer, follow shared schema standards, and evolve through continuous evaluation and fine-tuning.

---

## 1. System Overview

The AI Readiness Wizard uses a **multi-agent architecture** controlled by an **Orchestrator Agent**, coordinating the following specialized agents:

- **QualifierAgent** — Gathers baseline business information.
- **AssessorAgent** — Evaluates AI readiness across six categories.
- **AnalyzerAgent** — Scores and recommends strategy tiers.
- **ReporterAgent** — Generates human-readable summaries and reports.

Each agent is modular, schema-driven, and dynamically prompted through the orchestrator. All prompt templates are managed centrally in `prompts.ts`.

---

## 2. Context Engineering Principles

| Principle                     | Description                                                            | Example                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Context Continuity**        | Maintain essential business data and tone across all agents.           | Business size and industry passed from Qualifier → Assessor → Analyzer. |
| **Prompt Modularity**         | Prompts defined as reusable templates with runtime variable injection. | `{{industry}}`, `{{business_size}}`, `{{tone_profile}}`.                |
| **Schema Consistency**        | Shared output format across all agents.                                | `Zod` validation or unified TypeScript interfaces.                      |
| **Adaptive Tone**             | Maintain empathetic, SMB-aligned tone.                                 | “Professional, clear, supportive.”                                      |
| **Performance Feedback Loop** | Evaluate and refine prompts via OpenAI Evals.                          | Automatic eval after prompt changes.                                    |

---

## 3. Memory & Context Management

### Context Layers

- **Ephemeral Memory:** Stored in orchestrator’s `context_cache` for current session flow.
- **Persistent Memory:** Retains user/business profiles for returning sessions.
- **Scoped Context Windows:** Only relevant data passed to each agent to control token use.

### Context Frame Example

```json
{
  "context_frame": {
    "business_profile": { "industry": "Retail", "size": 12 },
    "recent_responses": ["Strong marketing strategy"],
    "orchestrator_meta": { "session_id": "abc123", "active_agent": "Assessor" }
  }
}
```

### Memory Protocols

- **Context Trim:** Orchestrator prioritizes key fields and drops greetings or redundant text.
- **Session Linking:** Persistent IDs track cross-session insights.
- **Sanitization:** Remove any personal identifiers before persistence.

---

## 4. Structured Response & Validation Protocols

### Response Standards

- Every agent must output valid JSON wrapped in triple backticks (`json ... `).
- Orchestrator performs schema validation before passing outputs forward.
- On failure, orchestrator retries with corrective system prompt.

### Normalized Response Wrapper

```json
{
  "status": "success",
  "agent": "AnalyzerAgent",
  "confidence_score": 0.94,
  "data": { "tier": "Productivity", "readiness_score": 3.7 },
  "notes": "SMB shows mid-level AI adoption maturity."
}
```

### Validation Steps

1. **Schema Validation:** Ensure output matches agent definition.
2. **Semantic Validation:** Ensure logical alignment with context.
3. **Tone Validation:** Use keyword detection to flag off-tone replies.

---

## 5. Guardrails & Alignment Framework

### Guardrail Types

| Type                      | Enforcement                 | Purpose                                      |
| ------------------------- | --------------------------- | -------------------------------------------- |
| **Content Guardrails**    | Regex and prompt rules.     | Block disallowed topics or PII.              |
| **Behavioral Guardrails** | Embedded in system prompts. | Maintain professionalism, avoid speculation. |
| **Schema Guardrails**     | Zod validation.             | Enforce structure and required fields.       |
| **Ethical Guardrails**    | Policy filters.             | Prevent bias, ensure data fairness.          |

### Guardrail Example

```json
{
  "guardrails": {
    "prohibited_topics": ["personal data", "medical advice"],
    "tone_requirements": ["supportive", "confident", "neutral"],
    "response_policy": "Reject if uncertain rather than speculate."
  }
}
```

---

## 6. Agent Consistency Layer

- **Shared Lexicon:** Unified naming for variables and concepts.
- **Prompt Registry:** All templates and tone profiles stored in `prompts.ts`.
- **Version Control:** Every prompt version tagged (`PROMPTS.V2.QUALIFIER`).
- **Cross-Agent Testing:** Regression tests verify consistent outputs under same input.

---

## 7. Assistant Management (OpenAI Platform)

### Assistant Lifecycle

| Stage                 | Action                                                     | Tools                         |
| --------------------- | ---------------------------------------------------------- | ----------------------------- |
| **Versioning**        | Assign consistent version IDs (e.g., `asst_qualifier_v2`). | Git + JSON manifests.         |
| **Evaluation**        | Run evals before deploying prompt updates.                 | OpenAI Evals Dashboard.       |
| **Fine-Tuning**       | Apply only after stable eval performance.                  | JSONL training datasets.      |
| **Canary Deployment** | Test new versions on partial traffic.                      | Orchestrator version routing. |

### Example Assistant Manifest

```json
{
  "id": "asst_analyzer_v2",
  "role": "AnalyzerAgent",
  "version": "2.1.0",
  "model": "gpt-4o-mini",
  "eval_dataset": "analyzer-eval-v2.jsonl",
  "last_eval_score": 0.89,
  "status": "active"
}
```

---

## 8. Orchestrator Control Layer

**Responsibilities:**

- Context assembly and injection.
- Streaming response management.
- Schema validation and retry logic.
- Evaluation triggers post-run.
- Agent version routing based on manifests.

### Context Schema

```json
{
  "orchestrator_context": {
    "session_id": "string",
    "active_agent": "string",
    "context_cache": {
      "qualifier": {},
      "assessor": {},
      "analyzer": {},
      "reporter": {}
    },
    "streaming_state": true,
    "eval_trigger": true
  }
}
```

---

## 9. Continuous Evaluation & Improvement

### Feedback Loop

```
Prompt Update → Eval Run → Score Review → Fine-Tuning (if needed) → Deployment → Logging → Feedback Loop
```

### Automated Eval Metrics

| Metric               | Target |
| -------------------- | ------ |
| Context Completeness | ≥ 80%  |
| Scoring Consistency  | ≥ 90%  |
| Tone Accuracy        | ≥ 95%  |
| Schema Validity      | 100%   |

### Regression Testing

- Use “golden responses” dataset for pre-deployment verification.
- Validate both single-agent and full-orchestration runs.

---

## 10. Governance & Change Control

- **Prompt Change Approval:** All prompt updates reviewed by context engineer before merge.
- **Eval Score Thresholds:** Minimum eval score before deployment: 0.85.
- **Changelog Management:** Each prompt version documented with rationale and eval outcome.
- **Rollback Procedure:** Use manifest-based version rollback in orchestrator.

---

## Summary

This playbook defines the operational, contextual, and ethical foundation for consistent multi-agent collaboration. It enforces prompt modularity, structured outputs, and evaluation-driven improvement—ensuring the AI Readiness Wizard remains transparent, adaptive, and reliable for real-world use.

---

# 🧠 Addendum: Prompt Lifecycle Management & Reporting Framework (App-Based)

## **11. Prompt Lifecycle Management**

### 11.1 Overview

Prompts are living system components. Each one—whether Qualifier, Assessor, Analyzer, or Reporter—follows a defined lifecycle: **creation → testing → evaluation → deployment → monitoring.**

### 11.2 Prompt Registry and Versioning

Prompts are stored in `prompts.ts` as versioned modular templates. Each template includes metadata:

```json
{
  "agent": "AssessorAgent",
  "version": "v2.1",
  "status": "active",
  "improvements": "Added tone clarification for SMBs.",
  "last_eval_score": 0.93
}
```

### 11.3 Update Process

1. Identify issue or opportunity via Eval or user logs.
2. Draft improvement in a local branch (`prompts_draft.ts`).
3. Run regression and Evals.
4. Merge after passing schema, tone, and performance thresholds.
5. Deploy via orchestrator manifest update.

### 11.4 Improvement Focus Areas

- Clarity of instructions
- Consistency of tone and reasoning
- Schema alignment
- Removal of ambiguity and redundant phrases
- Streamlined dynamic injection variables

---

## **12. Reporting Agent Framework (In-App Delivery)**

### 12.1 Purpose

The ReportingAgent compiles structured outputs into a **human-readable, actionable report** displayed within the AI Readiness Wizard and exportable as PDF.

### 12.2 Standard Report Structure

Each completed assessment generates a six-part report:

| Section                  | Purpose                                              | Example Output                                                                                                                   |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Executive Summary**    | Concise overview of AI readiness status.             | “Your business is in the ‘Productivity’ tier. You’ve built a solid digital foundation and are ready for simple AI integrations.” |
| **Readiness Overview**   | Key category scores (1–5) visualized.                | Table or bar chart displaying readiness per category.                                                                            |
| **Detailed Insights**    | Explanation of strengths and weaknesses by category. | “Technology Usage: Developing — You’ve adopted tools but lack automation.”                                                       |
| **Practical Examples**   | Context-based examples of early AI use cases.        | “Example: Automate social media post scheduling using AI tools.”                                                                 |
| **Resources & Tools**    | Curated educational or implementation resources.     | “Learn: Intro to AI for SMBs; Tools: Zapier, Notion AI.”                                                                         |
| **Roadmap & Next Steps** | 3-phase readiness roadmap.                           | “Phase 1: Automate data collection → Phase 2: AI dashboards → Phase 3: Predictive insights.”                                     |

### 12.3 JSON Output Schema

```json
{
  "executive_summary": "string",
  "category_scores": {
    "market_strategy": 4,
    "data_practices": 2
  },
  "insights": ["string"],
  "examples": ["string"],
  "resources": ["string"],
  "roadmap": [
    {
      "phase": 1,
      "focus": "Efficiency",
      "actions": ["Automate reporting tasks"]
    },
    {
      "phase": 2,
      "focus": "Effectiveness",
      "actions": ["Integrate CRM automation"]
    }
  ]
}
```

### 12.4 Report Delivery in the App

Reports will be:

- Displayed directly in the Wizard interface with progress visualizations.
- Available for **PDF export** through the backend.
- Optionally **emailed** to the business contact with personalized summary text.
- Stored under the business profile for follow-up readiness tracking.

### 12.5 Additional Delivery Options

| Channel                      | Description                                     | Example                                            |
| ---------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| **In-App Dashboard**         | Persistent report summary and readiness trends. | Line charts showing readiness growth.              |
| **Email Summary**            | Concise digest with PDF attachment.             | “Here’s your AI readiness roadmap and next steps.” |
| **Downloadable Report Pack** | Bundle of report PDF + recommended resources.   | ZIP file with customized insights.                 |
| **Interactive Roadmap View** | Clickable UI timeline for next steps.           | Users explore each readiness phase interactively.  |

---

## **13. Continuous Improvement Loop**

### Prompt–Report Integration Flow

```
Prompt Revision → Internal Eval → Orchestrator Validation → New Reports → User Feedback → Prompt Optimization
```

### Feedback Pipeline

- Each report includes hidden metadata (prompt version, eval ID).
- User feedback or low-scoring evals auto-flag prompt sections for review.
- Context engineer reviews and merges updates after at least two eval cycles.

---

_Version: v1.1 — Updated to include prompt lifecycle governance, in-app reporting framework, and delivery enhancements._
