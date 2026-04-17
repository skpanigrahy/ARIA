import { supabase } from './supabase';
import { AGENTS, getTrustHistoryForAgent } from '../data/agentData';
import { HISTORICAL_DECISIONS, PRODUCTION_FEEDBACK } from '../data/decisionData';
import type { Agent, TrustHistoryEntry, EvaluationResult, ProductionFeedback } from '../types';

function dbAgentToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Agent['type'],
    provider: row.provider as string,
    ownerTeam: row.owner_team as string,
    trustScore: row.trust_score as number,
    trustLevel: row.trust_level as Agent['trustLevel'],
    totalPRs: row.total_prs as number,
    totalIncidents: row.total_incidents as number,
    totalCleanDeploys: row.total_clean_deploys as number,
    lastActiveDate: row.last_active_date as string,
    registeredDate: row.registered_date as string,
    avatarColor: row.avatar_color as string,
    initials: row.initials as string,
    tags: (row.tags as string[]) ?? [],
    recentTrend: row.recent_trend as Agent['recentTrend'],
  };
}

function dbDecisionToResult(row: Record<string, unknown>, agentMap: Map<string, Agent>): EvaluationResult {
  const agent = agentMap.get(row.agent_id as string) ?? AGENTS[0];
  return {
    id: row.id as string,
    pr: {
      title: row.pr_title as string,
      agentId: row.agent_id as string,
      serviceName: row.pr_service_name as string,
      repoName: row.pr_repo as string,
      criticality: row.pr_criticality as EvaluationResult['pr']['criticality'],
      linesChanged: row.pr_lines_changed as number,
      filesChanged: row.pr_files_changed as number,
      description: '',
    },
    agent,
    decision: row.decision as EvaluationResult['decision'],
    riskScore: row.overall_risk as number,
    confidence: row.confidence as number,
    trustScoreAtTime: row.trust_score_at_time as number,
    toolSignals: {
      snyk: {
        status: mapSnykStatus(row.snyk_status as string),
        highVulns: row.snyk_high_count as number ?? 0,
        medVulns: 0,
        lowVulns: 0,
        riskScore: 0,
      },
      sonar: {
        status: mapSonarStatus(row.sonar_status as string),
        bugs: row.sonar_bugs as number ?? 0,
        codeSmells: row.sonar_code_smells as number ?? 0,
        riskScore: 0,
      },
      raven: {
        status: mapRavenStatus(row.raven_status as string),
        policies: (row.raven_violations as string[]) ?? [],
        riskScore: 0,
      },
    },
    riskBreakdown: {
      agentRisk: row.agent_risk as number,
      toolRisk: row.tool_risk as number,
      criticalityRisk: row.criticality_risk as number,
    },
    reasoning: row.reasoning as string,
    recommendation: row.recommendation as string,
    evaluatedAt: row.evaluated_at as string,
  };
}

function mapSnykStatus(s: string): 'CLEAN' | 'WARNING' | 'CRITICAL' {
  if (s === 'CRITICAL' || s === 'HIGH') return 'CRITICAL';
  if (s === 'MEDIUM' || s === 'WARN') return 'WARNING';
  return 'CLEAN';
}

function mapSonarStatus(s: string): 'CLEAN' | 'WARNING' | 'CRITICAL' {
  if (s === 'FAILED' || s === 'ERROR') return 'CRITICAL';
  if (s === 'WARN') return 'WARNING';
  return 'CLEAN';
}

function mapRavenStatus(s: string): 'OK' | 'WARNING' | 'VIOLATION' {
  if (s === 'VIOLATION') return 'VIOLATION';
  if (s === 'WARN') return 'WARNING';
  return 'OK';
}

function dbFeedbackToProductionFeedback(row: Record<string, unknown>, agentMap: Map<string, Agent>): ProductionFeedback {
  const agent = agentMap.get(row.agent_id as string);
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    agentName: agent?.name ?? 'Unknown Agent',
    eventType: row.event_type as ProductionFeedback['eventType'],
    severity: (row.severity as ProductionFeedback['severity']) ?? 'MEDIUM',
    serviceName: row.service_name as string,
    description: row.description as string,
    trustDelta: row.trust_impact as number,
    previousTrust: 0,
    newTrust: 0,
    occurredAt: row.occurred_at as string,
  };
}

export async function fetchAgents(): Promise<Agent[]> {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true)
      .order('trust_score', { ascending: false });

    if (error || !data || data.length === 0) return AGENTS;
    return data.map(row => dbAgentToAgent(row as Record<string, unknown>));
  } catch {
    return AGENTS;
  }
}

export async function fetchAgentById(id: string): Promise<Agent | null> {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return AGENTS.find(a => a.id === id) ?? null;
    return dbAgentToAgent(data as Record<string, unknown>);
  } catch {
    return AGENTS.find(a => a.id === id) ?? null;
  }
}

export async function fetchTrustHistory(agentId: string): Promise<TrustHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('agent_trust_history')
      .select('*')
      .eq('agent_id', agentId)
      .order('date', { ascending: true });

    if (error || !data || data.length === 0) return getTrustHistoryForAgent(agentId);

    return data.map(row => ({
      id: row.id as string,
      agentId: row.agent_id as string,
      date: row.date as string,
      trustScore: row.trust_score as number,
      eventType: row.event_type as TrustHistoryEntry['eventType'],
      reason: row.reason as string,
      trustDelta: row.trust_delta as number,
    }));
  } catch {
    return getTrustHistoryForAgent(agentId);
  }
}

export async function fetchDecisions(): Promise<EvaluationResult[]> {
  try {
    const agents = await fetchAgents();
    const agentMap = new Map(agents.map(a => [a.id, a]));

    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .order('evaluated_at', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) return HISTORICAL_DECISIONS;
    return data.map(row => dbDecisionToResult(row as Record<string, unknown>, agentMap));
  } catch {
    return HISTORICAL_DECISIONS;
  }
}

export async function fetchProductionFeedback(): Promise<ProductionFeedback[]> {
  try {
    const agents = await fetchAgents();
    const agentMap = new Map(agents.map(a => [a.id, a]));

    const { data, error } = await supabase
      .from('production_feedback')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) return PRODUCTION_FEEDBACK;
    return data.map(row => dbFeedbackToProductionFeedback(row as Record<string, unknown>, agentMap));
  } catch {
    return PRODUCTION_FEEDBACK;
  }
}

export async function fetchIntegrationConfigs() {
  try {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .order('type', { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function fetchRecentWebhookEvents(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function updateIntegrationConfig(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('integration_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  return { data, error };
}
