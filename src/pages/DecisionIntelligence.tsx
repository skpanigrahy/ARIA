import { useState, useEffect } from "react";
import { Search, ChevronDown, X, FileText, Shield } from "lucide-react";
import {
  DecisionBadge,
  CriticalityBadge,
  AgentTypeBadge,
} from "../components/ui/Badge";
import RiskBar from "../components/ui/RiskBar";
import TrustRing from "../components/ui/TrustRing";
import { fetchDecisions } from "../lib/database";
import { HISTORICAL_DECISIONS } from "../data/decisionData";
import type { EvaluationResult, DecisionType } from "../types";

function DecisionDetailModal({
  decision,
  onClose,
}: {
  decision: EvaluationResult;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0D1117] border border-[#30363D] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#0D1117] border-b border-[#21262D] px-6 py-4 flex items-start justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DecisionBadge decision={decision.decision} />
              <CriticalityBadge level={decision.pr.criticality} />
            </div>
            <h3 className="text-[#E6EDF3] font-semibold text-sm">
              {decision.pr.title}
            </h3>
            <p className="text-[#8B949E] text-xs mt-0.5">
              {decision.pr.serviceName} ·{" "}
              {new Date(decision.evaluatedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#21262D] flex items-center justify-center transition-colors flex-shrink-0 ml-3"
          >
            <X size={16} className="text-[#8B949E]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
              <p className="text-[#8B949E] text-xs uppercase tracking-wide mb-3">
                Agent
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: decision.agent.avatarColor }}
                >
                  {decision.agent.initials}
                </div>
                <div>
                  <p className="text-[#E6EDF3] text-xs font-medium">
                    {decision.agent.name}
                  </p>
                  <AgentTypeBadge type={decision.agent.type} />
                </div>
                <TrustRing
                  score={decision.trustScoreAtTime}
                  size={40}
                  strokeWidth={4}
                />
              </div>
            </div>
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
              <p className="text-[#8B949E] text-xs uppercase tracking-wide mb-2">
                Risk Score
              </p>
              <p
                className="text-3xl font-bold tabular-nums"
                style={{
                  color:
                    decision.riskScore >= 0.68
                      ? "#F85149"
                      : decision.riskScore >= 0.38
                        ? "#E3B341"
                        : "#3FB950",
                }}
              >
                {Math.round(decision.riskScore * 100)}
              </p>
              <p className="text-[#656D76] text-[10px]">
                Confidence: {Math.round(decision.confidence * 100)}%
              </p>
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
            <p className="text-[#8B949E] text-xs uppercase tracking-wide mb-4">
              Risk Breakdown
            </p>
            <div className="space-y-3">
              <RiskBar
                label="Agent Trust Risk"
                value={decision.riskBreakdown.agentRisk}
              />
              <RiskBar
                label="Tool Signal Risk"
                value={decision.riskBreakdown.toolRisk}
              />
              <RiskBar
                label="Service Criticality"
                value={decision.riskBreakdown.criticalityRisk}
              />
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
            <p className="text-[#8B949E] text-xs uppercase tracking-wide mb-3">
              Tool Signals
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "Snyk", s: decision.toolSignals.snyk },
                { name: "SonarQube", s: decision.toolSignals.sonar },
                { name: "Raven", s: decision.toolSignals.raven },
              ].map(({ name, s }) => {
                const isOk = s.status === "CLEAN" || s.status === "OK";
                const color = isOk
                  ? "#3FB950"
                  : s.status === "CRITICAL" || s.status === "VIOLATION"
                    ? "#F85149"
                    : "#E3B341";
                return (
                  <div
                    key={name}
                    className="text-center p-3 rounded-lg border"
                    style={{
                      borderColor: `${color}30`,
                      backgroundColor: `${color}08`,
                    }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color }}>
                      {s.status}
                    </p>
                    <p className="text-[#8B949E] text-[10px]">{name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-[#58A6FF]" />
              <p className="text-[#E6EDF3] text-xs font-semibold">
                Full Reasoning
              </p>
            </div>
            <p className="text-[#8B949E] text-sm leading-relaxed">
              {decision.reasoning}
            </p>
          </div>

          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
            <p className="text-[#8B949E] text-xs uppercase tracking-wide mb-2">
              Recommendation
            </p>
            <p className="text-[#E6EDF3] text-sm leading-relaxed">
              {decision.recommendation}
            </p>
          </div>

          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
            <p className="text-[#8B949E] text-xs uppercase tracking-wide mb-3">
              PR Metadata
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { k: "Repository", v: decision.pr.repoName },
                { k: "Files Changed", v: String(decision.pr.filesChanged) },
                {
                  k: "Lines Changed",
                  v: decision.pr.linesChanged.toLocaleString(),
                },
                {
                  k: "Evaluated At",
                  v: new Date(decision.evaluatedAt).toLocaleString(),
                },
              ].map(({ k, v }) => (
                <div
                  key={k}
                  className="flex justify-between py-1.5 border-b border-[#21262D]"
                >
                  <span className="text-[#8B949E]">{k}</span>
                  <span className="text-[#E6EDF3] font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DecisionIntelligence() {
  const [search, setSearch] = useState("");
  const [filterDecision, setFilterDecision] = useState<DecisionType | "ALL">(
    "ALL",
  );
  const [selectedDecision, setSelectedDecision] =
    useState<EvaluationResult | null>(null);
  const [allDecisions, setAllDecisions] =
    useState<EvaluationResult[]>(HISTORICAL_DECISIONS);

  useEffect(() => {
    fetchDecisions().then(setAllDecisions);
  }, []);

  const filtered = allDecisions.filter((d) => {
    const matchesSearch =
      d.pr.title.toLowerCase().includes(search.toLowerCase()) ||
      d.pr.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      d.agent.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterDecision === "ALL" || d.decision === filterDecision;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#656D76]"
          />
          <input
            type="text"
            placeholder="Search decisions, services, agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161B22] border border-[#21262D] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#E6EDF3] placeholder-[#656D76] focus:outline-none focus:border-[#1F6FEB] transition-colors"
          />
        </div>

        <div className="flex gap-2">
          {(["ALL", "ALLOW", "REVIEW", "BLOCK"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterDecision(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filterDecision === f
                  ? "bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/40"
                  : "bg-[#161B22] text-[#8B949E] border border-[#21262D] hover:border-[#30363D]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Total Decisions",
            value: allDecisions.length,
            color: "#58A6FF",
          },
          {
            label: "Approved",
            value: allDecisions.filter((d) => d.decision === "ALLOW").length,
            color: "#3FB950",
          },
          {
            label: "Review Required",
            value: allDecisions.filter((d) => d.decision === "REVIEW").length,
            color: "#E3B341",
          },
          {
            label: "Blocked",
            value: allDecisions.filter((d) => d.decision === "BLOCK").length,
            color: "#F85149",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#161B22] border border-[#21262D] rounded-xl p-4 text-center"
          >
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
            <p className="text-[#8B949E] text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#161B22] border border-[#21262D] rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#0D1117] border-b border-[#21262D] text-[10px] font-semibold text-[#656D76] uppercase tracking-widest">
          <div className="col-span-4">PR / Service</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-1">Decision</div>
          <div className="col-span-2">Risk Score</div>
          <div className="col-span-2">Evaluated</div>
          <div className="col-span-1"></div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={24} className="text-[#656D76] mx-auto mb-3" />
            <p className="text-[#8B949E] text-sm">
              No decisions match your filters
            </p>
          </div>
        ) : (
          filtered.map((decision) => {
            const riskColor =
              decision.riskScore >= 0.68
                ? "#F85149"
                : decision.riskScore >= 0.38
                  ? "#E3B341"
                  : "#3FB950";
            return (
              <div
                key={decision.id}
                className="grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-[#21262D] last:border-0 hover:bg-[#161B22]/60 transition-colors items-center"
              >
                <div className="col-span-4 min-w-0">
                  <p className="text-[#E6EDF3] text-xs font-medium truncate">
                    {decision.pr.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CriticalityBadge
                      level={decision.pr.criticality}
                      size="sm"
                    />
                    <span className="text-[#656D76] text-[10px] truncate">
                      {decision.pr.serviceName}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: decision.agent.avatarColor }}
                  >
                    {decision.agent.initials}
                  </div>
                  <span className="text-[#8B949E] text-xs truncate">
                    {decision.agent.name.split(" ")[0]}
                  </span>
                </div>
                <div className="col-span-1">
                  <DecisionBadge decision={decision.decision} size="sm" />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${decision.riskScore * 100}%`,
                          backgroundColor: riskColor,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-mono tabular-nums flex-shrink-0"
                      style={{ color: riskColor }}
                    >
                      {Math.round(decision.riskScore * 100)}
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[#8B949E] text-xs">
                    {new Date(decision.evaluatedAt).toLocaleDateString()}
                  </span>
                  <p className="text-[#656D76] text-[10px]">
                    {new Date(decision.evaluatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => setSelectedDecision(decision)}
                    className="w-7 h-7 rounded-lg hover:bg-[#21262D] flex items-center justify-center transition-colors"
                  >
                    <ChevronDown
                      size={14}
                      className="text-[#8B949E] -rotate-90"
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedDecision && (
        <DecisionDetailModal
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
        />
      )}
    </div>
  );
}
