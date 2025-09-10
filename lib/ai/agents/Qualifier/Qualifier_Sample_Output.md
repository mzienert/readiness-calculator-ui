{
  "ai_readiness_assessment": {
    "metadata": {
      "version": "SMB-1.0",
      "title": "AI Readiness Assessment Profile for SMBs",
      "description": "Structured assessment adapted for SMBs with dynamic weighting based on business size and constraints.",
      "scoring_range": {
        "min": 1,
        "max": 5,
        "category_min": 2,
        "category_max": 10
      },
      "scoring_levels": {
        "1": "Light",
        "2": "Emerging",
        "3": "Implementing",
        "4": "Advanced",
        "5": "Innovators"
      },
      "qualifiers": {
        "employee_count": {
          "description": "Number of employees (e.g., 1 for solopreneur)",
          "value": 1
        },
        "revenue_band": {
          "description": "Annual revenue band (e.g., under $100K, $100K-$1M, $1M-$5M, $5M-$10M, $10M+)",
          "value": "under $100K"
        },
        "business_type": {
          "description": "Type of business (e.g., solopreneur, family-owned, rural/local focus)",
          "value": "solopreneur"
        }
      },
      "dynamic_weighting": {
        "description": "Adjusts scoring thresholds and recommendations based on qualifiers to make the assessment approachable for SMBs.",
        "rules": {
          "solopreneur_relaxation": true,
          "small_team_relaxation": false,
          "rural_focus_weighting": false,
          "budget_modifier": true
        },
        "notes": null
      }
    },
    "categories": {
      "market_strategy": {
        "title": "Market Strategy",
        "weight": 1,
        "questions": {
          "market_understanding": {
            "id": "1a",
            "question": "We understand our business and local/rural or national market, and have identified opportunities for growth that fit our daily ops.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "You may be aware of priorities, but your team has minimal knowledge; focus on quick local insights."
              },
              "2": {
                "level": "Emerging",
                "description": "Starting focused discussions with your team to align on basics like customer needs."
              },
              "3": {
                "level": "Implementing",
                "description": "Priorities identified and communicated; using simple tools for local trends."
              },
              "4": {
                "level": "Advanced",
                "description": "Team aligned with clear goals; tracking local/national opportunities effectively."
              },
              "5": {
                "level": "Innovators",
                "description": "Leading your niche with innovative growth, setting local examples."
              }
            }
          },
          "competitive_landscape": {
            "id": "1b",
            "question": "We have a view of our competitive landscape, including local competitors or potential disruptions.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Aware of main competitors but focused on your own daily ops."
              },
              "2": {
                "level": "Emerging",
                "description": "Aware of competitors and occasionally discuss strengths/weaknesses."
              },
              "3": {
                "level": "Implementing",
                "description": "Aware of competitors but reactive; using free tools for basic checks."
              },
              "4": {
                "level": "Advanced",
                "description": "Monitor landscape rigorously; know your position with agile responses."
              },
              "5": {
                "level": "Innovators",
                "description": "Leading the local scene and creating competition through innovation."
              }
            }
          }
        }
      },
      "business_understanding": {
        "title": "Business Understanding",
        "weight": 1,
        "questions": {
          "problem_identification": {
            "id": "2a",
            "question": "We have clarity on daily business pain points like cash flow or customer retention, and address them for continuous improvement.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Many challenges but focused on customers; start with quick fixes."
              },
              "2": {
                "level": "Emerging",
                "description": "Identified problems but action is slow; know where to start."
              },
              "3": {
                "level": "Implementing",
                "description": "Prioritized issues; working on solutions despite limited resources."
              },
              "4": {
                "level": "Advanced",
                "description": "Roadmap in place; actively tackling key pain points this year."
              },
              "5": {
                "level": "Innovators",
                "description": "Focused on improvement; engaging in projects that empower your ops."
              }
            }
          },
          "goal_setting": {
            "id": "2b",
            "question": "We set simple goals based on what keeps us up at night or what we'd fix first in our business.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Goals unclear; start by identifying one key fix."
              },
              "2": {
                "level": "Emerging",
                "description": "Basic goals emerging from daily challenges."
              },
              "3": {
                "level": "Implementing",
                "description": "Goals set for pain points like cash flow; tracking progress simply."
              },
              "4": {
                "level": "Advanced",
                "description": "Clear, achievable goals aligned with ops; measuring impact."
              },
              "5": {
                "level": "Innovators",
                "description": "Innovative goals driving growth; inspiring local success."
              }
            }
          }
        }
      },
      "workforce_acumen": {
        "title": "Workforce Acumen",
        "weight": 1,
        "questions": {
          "talent_composition": {
            "id": "3a",
            "question": "Our team (or you as a solopreneur) has strong business sense and adaptability for daily ops.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Mostly generalists figuring things out; low intimidation start with basics."
              },
              "2": {
                "level": "Emerging",
                "description": "Adding some specialists or freelancers in key areas."
              },
              "3": {
                "level": "Implementing",
                "description": "Mix of generalists and experts; know who to ask for help."
              },
              "4": {
                "level": "Advanced",
                "description": "Specialized roles; clear responsibilities for efficiency."
              },
              "5": {
                "level": "Innovators",
                "description": "Strategic thinkers hands-on; building local talent leadership."
              }
            }
          },
          "leadership_effectiveness": {
            "id": "3b",
            "question": "You or your leaders encourage goals to boost efficiency and productivity in daily ops.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Focus on operations; innovation not prioritized yet."
              },
              "2": {
                "level": "Emerging",
                "description": "Discuss possibilities; support selective quick wins."
              },
              "3": {
                "level": "Implementing",
                "description": "Often explore new tools; balance with daily tasks."
              },
              "4": {
                "level": "Advanced",
                "description": "Mandate improvements; tie to performance."
              },
              "5": {
                "level": "Innovators",
                "description": "Top-down drives; empower team for growth."
              }
            }
          }
        }
      },
      "company_culture": {
        "title": "Company Culture",
        "weight": 1,
        "questions": {
          "adaptability": {
            "id": "4a",
            "question": "Our culture (or your approach as a solopreneur) embraces new ideas and adapts quickly without burnout.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Skeptical of change; high risk of fatigue."
              },
              "2": {
                "level": "Emerging",
                "description": "Open to small improvements."
              },
              "3": {
                "level": "Implementing",
                "description": "Trying new tools/processes selectively."
              },
              "4": {
                "level": "Advanced",
                "description": "Proactive change management."
              },
              "5": {
                "level": "Innovators",
                "description": "Change is part of identity; pace is sustainable."
              }
            }
          },
          "opportunity_mindset": {
            "id": "4b",
            "question": "We value opportunities and are willing to try new things, balancing personal stakes.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Rarely explore new ideas."
              },
              "2": {
                "level": "Emerging",
                "description": "Occasional experiments."
              },
              "3": {
                "level": "Implementing",
                "description": "Regularly test small ideas."
              },
              "4": {
                "level": "Advanced",
                "description": "Systematic experimentation."
              },
              "5": {
                "level": "Innovators",
                "description": "Opportunity led; data-informed bets."
              }
            }
          }
        }
      },
      "role_of_technology": {
        "title": "Role of Technology",
        "weight": 1,
        "questions": {
          "tech_enablers": {
            "id": "5a",
            "question": "Technology helps daily ops; we explore simple tools for priorities.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Ad-hoc tools; little fit."
              },
              "2": {
                "level": "Emerging",
                "description": "Some tools; inconsistent use."
              },
              "3": {
                "level": "Implementing",
                "description": "Tools mapped to priorities."
              },
              "4": {
                "level": "Advanced",
                "description": "Integrated stack; good fit."
              },
              "5": {
                "level": "Innovators",
                "description": "Modern stack; quick pilots."
              }
            }
          },
          "support_and_ideas": {
            "id": "5b",
            "question": "We have reliable tech support (even if one person/freelancers) bringing ideas.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Unreliable support."
              },
              "2": {
                "level": "Emerging",
                "description": "Basic support; slow."
              },
              "3": {
                "level": "Implementing",
                "description": "Reliable enough; some ideas."
              },
              "4": {
                "level": "Advanced",
                "description": "Varies by area; manageable."
              },
              "5": {
                "level": "Innovators",
                "description": "Reliable quality; dependable."
              }
            }
          }
        }
      },
      "data": {
        "title": "Data",
        "weight": 1,
        "questions": {
          "accessibility": {
            "id": "6a",
            "question": "Needed data is accessible, even if in spreadsheets or simple tools.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Hard to access."
              },
              "2": {
                "level": "Emerging",
                "description": "Partially accessible."
              },
              "3": {
                "level": "Implementing",
                "description": "Accessible with effort."
              },
              "4": {
                "level": "Advanced",
                "description": "Mostly accessible and organized."
              },
              "5": {
                "level": "Innovators",
                "description": "Well-organized and discoverable."
              }
            }
          },
          "cleanliness": {
            "id": "6b",
            "question": "Data is clean enough for basic AI use, or we can verify it.",
            "scoring_criteria": {
              "1": {
                "level": "Light",
                "description": "Unreliable/unclean."
              },
              "2": {
                "level": "Emerging",
                "description": "Some cleanup needed."
              },
              "3": {
                "level": "Implementing",
                "description": "Usable with basic checks."
              },
              "4": {
                "level": "Advanced",
                "description": "Generally clean; spot checks."
              },
              "5": {
                "level": "Innovators",
                "description": "High quality; documented."
              }
            }
          }
        }
      }
    },
    "scoring_matrices": {
      "market_strategy": {
        "2-4": {
          "level": "Limited Knowledge",
          "description": "SMB-relaxed thresholds; start local with efficiency/productivity."
        },
        "5-7": {
          "level": "Broader Knowledge",
          "description": "Add effectiveness; consider broader markets."
        },
        "8-10": {
          "level": "Full Knowledge",
          "description": "All strategies available."
        }
      },
      "business_understanding": {
        "2-4": {
          "level": "Limited Understanding",
          "description": "Start with efficiency for pain points."
        },
        "5-7": {
          "level": "Growing Understanding",
          "description": "Efficiency/productivity/effectiveness."
        },
        "8-10": {
          "level": "Strong Understanding",
          "description": "All strategies available."
        }
      },
      "workforce_acumen": {
        "2-4": {
          "level": "Challenge Level",
          "description": "Avoid stretch; begin with efficiency."
        },
        "5-7": {
          "level": "Expandable Reach",
          "description": "Efficiency/productivity/effectiveness."
        },
        "8-10": {
          "level": "Full Strategy Access",
          "description": "All strategies available."
        }
      },
      "company_culture": {
        "2-4": {
          "level": "Supplementation Needed",
          "description": "Efficiency first; address burnout/buy-in."
        },
        "5-7": {
          "level": "Expanded Options",
          "description": "Efficiency/productivity/effectiveness."
        },
        "8-10": {
          "level": "All Strategies Available",
          "description": "All strategies available."
        }
      },
      "role_of_technology": {
        "2-4": {
          "level": "Light Tech Usage",
          "description": "Efficiency/productivity with piecemeal integration."
        },
        "5-7": {
          "level": "Foundation Available",
          "description": "Add effectiveness/growth."
        },
        "8-10": {
          "level": "Full Tech Integration",
          "description": "All strategies available."
        }
      },
      "data": {
        "2-4": {
          "level": "Limited Data Environment",
          "description": "Low-data efficiency/productivity."
        },
        "5-7": {
          "level": "Baseline Data Knowledge",
          "description": "Keep to efficiency/productivity."
        },
        "8-10": {
          "level": "Strong Data Practices",
          "description": "All strategies available."
        }
      }
    },
    "ai_strategies": {
      "efficiency": {
        "name": "Efficiency Strategy",
        "description": "Minimal waste; least complex. SMB example: automate invoicing with free tools.",
        "requirements": {
          "data": "minimal",
          "processes": "minimal",
          "specialists": "minimal"
        },
        "complexity": "lowest",
        "risk": "lowest",
        "use_cases": "internal_facing"
      },
      "productivity": {
        "name": "Productivity Strategy",
        "description": "Do more with same resources. SMB example: AI email responder.",
        "requirements": {
          "data": "low_to_moderate",
          "processes": "some_definition_needed",
          "specialists": "some_expertise_helpful"
        },
        "complexity": "low_to_moderate",
        "risk": "low_to_moderate"
      },
      "effectiveness": {
        "name": "Effectiveness Strategy",
        "description": "Better outcomes. SMB example: affordable personalized marketing.",
        "requirements": {
          "data": "moderate",
          "processes": "well_defined",
          "specialists": "domain_expertise_needed"
        },
        "complexity": "moderate",
        "risk": "moderate"
      },
      "growth": {
        "name": "Growth Strategy",
        "description": "Expand/scale. SMB example: no-code AI e-commerce scale-up.",
        "requirements": {
          "data": "high",
          "processes": "mature_and_optimized",
          "specialists": "high_expertise_required"
        },
        "complexity": "high",
        "risk": "high"
      },
      "expert": {
        "name": "Expert Strategy",
        "description": "Augment specialized knowledge. SMB example: niche consulting with AI.",
        "requirements": {
          "data": "very_high",
          "processes": "highly_sophisticated",
          "specialists": "domain_experts_required"
        },
        "complexity": "highest",
        "risk": "highest"
      }
    },
    "client_concerns": {
      "description": "Specific SMB fears (cost, burnout, mental load, etc.)",
      "concerns": [],
      "concern_categories": {
        "brand_voice": "Fears about losing voice/identity",
        "workload_sustainability": "Worried AI adds work or maintenance",
        "quality_accuracy": "Inaccurate outputs",
        "job_displacement": "Replacing team members",
        "cost_complexity": "Cost or technical complexity",
        "client_trust": "Client acceptance",
        "data_security": "Privacy/security",
        "vendor_dependence": "Vendor lock-in",
        "learning_curve": "Ability to learn/adapt",
        "competitive_pressure": "Falling behind",
        "owner_burnout": "Overburdening the owner",
        "lack_of_kpis": "Unclear goals/KPIs"
      }
    },
    "assessment_result": {
      "scores": {
        "market_strategy": {
          "1a": null,
          "1b": null,
          "total": null
        },
        "business_understanding": {
          "2a": null,
          "2b": null,
          "total": null
        },
        "workforce_acumen": {
          "3a": null,
          "3b": null,
          "total": null
        },
        "company_culture": {
          "4a": null,
          "4b": null,
          "total": null
        },
        "role_of_technology": {
          "5a": null,
          "5b": null,
          "total": null
        },
        "data": {
          "6a": null,
          "6b": null,
          "total": null
        }
      },
      "overall_score": null,
      "readiness_level": null,
      "recommended_strategies": [],
      "client_concerns_addressed": {},
      "strategy_rationale": null,
      "roadmap": {
        "phase_1_quick_wins": [],
        "phase_2_3_6_months": [],
        "phase_3_long_term": []
      },
      "assessment_date": null,
      "assessor": "AnalysisAgent",
      "dynamic_weights_applied": {
        "readiness_avg_adjustment": null,
        "readiness_band_before_uplift": null,
        "readiness_band_after_uplift": null,
        "max_strategy_stage_baseline": null,
        "max_strategy_stage_uplifted": null,
        "max_strategy_stage_caps": [],
        "max_strategy_stage_final": null,
        "solopreneur_relaxation": true,
        "small_team_relaxation": false,
        "budget_modifier": true,
        "rural_focus_weighting": false,
        "notes": null
      }
    }
  }
}