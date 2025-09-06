## Qualifier Agent

### Purpose
Collects SMB qualifying information to enable dynamic weighting and tone-setting before assessment begins. Emits the unified AI Readiness JSON object with only the Qualifier sections populated, ready for the Assessment/Analysis agents to complete.

### Current Status
- First-pass framework (version "SMB-1.0").
- Conversation-driven: asks exactly one question at a time; stays on-topic.
- Derives boolean dynamic weighting flags from qualifiers; does not score or recommend strategies.
- Uses the unified schema shared with the Assessment Agent.
- Source: `Qualifier_Agent_System_Prompt`.

### Inputs (asked one-by-one)
- **employee_count**: 1, 2–10, 11–50, 51–250, etc.
- **revenue_band**: under $100K, $100K–$1M, $1M–$5M, $5M–$10M, $10M+.
- **business_type**: e.g., solopreneur, family-owned, rural/local focus.

### Derived Flags (dynamic weighting)
Set booleans only (no scoring):
- `solopreneur_relaxation`: true if employee_count == 1
- `small_team_relaxation`: true if 2 ≤ employees ≤ 10
- `rural_focus_weighting`: true if business_type implies rural/local focus
- `budget_modifier`: true if revenue_band is under $100K or clearly cost-constrained

### Minimal JSON output shape (unified schema fragment)
The Qualifier Agent outputs the full unified object, but only these fields are populated; the rest remain present and unpopulated (null/empty) for the next agents.

```json
{
  "ai_readiness_assessment": {
    "metadata": {
      "version": "SMB-1.0",
      "title": "AI Readiness Assessment Profile for SMBs",
      "description": "Structured assessment adapted for SMBs…",
      "scoring_range": { "min": 1, "max": 5, "category_min": 2, "category_max": 10 },
      "scoring_levels": { "1": "Light", "2": "Emerging", "3": "Implementing", "4": "Advanced", "5": "Innovators" },
      "qualifiers": {
        "employee_count": { "description": "…", "value": null },
        "revenue_band": { "description": "…", "value": null },
        "business_type": { "description": "…", "value": null }
      },
      "dynamic_weighting": {
        "description": "Adjusts scoring thresholds…",
        "rules": {
          "solopreneur_relaxation": null,
          "small_team_relaxation": null,
          "rural_focus_weighting": null,
          "budget_modifier": null
        },
        "notes": null
      }
    },
    "categories": { "…": { } },
    "scoring_matrices": { "…": { } },
    "ai_strategies": { "…": { } },
    "client_concerns": { "description": "…", "concerns": [], "concern_categories": { "…": "…" } },
    "assessment_result": {
      "scores": {
        "market_strategy": { "1a": null, "1b": null, "total": null },
        "business_understanding": { "2a": null, "2b": null, "total": null },
        "workforce_acumen": { "3a": null, "3b": null, "total": null },
        "company_culture": { "4a": null, "4b": null, "total": null },
        "role_of_technology": { "5a": null, "5b": null, "total": null },
        "data": { "6a": null, "6b": null, "total": null }
      },
      "overall_score": null,
      "readiness_level": null,
      "recommended_strategies": [],
      "client_concerns_addressed": {},
      "strategy_rationale": null,
      "assessment_date": null,
      "assessor": null,
      "dynamic_weights_applied": null
    }
  }
}
```

Notes:
- Qualifier populates `qualifiers.value` and `dynamic_weighting.rules` (and optional `notes`).
- Leaves all scoring and strategy fields unmodified.
- Keeps the full object shape intact so the Assessment/Analysis agents can fill their sections.

### Outputs
- A single, validated JSON object following the unified schema, with only Qualifier-owned fields populated.
- No prose, unless wrapped by an orchestration layer outside this agent.

### Interaction Rules
- Ask one question at a time from start to finish; provide brief clarifications only.
- Do not score, interpret, or select strategies.
- Keep tone SMB-aware, friendly, and concise; avoid jargon.

### File Reference
- System prompt: `Qualifier_Agent_System_Prompt`


