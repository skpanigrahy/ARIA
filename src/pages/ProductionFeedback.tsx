import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, Zap, TrendingDown, TrendingUp, Play } from 'lucide-react';
import { SeverityBadge } from '../components/ui/Badge';
import { MiniTrustBar } from '../components/ui/TrustRing';
import { fetchProductionFeedback, fetchAgents } from '../lib/database';
import type { ProductionFeedback, Agent } from '../types';

const EVENT_CONFIG = {
  INCIDENT: { icon: AlertTriangle, color: '#E3B341', label: 'Incident' },
  ROLLBACK: { icon: RotateCcw, color: '#F85149', label: 'Rollback' },
  CLEAN_DEPLOY: { icon: CheckCircle, color: '#3FB950', label: 'Clean Deploy' },
  HOTFIX: { icon: Zap, color: '#E3B341', label: 'Hotfix' },
  SECURITY_BREACH: { icon: AlertTriangle, color: '#F85149', label: 'Security Breach' },
};

function FeedbackCard({ feedback }: { feedback: ProductionFeedback }) {
  const config = EVENT_CONFIG[feedback.eventType];
  const Icon = config.icon;
  const isPositive = feedback.trustDelta >= 0;

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4 hover:border-[#30363D] transition-colors">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${config.color}18` }}
        >
          <Icon size={16} style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: config.color, backgroundColor: `${config.color}15` }}>
                {config.label}
              </span>
              <SeverityBadge severity={feedback.severity} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold flex-shrink-0 ${isPositive ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? '+' : ''}{(feedback.trustDelta * 100).toFixed(0)}%
            </div>
          </div>
          <p className="text-[#E6EDF3] text-xs font-medium mb-1">{feedback.agentName}</p>
          <p className="text-[#8B949E] text-xs leading-relaxed mb-2">{feedback.description}</p>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] text-[#8B949E]">
              {feedback.serviceName}
              {feedback.linkedPR && (
                <span className="text-[#58A6FF] ml-2">#{feedback.linkedPR}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#656D76]">
              <span className="text-[#8B949E]">{(feedback.previousTrust * 100).toFixed(0)}%</span>
              <span>→</span>
              <span style={{ color: isPositive ? '#3FB950' : '#F85149' }}>{(feedback.newTrust * 100).toFixed(0)}%</span>
            </div>
          </div>
          <p className="text-[#656D76] text-[10px] mt-1">
            {new Date(feedback.occurredAt).toLocaleString()}
            {feedback.resolvedAt && ` · Resolved ${new Date(feedback.resolvedAt).toLocaleString()}`}
          </p>
        </div>
      </div>
    </div>
  );
}

function AgentTrustImpactRow({ agentId, agents, feedbacks: allFeedbacks }: { agentId: string; agents: Agent[]; feedbacks: ProductionFeedback[] }) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return null;

  const feedbacks = allFeedbacks.filter(f => f.agentId === agentId);
  const totalIncidents = feedbacks.filter(f => f.eventType === 'INCIDENT' || f.eventType === 'ROLLBACK' || f.eventType === 'SECURITY_BREACH').length;
  const totalClean = feedbacks.filter(f => f.eventType === 'CLEAN_DEPLOY').length;
  const totalDelta = feedbacks.reduce((s, f) => s + f.trustDelta, 0);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#21262D] last:border-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: agent.avatarColor }}>
        {agent.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#E6EDF3] text-xs font-medium">{agent.name}</p>
        <MiniTrustBar score={agent.trustScore} />
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-bold tabular-nums ${totalDelta >= 0 ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
          {totalDelta >= 0 ? '+' : ''}{(totalDelta * 100).toFixed(0)}%
        </p>
        <p className="text-[#656D76] text-[10px]">{totalIncidents} incidents · {totalClean} clean</p>
      </div>
    </div>
  );
}

function SimulatePanel() {
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  const simulate = () => {
    setSimulating(true);
    setSimResult(null);
    setTimeout(() => {
      setSimulating(false);
      setSimResult('Incident recorded for Internal MCP Agent v1. Trust score updated: 0.34 → 0.28. Agent is now at CRITICAL LOW trust threshold. Auto-restriction applied: agent blocked from HIGH and CRITICAL services until manual review.');
    }, 2000);
  };

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Play size={14} className="text-[#E3B341]" />
        <h3 className="text-[#E6EDF3] font-semibold text-sm">Simulate Production Feedback</h3>
      </div>
      <p className="text-[#8B949E] text-xs leading-relaxed mb-4">
        Simulate a production incident being fed back into ARIA's trust engine. Watch how it impacts the agent's trust score and triggers automatic restrictions.
      </p>

      <div className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3 mb-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[#656D76]">Agent</span>
          <span className="text-[#E6EDF3]">Internal MCP Agent v1</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#656D76]">Event</span>
          <span className="text-[#F85149]">INCIDENT — HIGH severity</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#656D76]">Service</span>
          <span className="text-[#E6EDF3]">Config Service (PROD)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#656D76]">Expected Trust Delta</span>
          <span className="text-[#F85149]">-6% (0.34 → 0.28)</span>
        </div>
      </div>

      <button
        onClick={simulate}
        disabled={simulating}
        className="w-full bg-[#DA3633]/20 hover:bg-[#DA3633]/30 border border-[#DA3633]/40 text-[#F85149] font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        {simulating ? (
          <>
            <div className="w-3 h-3 border-2 border-[#F85149] border-t-transparent rounded-full animate-spin" />
            Processing feedback...
          </>
        ) : (
          <>
            <Play size={14} />
            Trigger Incident Feedback
          </>
        )}
      </button>

      {simResult && (
        <div className="mt-4 bg-[#DA3633]/10 border border-[#DA3633]/30 rounded-lg p-3">
          <p className="text-[#FF7B72] text-xs leading-relaxed">{simResult}</p>
        </div>
      )}
    </div>
  );
}

export default function ProductionFeedback() {
  const [feedbackList, setFeedbackList] = useState<ProductionFeedback[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetchProductionFeedback().then(setFeedbackList);
    fetchAgents().then(setAgents);
  }, []);

  const uniqueAgentIds = [...new Set(feedbackList.map(f => f.agentId))];
  const incidentCount = feedbackList.filter(f => ['INCIDENT', 'ROLLBACK', 'SECURITY_BREACH'].includes(f.eventType)).length;
  const cleanCount = feedbackList.filter(f => f.eventType === 'CLEAN_DEPLOY').length;

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-[#DA3633]/10 to-transparent border border-[#DA3633]/20 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#DA3633]/20 flex items-center justify-center flex-shrink-0">
            <TrendingDown size={18} className="text-[#F85149]" />
          </div>
          <div>
            <h2 className="text-[#E6EDF3] font-semibold text-base mb-1">Production Feedback Loop</h2>
            <p className="text-[#8B949E] text-sm leading-relaxed">
              ARIA continuously ingests production outcomes — incidents, rollbacks, clean deploys — and feeds them back into each agent's trust profile. This creates a self-improving risk model that adapts to real-world behavior.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Production Events', value: feedbackList.length, color: '#58A6FF' },
          { label: 'Incidents & Rollbacks', value: incidentCount, color: '#F85149' },
          { label: 'Clean Deploys', value: cleanCount, color: '#3FB950' },
        ].map(s => (
          <div key={s.label} className="bg-[#161B22] border border-[#21262D] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[#8B949E] text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-3">
          <h3 className="text-[#E6EDF3] font-semibold text-sm">Event Timeline</h3>
          {[...feedbackList].sort((a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
          ).map(fb => (
            <FeedbackCard key={fb.id} feedback={fb} />
          ))}
        </div>

        <div className="space-y-5">
          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
            <h3 className="text-[#E6EDF3] font-semibold text-sm mb-4">Trust Impact by Agent</h3>
            <div>
              {uniqueAgentIds.map(id => (
                <AgentTrustImpactRow key={id} agentId={id} agents={agents} feedbacks={feedbackList} />
              ))}
            </div>
          </div>

          <SimulatePanel />

          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
            <h3 className="text-[#E6EDF3] font-semibold text-sm mb-3">Trust Score Weights</h3>
            <div className="space-y-3">
              {[
                { event: 'Clean Deploy (batch)', delta: '+2–6%', color: '#3FB950' },
                { event: 'Minor Incident', delta: '-2–3%', color: '#E3B341' },
                { event: 'Major Incident', delta: '-5–6%', color: '#F85149' },
                { event: 'Rollback', delta: '-5–7%', color: '#F85149' },
                { event: 'Security Breach', delta: '-8–12%', color: '#FF7B72' },
              ].map(item => (
                <div key={item.event} className="flex justify-between items-center text-xs py-1.5 border-b border-[#21262D] last:border-0">
                  <span className="text-[#8B949E]">{item.event}</span>
                  <span className="font-mono font-semibold" style={{ color: item.color }}>{item.delta}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
