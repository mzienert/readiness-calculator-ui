'use client';

import { useAppSelector } from '@/lib/store/hooks';
import {
  selectAnalyzerData,
  selectAnalyzerScoring,
  selectAnalyzerRoadmap,
  selectAnalyzerConcerns,
  selectStrategyRecommendation,
  selectAnalysisComplete,
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

  // Only render if analysis is complete and we have data
  if (!isComplete || !analyzerData || !scoring || !strategy) {
    return null;
  }

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
    if (!strategy) return 'bg-gray-100 text-gray-800 border-gray-300';
    switch (strategy.toLowerCase()) {
      case 'efficiency strategy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'productivity strategy':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'effectiveness strategy':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'growth strategy':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'expert strategy':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
      <CardHeader className="text-center pb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <CardTitle className="text-2xl font-bold text-gray-800">
            AI Readiness Assessment Complete
          </CardTitle>
        </div>
        <p className="text-gray-600">
          Your personalized AI adoption strategy and roadmap
        </p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Hero Section - Overall Score & Strategy */}
        <div className="text-center space-y-4">
          {scoring.overall_score && (
            <div className="inline-flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
              <div className="text-3xl font-bold text-gray-800">
                {scoring.overall_score}/60
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-600">Overall Readiness Score</div>
                <div className="text-lg font-semibold text-gray-800">
                  {Math.round((scoring.overall_score / 60) * 100)}% Ready
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
            <p className="text-gray-700 max-w-2xl leading-relaxed">
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
            {Object.entries(scoring)
              .filter(([key]) => key !== 'overall_score' && key !== 'dynamic_weighting_applied')
              .map(([category, data]: [string, any]) => (
                <Card key={category} className="bg-white border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800">
                        {formatCategoryName(category)}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn("font-semibold border", getScoreColor(data.total))}
                      >
                        {data.total}/10
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{data.level}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          data.total >= 8 ? "bg-green-500" :
                          data.total >= 6 ? "bg-blue-500" :
                          data.total >= 4 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${(data.total / 10) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Constraining and Enabling Factors */}
          <div className="grid gap-4 md:grid-cols-2 mt-6">
            {strategy?.constraining_factors && strategy.constraining_factors.length > 0 && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Areas to Address
                  </h4>
                  <ul className="space-y-1">
                    {strategy.constraining_factors.map((factor: string, index: number) => (
                      <li key={index} className="text-sm text-red-700">
                        • {factor}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {strategy?.enabling_factors && strategy.enabling_factors.length > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Your Strengths
                  </h4>
                  <ul className="space-y-1">
                    {strategy.enabling_factors.map((factor: string, index: number) => (
                      <li key={index} className="text-sm text-green-700">
                        • {factor}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
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
              {Object.entries(roadmap).map(([phase, data]: [string, any], index) => (
                <Card key={phase} className="bg-white border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                          Phase {index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-800">{data.focus}</h4>
                          <span className="text-sm text-gray-500">({data.timeline})</span>
                        </div>
                        {data.specific_recommendations && (
                          <ul className="space-y-1">
                            {data.specific_recommendations.map((rec: string, recIndex: number) => (
                              <li key={recIndex} className="text-sm text-gray-700">
                                • {rec}
                              </li>
                            ))}
                          </ul>
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
        {concerns && concerns.identified_concerns && concerns.identified_concerns.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Addressing Your Concerns
            </h3>
            <div className="space-y-3">
              {concerns.identified_concerns.map((concern: string, index: number) => {
                const mitigation = concerns.mitigation_strategies?.[concern];
                return (
                  <Card key={index} className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-amber-800 mb-2">
                        {formatCategoryName(concern)}
                      </h4>
                      {mitigation && (
                        <p className="text-sm text-amber-700">{mitigation}</p>
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