export type TrustLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type DecisionType = 'ALLOW' | 'BLOCK' | 'REVIEW';
export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FeedbackEventType = 'INCIDENT' | 'ROLLBACK' | 'CLEAN_DEPLOY' | 'HOTFIX' | 'SECURITY_BREACH';
export type AgentType = 'external' | 'internal' | 'mcp';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  provider: string;
  ownerTeam: string;
  trustScore: number;
  trustLevel: TrustLevel;
  totalPRs: number;
  totalIncidents: number;
  totalCleanDeploys: number;
  lastActiveDate: string;
  registeredDate: string;
  avatarColor: string;
  initials: string;
  tags: string[];
  recentTrend: 'up' | 'down' | 'stable';
}

export interface TrustHistoryEntry {
  id: string;
  agentId: string;
  date: string;
  trustScore: number;
  eventType: FeedbackEventType | 'REGISTRATION' | 'MANUAL_REVIEW';
  reason: string;
  trustDelta: number;
}

export interface ToolSignals {
  snyk: {
    status: 'CLEAN' | 'WARNING' | 'CRITICAL';
    highVulns: number;
    medVulns: number;
    lowVulns: number;
    riskScore: number;
    finding?: string;
  };
  sonar: {
    status: 'CLEAN' | 'WARNING' | 'CRITICAL';
    bugs: number;
    codeSmells: number;
    riskScore: number;
    finding?: string;
  };
  raven: {
    status: 'OK' | 'WARNING' | 'VIOLATION';
    policies: string[];
    riskScore: number;
    finding?: string;
  };
}

export interface PRData {
  title: string;
  agentId: string;
  serviceName: string;
  repoName: string;
  criticality: Criticality;
  linesChanged: number;
  filesChanged: number;
  description: string;
}

export interface EvaluationResult {
  id: string;
  pr: PRData;
  agent: Agent;
  decision: DecisionType;
  riskScore: number;
  confidence: number;
  trustScoreAtTime: number;
  toolSignals: ToolSignals;
  riskBreakdown: {
    agentRisk: number;
    toolRisk: number;
    criticalityRisk: number;
  };
  reasoning: string;
  recommendation: string;
  evaluatedAt: string;
}

export interface ProductionFeedback {
  id: string;
  evaluationId?: string;
  agentId: string;
  agentName: string;
  eventType: FeedbackEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  serviceName: string;
  description: string;
  trustDelta: number;
  previousTrust: number;
  newTrust: number;
  occurredAt: string;
  resolvedAt?: string;
  linkedPR?: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  pr: PRData;
  toolSignals: ToolSignals;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedDecision: DecisionType;
  demoNarrative: string;
}

export type NavigationPage =
  | 'dashboard'
  | 'agents'
  | 'decision-engine'
  | 'decision-intelligence'
  | 'production-feedback'
  | 'architecture';
