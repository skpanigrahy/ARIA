import type { DemoScenario, EvaluationResult, DecisionType, ToolSignals } from '../types';
import { getAgentById } from '../data/agentData';

const CRITICALITY_WEIGHTS: Record<string, number> = {
  LOW: 0.20,
  MEDIUM: 0.45,
  HIGH: 0.72,
  CRITICAL: 1.00,
};

function computeToolRisk(signals: ToolSignals): number {
  const snykRisk = signals.snyk.riskScore;
  const sonarRisk = signals.sonar.riskScore;
  const ravenRisk = signals.raven.riskScore;
  return snykRisk * 0.45 + sonarRisk * 0.25 + ravenRisk * 0.30;
}

function computeDecision(riskScore: number): DecisionType {
  if (riskScore > 0.68) return 'BLOCK';
  if (riskScore > 0.38) return 'REVIEW';
  return 'ALLOW';
}

function generateReasoning(
  scenario: DemoScenario,
  decision: DecisionType,
  riskScore: number,
  agentTrust: number
): string {
  const agent = getAgentById(scenario.pr.agentId);
  if (!agent) return '';

  const agentTrustLevel = agent.trustLevel;
  const criticality = scenario.pr.criticality;
  const service = scenario.pr.serviceName;

  const snyk = scenario.toolSignals.snyk;
  const sonar = scenario.toolSignals.sonar;
  const raven = scenario.toolSignals.raven;

  const findings: string[] = [];
  if (snyk.status === 'CRITICAL' || snyk.status === 'WARNING') {
    findings.push(`Snyk detected ${snyk.highVulns > 0 ? `${snyk.highVulns} HIGH severity vulnerability` : `${snyk.medVulns} MEDIUM severity findings`}`);
  }
  if (sonar.status === 'WARNING' || sonar.status === 'CRITICAL') {
    const issues = [];
    if (sonar.bugs > 0) issues.push(`${sonar.bugs} bug${sonar.bugs > 1 ? 's' : ''}`);
    if (sonar.codeSmells > 0) issues.push(`${sonar.codeSmells} code smell${sonar.codeSmells > 1 ? 's' : ''}`);
    if (issues.length > 0) findings.push(`Sonar reported ${issues.join(' and ')}`);
  }
  if (raven.status === 'VIOLATION') {
    findings.push(`Raven flagged policy violations: ${raven.policies.join(', ')}`);
  }

  const decisionLabel = decision === 'BLOCK' ? 'BLOCKED' : decision === 'REVIEW' ? 'REVIEW REQUIRED' : 'APPROVED';
  const riskPercent = Math.round(riskScore * 100);

  if (decision === 'BLOCK') {
    return `${decisionLabel} (Risk Score: ${riskPercent}/100): ${agent.name} has a critically ${agentTrustLevel} trust score (${(agentTrust * 100).toFixed(0)}%) with ${agent.totalIncidents} recorded production incidents. The target service, ${service}, is ${criticality} infrastructure. ${findings.length > 0 ? findings.join('. ') + '.' : ''} Given the convergence of a ${agentTrustLevel.toLowerCase()}-trust agent, ${criticality.toLowerCase()} criticality service, and active security findings, this change poses unacceptable risk. Immediate human security review is required before any changes to this service are permitted.`;
  }

  if (decision === 'REVIEW') {
    return `${decisionLabel} (Risk Score: ${riskPercent}/100): ${agent.name} has a ${agentTrustLevel} trust score (${(agentTrust * 100).toFixed(0)}%), indicating generally reliable behavior. ${findings.length > 0 ? findings.join('. ') + '. ' : ''}However, the target service ${service} carries ${criticality} criticality${criticality === 'HIGH' ? ' with direct business impact' : ''}. ARIA recommends human engineer review before merging, particularly focused on ${snyk.highVulns > 0 || snyk.medVulns > 0 ? 'the security findings and ' : ''}the service-level risk. The agent\'s track record suggests capability, but the operational context warrants additional oversight.`;
  }

  return `${decisionLabel} (Risk Score: ${riskPercent}/100): ${agent.name} has a HIGH trust score (${(agentTrust * 100).toFixed(0)}%) with a ${((agent.totalCleanDeploys / agent.totalPRs) * 100).toFixed(1)}% clean deployment rate across ${agent.totalPRs} total PRs. The target service, ${service}, carries ${criticality} criticality. All tool signals are clean with no security vulnerabilities, code quality issues, or policy violations detected. ARIA has high confidence (${Math.round((1 - riskScore) * 100 + 50)}%) that this change poses minimal risk and approves automated deployment.`;
}

function generateRecommendation(decision: DecisionType, scenario: DemoScenario): string {
  if (decision === 'BLOCK') {
    const hasSecurityFindings = scenario.toolSignals.snyk.status === 'CRITICAL' || scenario.toolSignals.raven.status === 'VIOLATION';
    if (hasSecurityFindings) {
      return 'Escalate to Security Engineering for mandatory code review. Resolve all Snyk vulnerabilities and Raven policy violations before resubmission.';
    }
    return 'Require senior engineer review and agent trust remediation before resubmission. Consider using a higher-trust agent for this service.';
  }
  if (decision === 'REVIEW') {
    return `Assign to a senior engineer for review of ${scenario.pr.serviceName} changes. Focus on ${scenario.toolSignals.sonar.codeSmells > 0 ? 'code quality findings and ' : ''}business-logic correctness. Approve within 24 hours if review passes.`;
  }
  return 'Proceed with automated merge pipeline. Trigger regression tests post-deployment and monitor production metrics for 30 minutes.';
}

export interface AnalysisStep {
  id: string;
  label: string;
  detail: string;
  duration: number;
}

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: 'step-1', label: 'Loading agent trust profile', detail: 'Fetching historical behavior and trust score...', duration: 600 },
  { id: 'step-2', label: 'Collecting tool signals', detail: 'Aggregating Snyk, SonarQube, and Raven results...', duration: 900 },
  { id: 'step-3', label: 'Computing risk matrix', detail: 'Evaluating agent trust × tool risk × service criticality...', duration: 1100 },
  { id: 'step-4', label: 'Generating decision', detail: 'Applying ARIA policy engine and generating explanation...', duration: 700 },
];

export function evaluateScenario(scenario: DemoScenario): EvaluationResult {
  const agent = getAgentById(scenario.pr.agentId);
  if (!agent) throw new Error('Agent not found');

  const agentRisk = 1 - agent.trustScore;
  const toolRisk = computeToolRisk(scenario.toolSignals);
  const criticalityRisk = CRITICALITY_WEIGHTS[scenario.pr.criticality] || 0.5;

  const riskScore = Math.min(
    agentRisk * 0.38 + toolRisk * 0.42 + criticalityRisk * 0.20,
    0.99
  );

  const decision = computeDecision(riskScore);
  const confidence = 0.70 + Math.abs(riskScore - 0.5) * 0.5;

  const reasoning = generateReasoning(scenario, decision, riskScore, agent.trustScore);
  const recommendation = generateRecommendation(decision, scenario);

  return {
    id: `eval-${Date.now()}`,
    pr: scenario.pr,
    agent,
    decision,
    riskScore,
    confidence: Math.min(confidence, 0.98),
    trustScoreAtTime: agent.trustScore,
    toolSignals: scenario.toolSignals,
    riskBreakdown: {
      agentRisk,
      toolRisk,
      criticalityRisk,
    },
    reasoning,
    recommendation,
    evaluatedAt: new Date().toISOString(),
  };
}
