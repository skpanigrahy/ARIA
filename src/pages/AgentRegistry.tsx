import { useState, useEffect } from "react";
import {
  ChevronRight,
  GitPullRequest,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Clock,
} from "lucide-react";
import TrustRing from "../components/ui/TrustRing";
import { TrustBadge, AgentTypeBadge } from "../components/ui/Badge";
import { fetchAgents, fetchTrustHistory } from "../lib/database";
import { AGENTS } from "../data/agentData";
import type { Agent, TrustHistoryEntry } from "../types";

function TrustTrendIcon({ trend }: { trend: Agent["recentTrend"] }) {
  if (trend === "up")
    return <TrendingUp size={12} className="text-[#3FB950]" />;
  if (trend === "down")
    return <TrendingDown size={12} className="text-[#F85149]" />;
  return <Minus size={12} className="text-[#8B949E]" />;
}

function TrustTimeline({ agentId }: { agentId: string }) {
  const [history, setHistory] = useState<TrustHistoryEntry[]>([]);
  useEffect(() => {
    fetchTrustHistory(agentId).then(setHistory);
  }, [agentId]);

  const EVENT_ICONS: Record<
    string,
    { icon: typeof CheckCircle; color: string }
  > = {
    REGISTRATION: { icon: CheckCircle, color: "#58A6FF" },
    CLEAN_DEPLOY: { icon: CheckCircle, color: "#3FB950" },
    INCIDENT: { icon: AlertCircle, color: "#E3B341" },
    ROLLBACK: { icon: AlertCircle, color: "#F85149" },
    SECURITY_BREACH: { icon: AlertCircle, color: "#F85149" },
    MANUAL_REVIEW: { icon: CheckCircle, color: "#BC8CFF" },
  };

  return (
    <div className="space-y-3">
      {[...history].reverse().map((entry) => {
        const config =
          EVENT_ICONS[entry.eventType] || EVENT_ICONS.MANUAL_REVIEW;
        const Icon = config.icon;
        return (
          <div key={entry.id} className="flex gap-3 items-start">
            <div className="mt-0.5 flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${config.color}18` }}
              >
                <Icon size={12} style={{ color: config.color }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[#E6EDF3] text-xs font-medium truncate">
                  {entry.reason}
                </p>
                <span
                  className={`text-xs font-mono font-semibold flex-shrink-0 ${entry.trustDelta > 0 ? "text-[#3FB950]" : entry.trustDelta < 0 ? "text-[#F85149]" : "text-[#8B949E]"}`}
                >
                  {entry.trustDelta > 0 ? "+" : ""}
                  {(entry.trustDelta * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#656D76] text-[10px]">{entry.date}</span>
                <span
                  className="text-[10px] px-1 rounded"
                  style={{
                    color: config.color,
                    backgroundColor: `${config.color}18`,
                  }}
                >
                  {entry.eventType.replace("_", " ")}
                </span>
                <span className="text-[#8B949E] text-[10px]">
                  → {Math.round(entry.trustScore * 100)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentDetailDrawer({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const cleanRate = ((agent.totalCleanDeploys / agent.totalPRs) * 100).toFixed(
    1,
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#0D1117] border-l border-[#21262D] h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#0D1117] border-b border-[#21262D] px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: agent.avatarColor }}
            >
              {agent.initials}
            </div>
            <div>
              <h3 className="text-[#E6EDF3] font-semibold text-sm">
                {agent.name}
              </h3>
              <p className="text-[#8B949E] text-xs">{agent.provider}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#21262D] flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-[#8B949E]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <TrustRing score={agent.trustScore} size={90} />
            <div className="space-y-2 text-right">
              <TrustBadge level={agent.trustLevel} />
              <div className="flex items-center gap-1 justify-end">
                <TrustTrendIcon trend={agent.recentTrend} />
                <span className="text-[#8B949E] text-xs capitalize">
                  {agent.recentTrend} trend
                </span>
              </div>
              <AgentTypeBadge type={agent.type} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total PRs",
                value: agent.totalPRs,
                icon: <GitPullRequest size={14} />,
                color: "#58A6FF",
              },
              {
                label: "Incidents",
                value: agent.totalIncidents,
                icon: <AlertCircle size={14} />,
                color: "#F85149",
              },
              {
                label: "Clean Rate",
                value: `${cleanRate}%`,
                icon: <CheckCircle size={14} />,
                color: "#3FB950",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#161B22] border border-[#21262D] rounded-lg p-3 text-center"
              >
                <div
                  className="flex justify-center mb-1"
                  style={{ color: stat.color }}
                >
                  {stat.icon}
                </div>
                <p className="text-[#E6EDF3] text-base font-bold">
                  {stat.value}
                </p>
                <p className="text-[#656D76] text-[10px]">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#161B22] border border-[#21262D] rounded-lg p-4 space-y-2">
            {[
              { label: "Owner Team", value: agent.ownerTeam },
              {
                label: "Registered",
                value: new Date(agent.registeredDate).toLocaleDateString(),
              },
              {
                label: "Last Active",
                value: new Date(agent.lastActiveDate).toLocaleString(),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center py-1.5 border-b border-[#21262D] last:border-0"
              >
                <span className="text-[#8B949E] text-xs">{item.label}</span>
                <span className="text-[#E6EDF3] text-xs font-medium">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 bg-[#1F6FEB]/15 text-[#58A6FF] rounded-full border border-[#1F6FEB]/30"
              >
                {tag}
              </span>
            ))}
          </div>

          <div>
            <h4 className="text-[#E6EDF3] font-semibold text-sm mb-4 flex items-center gap-2">
              <Clock size={14} className="text-[#58A6FF]" />
              Trust History
            </h4>
            <TrustTimeline agentId={agent.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const cleanRate = ((agent.totalCleanDeploys / agent.totalPRs) * 100).toFixed(
    1,
  );

  return (
    <button
      onClick={onClick}
      className="bg-[#161B22] border border-[#21262D] rounded-xl p-5 text-left hover:border-[#30363D] hover:bg-[#161B22] transition-all duration-200 group w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: agent.avatarColor }}
          >
            {agent.initials}
          </div>
          <div>
            <p className="text-[#E6EDF3] text-sm font-semibold">{agent.name}</p>
            <p className="text-[#8B949E] text-xs">{agent.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrustBadge level={agent.trustLevel} size="sm" />
          <ChevronRight
            size={14}
            className="text-[#656D76] group-hover:text-[#8B949E] transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <TrustRing score={agent.trustScore} size={64} strokeWidth={5} />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#8B949E] text-xs">PRs Generated</span>
            <span className="text-[#E6EDF3] text-xs font-mono">
              {agent.totalPRs.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8B949E] text-xs">Incidents</span>
            <span className="text-[#F85149] text-xs font-mono">
              {agent.totalIncidents}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8B949E] text-xs">Clean Rate</span>
            <span className="text-[#3FB950] text-xs font-mono">
              {cleanRate}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#21262D]">
        <AgentTypeBadge type={agent.type} />
        <div className="flex items-center gap-1">
          <TrustTrendIcon trend={agent.recentTrend} />
          <span className="text-[#8B949E] text-[10px] capitalize">
            {agent.recentTrend}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function AgentRegistry() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);

  useEffect(() => {
    fetchAgents().then(setAgents);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#8B949E] text-sm">
            {agents.length} registered agents ·{" "}
            <span className="text-[#3FB950]">
              {agents.filter((a) => a.trustLevel === "HIGH").length} high trust
            </span>{" "}
            ·{" "}
            <span className="text-[#E3B341]">
              {agents.filter((a) => a.trustLevel === "MEDIUM").length} medium
            </span>{" "}
            ·{" "}
            <span className="text-[#F85149]">
              {agents.filter((a) => a.trustLevel === "LOW").length} low trust
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => setSelectedAgent(agent)}
          />
        ))}
      </div>

      <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
        <h3 className="text-[#E6EDF3] font-semibold text-sm mb-3">
          Trust Score Interpretation
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              range: "70–100",
              level: "HIGH",
              color: "#3FB950",
              desc: "Agent has a strong track record. Eligible for automated deployment in low to medium criticality services.",
            },
            {
              range: "45–69",
              level: "MEDIUM",
              color: "#E3B341",
              desc: "Agent shows generally reliable behavior with some incidents. Human review required for high criticality services.",
            },
            {
              range: "0–44",
              level: "LOW",
              color: "#F85149",
              desc: "Agent has a poor track record or insufficient history. Blocked from critical services. All changes require review.",
            },
          ].map((item) => (
            <div
              key={item.level}
              className="bg-[#0D1117] border border-[#21262D] rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-lg font-bold"
                  style={{ color: item.color }}
                >
                  {item.range}
                </span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                  style={{
                    color: item.color,
                    borderColor: `${item.color}50`,
                    backgroundColor: `${item.color}15`,
                  }}
                >
                  {item.level}
                </span>
              </div>
              <p className="text-[#8B949E] text-xs leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {selectedAgent && (
        <AgentDetailDrawer
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
