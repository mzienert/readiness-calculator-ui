'use client';

import { useAppSelector } from '@/lib/store/hooks';
import { 
  selectCurrentAgent, 
  selectCurrentPhase, 
  selectProgress,
  selectQualifierData,
  selectResponses,
  selectAssessmentScore,
  selectStrategyRecommendation
} from '@/lib/store/selectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Users, 
  FileText, 
  BarChart3, 
  FileBarChart 
} from 'lucide-react';

const AGENTS = [
  {
    id: 'qualifier',
    name: 'Business Context',
    icon: Users,
    description: 'Understanding your business',
    phase: 'qualifying'
  },
  {
    id: 'assessor',
    name: 'Assessment',
    icon: FileText,
    description: '6-category evaluation',
    phase: 'assessing'
  },
  {
    id: 'analyzer',
    name: 'Analysis',
    icon: BarChart3,
    description: 'Scoring & insights',
    phase: 'analyzing'
  },
  {
    id: 'reporter',
    name: 'Report',
    icon: FileBarChart,
    description: 'Final recommendations',
    phase: 'reporting'
  }
] as const;

interface AgentSectionProps {
  agent: typeof AGENTS[number];
  isActive: boolean;
  isComplete: boolean;
  progress: number;
  content: React.ReactNode;
}

function AgentSection({ agent, isActive, isComplete, progress, content }: AgentSectionProps) {
  const Icon = agent.icon;
  
  return (
    <div className="flex items-start gap-4">
      {/* Progress indicator */}
      <div className="flex flex-col items-center">
        <div 
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
            isComplete 
              ? "bg-green-500 border-green-500 text-white" 
              : isActive 
                ? "bg-blue-500 border-blue-500 text-white animate-pulse" 
                : "bg-background border-muted-foreground/30 text-muted-foreground"
          )}
        >
          <Icon className="size-5" />
        </div>
        
        {/* Connecting line */}
        <div 
          className={cn(
            "w-0.5 h-16 transition-all duration-500",
            isComplete ? "bg-green-500" : "bg-muted-foreground/20"
          )}
        />
      </div>
      
      {/* Content area */}
      <div className="flex-1 pb-8">
        <div className="mb-2">
          <h3 className="font-semibold text-sm">{agent.name}</h3>
          <p className="text-xs text-muted-foreground">{agent.description}</p>
        </div>
        
        {/* Progress bar for current step */}
        {isActive && (
          <div className="w-full bg-muted rounded-full h-2 mb-3">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        {/* Content box */}
        {content && (
          <Card className={cn(
            "transition-all duration-300",
            isActive ? "border-blue-500/50 bg-blue-50/50" : "border-muted"
          )}>
            <CardContent className="p-3">
              {content}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function QualifierContent() {
  const qualifier = useAppSelector(selectQualifierData);
  
  if (!qualifier) return <p className="text-xs text-muted-foreground">Gathering business information...</p>;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {qualifier.employeeCount} employees
        </Badge>
        {qualifier.revenueBand && (
          <Badge variant="secondary" className="text-xs">
            {qualifier.revenueBand}
          </Badge>
        )}
      </div>
      {qualifier.businessType && (
        <p className="text-xs">{qualifier.businessType}</p>
      )}
      {qualifier.industry && (
        <p className="text-xs text-muted-foreground">{qualifier.industry}</p>
      )}
    </div>
  );
}

function AssessorContent() {
  const responses = useAppSelector(selectResponses);
  
  if (responses.length === 0) return <p className="text-xs text-muted-foreground">Starting assessment questions...</p>;
  
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{responses.length} responses collected</p>
      {responses.slice(-2).map((response, idx) => (
        <div key={idx} className="text-xs">
          <p className="font-medium text-muted-foreground">{response.category}</p>
          <p className="truncate">{response.questionId}</p>
        </div>
      ))}
    </div>
  );
}

function AnalyzerContent() {
  const assessmentScore = useAppSelector(selectAssessmentScore);
  
  if (!assessmentScore) return <p className="text-xs text-muted-foreground">Analyzing responses...</p>;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Overall Score</p>
        <Badge variant="default" className="text-xs">
          {assessmentScore.overallScore}/100
        </Badge>
      </div>
      {Object.entries(assessmentScore.categoryScores).slice(0, 3).map(([category, score]) => (
        <div key={category} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{category}</span>
          <span>{score}/10</span>
        </div>
      ))}
    </div>
  );
}

function ReporterContent() {
  const strategy = useAppSelector(selectStrategyRecommendation);
  
  if (!strategy) return <p className="text-xs text-muted-foreground">Generating report...</p>;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="text-xs">
          {strategy.tier} Tier
        </Badge>
      </div>
      <p className="text-xs">{strategy.primaryFocus}</p>
      <p className="text-xs text-muted-foreground">
        {strategy.nextSteps?.slice(0, 1)[0]}
      </p>
    </div>
  );
}

export function AssessmentProgress() {
  const currentAgent = useAppSelector(selectCurrentAgent);
  const currentPhase = useAppSelector(selectCurrentPhase);
  const progressData = useAppSelector(selectProgress);
  
  const getAgentContent = (agentId: string) => {
    switch (agentId) {
      case 'qualifier': return <QualifierContent />;
      case 'assessor': return <AssessorContent />;
      case 'analyzer': return <AnalyzerContent />;
      case 'reporter': return <ReporterContent />;
      default: return null;
    }
  };
  
  const responses = useAppSelector(selectResponses);
  
  const getAgentProgress = (agentId: string) => {
    if (!currentAgent) return 0;
    if (agentId !== currentAgent) return 0;
    
    // Simple progress calculation - could be enhanced with more specific logic
    switch (agentId) {
      case 'qualifier':
        return progressData ? 75 : 25; // Progress based on collected data
      case 'assessor':
        return Math.min((responses.length / 18) * 100, 100); // Assuming ~18 questions
      case 'analyzer':
        return 50; // Could track analysis steps
      case 'reporter':
        return 80; // Could track report generation steps
      default:
        return 0;
    }
  };
  
  return (
    <div className="w-80 bg-background border-l p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">AI Readiness Assessment</h2>
        <p className="text-sm text-muted-foreground">Track your progress</p>
        
        {progressData && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span>{progressData.progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressData.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-0">
        {AGENTS.map((agent, index) => {
          const isActive = currentAgent === agent.id;
          const isComplete = currentPhase === 'complete' || (
            AGENTS.findIndex(a => a.id === currentAgent) > index
          );
          const progress = getAgentProgress(agent.id);
          const content = getAgentContent(agent.id);
          
          return (
            <AgentSection
              key={agent.id}
              agent={agent}
              isActive={isActive}
              isComplete={isComplete}
              progress={progress}
              content={content}
            />
          );
        })}
      </div>
    </div>
  );
}