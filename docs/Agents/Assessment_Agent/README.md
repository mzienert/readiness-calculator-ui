## Assessment Agent

### Purpose
AI Readiness Assessment Agent for SMBs and solopreneurs. It evaluates readiness across 6 categories and recommends a safe, lowest-risk AI strategy first, with an incremental roadmap.

### Current Status
- First-pass framework (version "SMB-1.0").
- Conversation-driven: asks exactly one question at a time; stays on-topic.
- Dynamic weighting adjusts thresholds for small teams, local/rural focus, and budget constraints.
- Targeted primarily at SMB contexts (including La Plata County) with emphasis on quick wins, low mental load, and cost sensitivity.
- Source: `Assessment_Agent_System_Prompt.md`.

### Inputs
- Qualifying info (used for dynamic weighting):
  - `employee_count` (e.g., 1, 2–50, 51–250)
  - `revenue_band` (e.g., under $100K, $100K–$1M, $1M–$5M, $5M–$10M, $10M+)
  - `business_type` (e.g., solopreneur, family-owned, rural/local)

- Assessment scores (6 categories, 2 questions each, scored 1–5):
  1) Market Strategy: `1a`, `1b`
  2) Business Understanding: `2a`, `2b`
  3) Workforce Acumen: `3a`, `3b`
  4) Company Culture: `4a`, `4b`
  5) Role of Technology: `5a`, `5b`
  6) Data: `6a`, `6b`
  - Category totals range 2–10; overall max 60 before weighting.

- Client concerns (optional list): brand voice, workload sustainability, quality/accuracy, job displacement, cost/complexity, client trust, data security, vendor dependence, learning curve, competitive pressure, owner burnout, lack of KPIs.

#### Minimal JSON input shape
```json
{
  "metadata": { "version": "SMB-1.0" },
  "qualifiers": {
    "employee_count": null,
    "revenue_band": null,
    "business_type": null
  },
  "scores": {
    "1a": null, "1b": null,
    "2a": null, "2b": null,
    "3a": null, "3b": null,
    "4a": null, "4b": null,
    "5a": null, "5b": null,
    "6a": null, "6b": null
  },
  "client_concerns": []
}
```

### Scoring and Strategy Selection
- Scoring levels: 1 Light, 2 Emerging, 3 Implementing, 4 Advanced, 5 Innovators.
- Dynamic weighting relaxes thresholds for solopreneurs/small teams and budget-constrained cases; biases toward low-mental-load options.
- Available strategies (ordered by complexity/risk): Efficiency, Productivity, Effectiveness, Growth, Expert.
- Primary recommendation = safest strategy permitted across all categories after weighting.

### Outputs
- Human-readable report sections:
  - Executive Summary
  - Detailed Scoring Breakdown
  - Addressing Your Concerns
  - Strategy Education
  - Strategic Recommendation
  - Development Priorities
  - Next Steps

- Structured result fields
```json
{
  "assessment_result": {
    "scores": {
      "market_strategy": { "1a": 0, "1b": 0, "total": 0 },
      "business_understanding": { "2a": 0, "2b": 0, "total": 0 },
      "workforce_acumen": { "3a": 0, "3b": 0, "total": 0 },
      "company_culture": { "4a": 0, "4b": 0, "total": 0 },
      "role_of_technology": { "5a": 0, "5b": 0, "total": 0 },
      "data": { "6a": 0, "6b": 0, "total": 0 }
    },
    "overall_score": 0,
    "readiness_level": "",
    "recommended_strategies": ["efficiency"],
    "client_concerns_addressed": {},
    "strategy_rationale": "",
    "assessment_date": "",
    "assessor": "",
    "dynamic_weights_applied": {}
  }
}
```

### Interaction Rules
- Ask one question at a time from start to finish.
- Politely decline non-assessment topics; stay within AI readiness scope.
- Use approachable SMB language; emphasize cost sensitivity and reducing mental load.

### File Reference
- System prompt: `Assessment_Agent_System_Prompt.md`

