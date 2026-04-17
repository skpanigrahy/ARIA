import { Bot, Shield, AlertTriangle, CheckCircle, TrendingDown, Clock } from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import { DecisionBadge } from '../components/ui/Badge';
import { MiniTrustBar } from '../components/ui/TrustRing';
import { AGENTS } from '../data/agentData';
import { HISTORICAL_DECISIONS } from '../data/decisionData';

function TrustDistributionChart() {
  const high = AGENTS.filter(a => a.trustLevel === 'HIGH').length;
  const med = AGENTS.filter(a => a.trustLevel === 'MEDIUM').length;
  const low = AGENTS.filter(a => a.trustLevel === 'LOW').length;
  const total = AGENTS.length;

  const highPct = (high / total) * 100;
  const medPct = (med / total) * 100;
  const lowPct = (low / total) * 100;

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
      <h3 className="text-[#E6EDF3] font-semibold text-sm mb-4">Agent Trust Distribution</h3>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-3 rounded-full overflow-hidden flex">
          <div className="h-full bg-[#3FB950] transition-all duration-700" style={{ width: `${highPct}%` }} />
          <div className="h-full bg-[#E3B341]" style={{ width: `${medPct}%` }} />
          <div className="h-full bg-[#F85149]" style={{ width: `${lowPct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'High Trust', count: high, color: '#3FB950', bg: '#2EA043' },
          { label: 'Medium Trust', count: med, color: '#E3B341', bg: '#D29922' },
          { label: 'Low Trust', count: low, color: '#F85149', bg: '#DA3633' },
        ].map(item => (
          <div key={item.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: `${item.bg}12` }}>
            <p className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>{item.count}</p>
            <p className="text-[10px] text-[#8B949E] mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentDecisionRow({ result }: { result: typeof HISTORICAL_DECISIONS[0] }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#21262D] last:border-0 group hover:bg-[#161B22]/40 px-2 -mx-2 rounded-lg transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
          style={{ backgroundColor: result.agent.avatarColor }}
        >
          {result.agent.initials}
        </div>
        <div className="min-w-0">
          <p className="text-[#E6EDF3] text-xs font-medium truncate">{result.pr.title}</p>
          <p className="text-[#656D76] text-[10px]">{result.pr.serviceName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <span className="text-[#8B949E] text-[10px] hidden md:block">
          {new Date(result.evaluatedAt).toLocaleDateString()}
        </span>
        <DecisionBadge decision={result.decision} size="sm" />
      </div>
    </div>
  );
}

function AgentRankRow({ agent, rank }: { agent: typeof AGENTS[0]; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-[#656D76] text-xs w-4 text-center font-mono">{rank}</span>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
        style={{ backgroundColor: agent.avatarColor }}
      >
        {agent.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#E6EDF3] text-xs font-medium truncate">{agent.name}</p>
        <MiniTrustBar score={agent.trustScore} />
      </div>
      <span className="text-xs font-mono tabular-nums text-[#8B949E] flex-shrink-0">
        {agent.totalPRs} PRs
      </span>
    </div>
  );
}

function SparkLine({ data, color }: { data: number[]; color: string }) {
  const w = 80;
  const h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline
        points={`0,${h} ${points} ${w},${h}`}
        fill={`${color}18`}
        stroke="none"
      />
    </svg>
  );
}

export default function Dashboard() {
  const totalAgents = AGENTS.length;
  const highRiskAgents = AGENTS.filter(a => a.trustLevel === 'LOW').length;
  const totalDecisions = HISTORICAL_DECISIONS.length;
  const avgTrust = AGENTS.reduce((s, a) => s + a.trustScore, 0) / AGENTS.length;

  const blockedCount = HISTORICAL_DECISIONS.filter(d => d.decision === 'BLOCK').length;
  const reviewCount = HISTORICAL_DECISIONS.filter(d => d.decision === 'REVIEW').length;
  const allowCount = HISTORICAL_DECISIONS.filter(d => d.decision === 'ALLOW').length;

  const sortedAgents = [...AGENTS].sort((a, b) => b.trustScore - a.trustScore);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Registered Agents"
          value={totalAgents}
          subLabel="2 external, 2 internal, 1 MCP"
          accentColor="blue"
          icon={<Bot size={14} />}
        />
        <MetricCard
          label="Avg Trust Score"
          value={`${Math.round(avgTrust * 100)}%`}
          subLabel="Across all active agents"
          trend="up"
          trendValue="+3% this week"
          accentColor="green"
          icon={<Shield size={14} />}
        />
        <MetricCard
          label="High Risk Agents"
          value={highRiskAgents}
          subLabel="Require immediate attention"
          trend="down"
          trendValue="Same as last week"
          accentColor="red"
          icon={<AlertTriangle size={14} />}
        />
        <MetricCard
          label="Total Decisions"
          value={totalDecisions}
          subLabel={`${allowCount} allow · ${reviewCount} review · ${blockedCount} block`}
          accentColor="amber"
          icon={<CheckCircle size={14} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TrustDistributionChart />

        <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
          <h3 className="text-[#E6EDF3] font-semibold text-sm mb-4">Decision Breakdown</h3>
          {[
            { label: 'Approved', count: allowCount, color: '#3FB950', pct: (allowCount / totalDecisions) * 100 },
            { label: 'Review Required', count: reviewCount, color: '#E3B341', pct: (reviewCount / totalDecisions) * 100 },
            { label: 'Blocked', count: blockedCount, color: '#F85149', pct: (blockedCount / totalDecisions) * 100 },
          ].map(item => (
            <div key={item.label} className="mb-3 last:mb-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[#8B949E] text-xs">{item.label}</span>
                <span className="text-[#E6EDF3] text-xs font-mono font-semibold">{item.count}</span>
              </div>
              <div className="w-full h-2 bg-[#21262D] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}

          <div className="mt-5 pt-4 border-t border-[#21262D]">
            <p className="text-[#8B949E] text-[10px] font-medium uppercase tracking-wide mb-3">Trend (7 days)</p>
            <div className="flex items-center gap-2">
              <SparkLine data={[2, 3, 1, 4, 2, 3, allowCount]} color="#3FB950" />
              <SparkLine data={[1, 2, 2, 1, 2, 2, reviewCount]} color="#E3B341" />
              <SparkLine data={[0, 1, 1, 0, 1, 0, blockedCount]} color="#F85149" />
            </div>
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#E6EDF3] font-semibold text-sm">Agent Leaderboard</h3>
            <span className="text-[#656D76] text-[10px]">By Trust Score</span>
          </div>
          <div className="divide-y divide-[#21262D]">
            {sortedAgents.map((agent, i) => (
              <AgentRankRow key={agent.id} agent={agent} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#E6EDF3] font-semibold text-sm">Recent Evaluations</h3>
          <div className="flex items-center gap-1.5 text-[#656D76] text-xs">
            <Clock size={12} />
            <span>Last 48 hours</span>
          </div>
        </div>
        <div>
          {HISTORICAL_DECISIONS.map(decision => (
            <RecentDecisionRow key={decision.id} result={decision} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Production Incidents Linked', value: '6', color: '#F85149', icon: <TrendingDown size={14} />, sub: 'Last 90 days' },
          { label: 'Avg Trust Score Growth', value: '+12%', color: '#3FB950', icon: <CheckCircle size={14} />, sub: 'vs last quarter' },
          { label: 'Override Rate', value: '2.1%', color: '#E3B341', icon: <AlertTriangle size={14} />, sub: 'Human overrides on ARIA decisions' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#161B22] border border-[#21262D] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${stat.color}18` }}>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[#8B949E] text-xs">{stat.label}</p>
              <p className="text-[#656D76] text-[10px]">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
