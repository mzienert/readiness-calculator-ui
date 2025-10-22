'use client';

import { useAppSelector } from '@/lib/store/hooks';
import {
  selectAnalyzerData,
  selectAnalyzerScoring,
  selectAnalyzerRoadmap,
  selectAnalyzerConcerns,
  selectStrategyRecommendation,
  selectAnalysisComplete,
  selectAssessmentScore,
} from '@/lib/store/selectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, TrendingUp, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AssessmentReport() {
  const analyzerData = useAppSelector(selectAnalyzerData);
  const scoring = useAppSelector(selectAnalyzerScoring);
  const roadmap = useAppSelector(selectAnalyzerRoadmap);
  const concerns = useAppSelector(selectAnalyzerConcerns);
  const strategy = useAppSelector(selectStrategyRecommendation);
  const isComplete = useAppSelector(selectAnalysisComplete);

  // Debug: Compare with the progress component's selector
  const assessmentScore = useAppSelector(selectAssessmentScore);

  // PRODUCTION DEBUG: Compare selectors
  // console.log('🔍 [AssessmentReport] SELECTOR COMPARISON:');
  // console.log('- Raw scoring:', scoring);
  // console.log('- Transformed assessmentScore:', assessmentScore);
  // console.log('- Raw strategy:', strategy);
  // console.log('- Raw roadmap:', roadmap);
  // console.log('- Raw concerns:', concerns);

  // Only render if analysis is complete and we have data
  if (!isComplete || !analyzerData) {
    return null;
  }

  // Production debugging - log to console and show debug info
  console.log('🚀 PRODUCTION AssessmentReport - isComplete:', isComplete);
  console.log('🚀 PRODUCTION AssessmentReport - analyzerData exists:', !!analyzerData);
  console.log('🚀 PRODUCTION AssessmentReport - scoring exists:', !!scoring);
  console.log('🚀 PRODUCTION AssessmentReport - strategy exists:', !!strategy);
  console.log('🚀 PRODUCTION AssessmentReport - roadmap exists:', !!roadmap);
  console.log('🚀 PRODUCTION AssessmentReport - concerns exists:', !!concerns);

  // Show debug data in a visible way for production
  const debugInfo = {
    isComplete,
    hasAnalyzerData: !!analyzerData,
    hasScoring: !!scoring,
    hasStrategy: !!strategy,
    hasRoadmap: !!roadmap,
    hasConcerns: !!concerns,
    scoringKeys: scoring ? Object.keys(scoring) : [],
    strategyKeys: strategy ? Object.keys(strategy) : [],
  };


  // Helper function to format category names
  const formatCategoryName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to get score color
  const getScoreColor = (score: number, maxScore: number = 10) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Helper function to get strategy color
  const getStrategyColor = (strategy: string) => {
    if (!strategy) return 'bg-muted text-muted-foreground border-muted';
    switch (strategy.toLowerCase()) {
      case 'efficiency strategy':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'productivity strategy':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'effectiveness strategy':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'growth strategy':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'expert strategy':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card border shadow-sm">
      <CardHeader className="text-center pb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <CardTitle className="text-2xl font-bold text-foreground">
            AI Readiness Assessment Complete
          </CardTitle>
        </div>
        <p className="text-muted-foreground">
          Your personalized AI adoption strategy and roadmap
        </p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Temporary Debug Info for Production */}
        {/* <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-red-800 mb-2">Debug Info (Production)</h4>
            <pre className="text-xs text-red-700 whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
            {analyzerData && (
              <details className="mt-2">
                <summary className="text-sm font-medium text-red-800 cursor-pointer">Raw Analyzer Data</summary>
                <pre className="text-xs text-red-700 whitespace-pre-wrap mt-2">{JSON.stringify(analyzerData, null, 2)}</pre>
              </details>
            )}
          </CardContent>
        </Card> */}

        {/* Hero Section - Overall Score & Strategy */}
        <div className="text-center space-y-4">
          {/* Calculate overall score from available data */}
          {analyzerData && scoring && (
            <div className="inline-flex items-center gap-4 p-4 bg-card rounded-lg border shadow-sm">
              <div className="text-3xl font-bold text-foreground">
                {/* Use overall_score from the data */}
                {scoring.overall_score || 0}/60
              </div>
              <div className="text-left">
                <div className="text-sm text-muted-foreground">Overall Readiness Score</div>
                <div className="text-lg font-semibold text-foreground">
                  {Math.round(((scoring.overall_score || 0) / 60) * 100)}% Ready
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <Badge
              variant="outline"
              className={cn("text-lg px-4 py-2 font-semibold border-2", getStrategyColor(strategy?.primary_strategy || ''))}
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Recommended: {strategy?.primary_strategy || 'Strategy TBD'}
            </Badge>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              {strategy?.rationale || 'Analysis in progress...'}
            </p>
          </div>
        </div>

        <Separator />

        {/* Category Scoring Breakdown */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Category Breakdown
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {scoring && Object.entries(scoring)
              .filter(([key]) => key !== 'overall_score' && key !== 'dynamic_weighting_applied')
              .map(([category, data]: [string, any]) => (
              <Card key={category} className="bg-card border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-card-foreground">
                      {formatCategoryName(category)}
                    </h4>
                    <Badge
                      variant="outline"
                      className={cn("font-semibold border", getScoreColor(data?.total || 0))}
                    >
                      {data?.total || 0}/10
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{data?.level || 'No details available'}</div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        (data?.total || 0) >= 8 ? "bg-green-600" :
                        (data?.total || 0) >= 6 ? "bg-blue-600" :
                        (data?.total || 0) >= 4 ? "bg-yellow-600" : "bg-red-600"
                      )}
                      style={{ width: `${((data?.total || 0) / 10) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Constraining and Enabling Factors - Temporarily disabled until SDK provides this data */}
          {/* 
          <div className="grid gap-4 md:grid-cols-2 mt-6">
            {strategy?.constraining_factors?.length && (
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Areas to Address
                  </h4>
                  <ul className="space-y-1">
                    {strategy.constraining_factors.map((factor: string, index: number) => (
                      <li key={index} className="text-sm text-destructive/80">
                        • {factor}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {strategy?.enabling_factors?.length && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Your Strengths
                  </h4>
                  <ul className="space-y-1">
                    {strategy.enabling_factors.map((factor: string, index: number) => (
                      <li key={index} className="text-sm text-green-600">
                        • {factor}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
          */}
        </div>

        <Separator />

        {/* Roadmap Timeline */}
        {roadmap && (
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Implementation Roadmap
            </h3>
            <div className="space-y-4">
              {roadmap && Object.entries(roadmap).map(([phase, data]: [string, any], index) => (
                <Card key={phase} className="bg-card border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                          Phase {index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-card-foreground">{data?.focus || phase.replace('_', ' ')}</h4>
                          <span className="text-sm text-muted-foreground">({data?.timeline || 'TBD'})</span>
                        </div>
                        {data?.specific_recommendations?.length > 0 ? (
                          <ul className="space-y-1">
                            {data.specific_recommendations.map((rec: string, recIndex: number) => (
                              <li key={recIndex} className="text-sm text-muted-foreground">
                                • {rec}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">• {data?.focus || 'No specific recommendations provided'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Concerns Analysis */}
        {concerns && (concerns.identified_concerns?.length > 0 || Object.keys(concerns.mitigation_strategies || {}).length > 0) && (
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Addressing Your Concerns
            </h3>
            <div className="space-y-3">
              {concerns.identified_concerns?.map((concern: string, index: number) => {
                const mitigation = concerns.mitigation_strategies?.[concern];
                return (
                  <Card key={index} className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        {formatCategoryName(concern)}
                      </h4>
                      {mitigation && (
                        <p className="text-sm text-yellow-700">{mitigation}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}