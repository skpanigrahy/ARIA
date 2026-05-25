import { useState, useEffect } from "react";
import {
  Zap,
  CheckCircle,
  Circle,
  AlertTriangle,
  Shield,
  GitPullRequest,
  Loader,
  ChevronDown,
} from "lucide-react";
import { DecisionBadge, CriticalityBadge } from "../components/ui/Badge";
import RiskBar, { RiskGauge } from "../components/ui/RiskBar";
import TrustRing from "../components/ui/TrustRing";
import { DEMO_SCENARIOS } from "../data/scenarios";
import { evaluateScenario, ANALYSIS_STEPS } from "../lib/ariaEngine";
import { getAgentById } from "../data/agentData";
import { saveEvaluation } from "../lib/supabase";
import type { EvaluationResult, DemoScenario } from "../types";

type AnalysisState = "idle" | "analyzing" | "complete";

function ToolSignalRow({
  name,
  status,
  finding,
  score,
}: {
  name: string;
  status: string;
  finding?: string;
  score: number;
}) {
  const isOk = status === "CLEAN" || status === "OK";
  const isCritical = status === "CRITICAL" || status === "VIOLATION";
  const color = isOk ? "#3FB950" : isCritical ? "#F85149" : "#E3B341";
  const label = isOk
    ? "CLEAN"
    : isCritical
      ? status === "VIOLATION"
        ? "VIOLATION"
        : "CRITICAL"
      : "WARNING";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#21262D] last:border-0">
      <div
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}18` }}
      >
        {isOk ? (
          <CheckCircle size={12} style={{ color }} />
        ) : (
          <AlertTriangle size={12} style={{ color }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[#E6EDF3] text-xs font-medium">{name}</span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
            style={{
              color,
              borderColor: `${color}40`,
              backgroundColor: `${color}15`,
            }}
          >
            {label}
          </span>
        </div>
        {finding && (
          <p className="text-[#8B949E] text-[10px] leading-relaxed">
            {finding}
          </p>
        )}
        <div className="mt-1.5 w-full h-1 bg-[#21262D] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${score * 100}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

function AnalysisStepRow({
  step,
  status,
}: {
  step: { id: string; label: string; detail: string };
  status: "waiting" | "running" | "done";
}) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 transition-opacity duration-300 ${status === "waiting" ? "opacity-40" : "opacity-100"}`}
    >
      <div className="flex-shrink-0">
        {status === "done" ? (
          <CheckCircle size={16} className="text-[#3FB950]" />
        ) : status === "running" ? (
          <Loader size={16} className="text-[#58A6FF] animate-spin" />
        ) : (
          <Circle size={16} className="text-[#656D76]" />
        )}
      </div>
      <div>
        <p
          className={`text-sm font-medium ${status === "waiting" ? "text-[#656D76]" : "text-[#E6EDF3]"}`}
        >
          {step.label}
        </p>
        {status === "running" && (
          <p className="text-xs text-[#8B949E] mt-0.5 animate-pulse">
            {step.detail}
          </p>
        )}
      </div>
    </div>
  );
}

function DecisionResult({ result }: { result: EvaluationResult }) {
  const decisionColors = {
    BLOCK: { bg: "#DA3633", text: "#FF7B72", border: "#DA3633" },
    REVIEW: { bg: "#D29922", text: "#E3B341", border: "#D29922" },
    ALLOW: { bg: "#2EA043", text: "#3FB950", border: "#2EA043" },
  };
  const dc = decisionColors[result.decision];

  return (
    <div className="space-y-5 animate-fadeIn">
      <div
        className="rounded-xl p-5 border flex items-center justify-between"
        style={{ backgroundColor: `${dc.bg}10`, borderColor: `${dc.border}40` }}
      >
        <div>
          <p className="text-[#8B949E] text-xs mb-1">ARIA Decision</p>
          <div className="flex items-center gap-3">
            <DecisionBadge decision={result.decision} size="lg" />
            <div>
              <p className="text-[#E6EDF3] text-sm font-semibold">
                {result.pr.title}
              </p>
              <p className="text-[#8B949E] text-xs">
                {result.pr.serviceName} ·{" "}
                <CriticalityBadge level={result.pr.criticality} size="sm" />
              </p>
            </div>
          </div>
        </div>
        <RiskGauge score={result.riskScore} size={100} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
          <p className="text-[#8B949E] text-xs font-medium uppercase tracking-wide mb-3">
            Agent at Evaluation
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: result.agent.avatarColor }}
            >
              {result.agent.initials}
            </div>
            <div className="flex-1">
              <p className="text-[#E6EDF3] text-sm font-medium">
                {result.agent.name}
              </p>
              <TrustRing
                score={result.trustScoreAtTime}
                size={42}
                strokeWidth={4}
                showLabel={false}
              />
            </div>
            <div className="text-right">
              <p
                className="text-2xl font-bold tabular-nums"
                style={{
                  color:
                    result.trustScoreAtTime >= 0.7
                      ? "#3FB950"
                      : result.trustScoreAtTime >= 0.45
                        ? "#E3B341"
                        : "#F85149",
                }}
              >
                {Math.round(result.trustScoreAtTime * 100)}%
              </p>
              <p className="text-[#656D76] text-[10px]">Trust Score</p>
            </div>
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
          <p className="text-[#8B949E] text-xs font-medium uppercase tracking-wide mb-3">
            Confidence
          </p>
          <p className="text-3xl font-bold text-[#58A6FF] tabular-nums">
            {Math.round(result.confidence * 100)}%
          </p>
          <p className="text-[#656D76] text-xs mt-1">
            ARIA confidence in this decision
          </p>
          <div className="mt-2 w-full h-1.5 bg-[#21262D] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1F6FEB]"
              style={{ width: `${result.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
        <p className="text-[#8B949E] text-xs font-medium uppercase tracking-wide mb-4">
          Risk Breakdown
        </p>
        <div className="space-y-3">
          <RiskBar
            label="Agent Trust Risk"
            value={result.riskBreakdown.agentRisk}
          />
          <RiskBar
            label="Tool Signal Risk"
            value={result.riskBreakdown.toolRisk}
          />
          <RiskBar
            label="Service Criticality"
            value={result.riskBreakdown.criticalityRisk}
          />
        </div>
      </div>

      <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
        <p className="text-[#8B949E] text-xs font-medium uppercase tracking-wide mb-3">
          Tool Signals
        </p>
        <div>
          <ToolSignalRow
            name="Snyk Security Scanner"
            status={result.toolSignals.snyk.status}
            finding={result.toolSignals.snyk.finding}
            score={result.toolSignals.snyk.riskScore}
          />
          <ToolSignalRow
            name="SonarQube Code Quality"
            status={result.toolSignals.sonar.status}
            finding={result.toolSignals.sonar.finding}
            score={result.toolSignals.sonar.riskScore}
          />
          <ToolSignalRow
            name="Raven Policy Engine"
            status={result.toolSignals.raven.status}
            finding={result.toolSignals.raven.finding}
            score={result.toolSignals.raven.riskScore}
          />
        </div>
      </div>

      <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-[#58A6FF]" />
          <p className="text-[#E6EDF3] text-xs font-semibold">ARIA Reasoning</p>
        </div>
        <p className="text-[#8B949E] text-sm leading-relaxed">
          {result.reasoning}
        </p>
      </div>

      <div
        className="rounded-xl p-4 border"
        style={{ backgroundColor: `${dc.bg}08`, borderColor: `${dc.border}30` }}
      >
        <p className="text-[#8B949E] text-xs font-medium uppercase tracking-wide mb-2">
          Recommendation
        </p>
        <p className="text-[#E6EDF3] text-sm leading-relaxed">
          {result.recommendation}
        </p>
      </div>
    </div>
  );
}

export default function DecisionEngine() {
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario>(
    DEMO_SCENARIOS[0],
  );
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [completedSteps, setCompletedSteps] = useState<number>(-1);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const agent = getAgentById(selectedScenario.pr.agentId);

  const handleEvaluate = async () => {
    setAnalysisState("analyzing");
    setCompletedSteps(-1);
    setResult(null);

    let totalDelay = 0;
    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      totalDelay += ANALYSIS_STEPS[i].duration;
      const stepIndex = i;
      const delayForThis = totalDelay;
      setTimeout(() => setCompletedSteps(stepIndex), delayForThis);
    }

    setTimeout(async () => {
      const evalResult = evaluateScenario(selectedScenario);
      setResult(evalResult);
      setAnalysisState("complete");

      try {
        await saveEvaluation({
          agent_name: evalResult.agent.name,
          agent_type: evalResult.agent.type,
          service_name: evalResult.pr.serviceName,
          criticality: evalResult.pr.criticality,
          decision: evalResult.decision,
          risk_score: evalResult.riskScore,
          trust_score: evalResult.trustScoreAtTime,
          confidence: evalResult.confidence,
          tool_signals: evalResult.toolSignals as Record<string, unknown>,
          reasoning: evalResult.reasoning,
          scenario_id: selectedScenario.id,
          is_demo: true,
        });
      } catch {
        /* silently handle */
      }
    }, totalDelay + 400);
  };

  const handleScenarioChange = (scenario: DemoScenario) => {
    setSelectedScenario(scenario);
    setAnalysisState("idle");
    setCompletedSteps(-1);
    setResult(null);
    setDropdownOpen(false);
  };

  const RISK_COLORS = { HIGH: "#F85149", MEDIUM: "#E3B341", LOW: "#3FB950" };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1F6FEB]/10 to-transparent border border-[#1F6FEB]/20 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1F6FEB]/20 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-[#58A6FF]" />
          </div>
          <div>
            <h2 className="text-[#E6EDF3] font-semibold text-base mb-1">
              ARIA Decision Engine
            </h2>
            <p className="text-[#8B949E] text-sm leading-relaxed">
              Select a pre-built scenario or provide custom PR data to see ARIA
              evaluate agent trust, tool signals, and service criticality in
              real time — producing a context-aware, explainable decision.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-[#8B949E] text-xs font-medium uppercase tracking-wide mb-2 block">
              Select Demo Scenario
            </label>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-[#161B22] border border-[#21262D] rounded-xl p-4 text-left hover:border-[#30363D] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: RISK_COLORS[selectedScenario.riskLevel],
                    }}
                  />
                  <div>
                    <p className="text-[#E6EDF3] text-sm font-medium">
                      {selectedScenario.title}
                    </p>
                    <p className="text-[#8B949E] text-xs">
                      {selectedScenario.description}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-[#8B949E] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#161B22] border border-[#21262D] rounded-xl shadow-xl z-20 overflow-hidden">
                  {DEMO_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => handleScenarioChange(scenario)}
                      className="w-full px-4 py-3 text-left hover:bg-[#21262D] transition-colors flex items-center gap-3 border-b border-[#21262D] last:border-0"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: RISK_COLORS[scenario.riskLevel],
                        }}
                      />
                      <div>
                        <p className="text-[#E6EDF3] text-sm">
                          {scenario.title}
                        </p>
                        <p className="text-[#8B949E] text-xs">
                          {scenario.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <GitPullRequest size={14} className="text-[#58A6FF]" />
              <p className="text-[#E6EDF3] text-xs font-semibold uppercase tracking-wide">
                PR Details
              </p>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "PR Title", value: selectedScenario.pr.title },
                { label: "Repository", value: selectedScenario.pr.repoName },
                { label: "Service", value: selectedScenario.pr.serviceName },
                {
                  label: "Criticality",
                  value: (
                    <CriticalityBadge
                      level={selectedScenario.pr.criticality}
                      size="sm"
                    />
                  ),
                },
                {
                  label: "Lines Changed",
                  value: selectedScenario.pr.linesChanged.toLocaleString(),
                },
                {
                  label: "Files Changed",
                  value: selectedScenario.pr.filesChanged,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center py-1.5 border-b border-[#21262D]/70 last:border-0"
                >
                  <span className="text-[#8B949E] text-xs">{item.label}</span>
                  <span className="text-[#E6EDF3] text-xs font-medium">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {agent && (
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
              <p className="text-[#8B949E] text-xs font-semibold uppercase tracking-wide mb-3">
                Submitting Agent
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: agent.avatarColor }}
                >
                  {agent.initials}
                </div>
                <div className="flex-1">
                  <p className="text-[#E6EDF3] text-sm font-medium">
                    {agent.name}
                  </p>
                  <p className="text-[#8B949E] text-xs">{agent.provider}</p>
                </div>
                <TrustRing score={agent.trustScore} size={50} strokeWidth={4} />
              </div>
            </div>
          )}

          <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-4">
            <p className="text-[#656D76] text-xs italic leading-relaxed">
              {selectedScenario.demoNarrative}
            </p>
          </div>

          <button
            onClick={handleEvaluate}
            disabled={analysisState === "analyzing"}
            className="w-full bg-[#1F6FEB] hover:bg-[#388BFD] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/30"
          >
            {analysisState === "analyzing" ? (
              <>
                <Loader size={16} className="animate-spin" />
                Analyzing with ARIA...
              </>
            ) : (
              <>
                <Zap size={16} />
                {result ? "Re-evaluate with ARIA" : "Evaluate with ARIA"}
              </>
            )}
          </button>
        </div>

        <div>
          {analysisState === "idle" && (
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-8 flex flex-col items-center justify-center min-h-64 text-center">
              <div className="w-14 h-14 rounded-full bg-[#1F6FEB]/10 flex items-center justify-center mb-4">
                <Zap size={24} className="text-[#1F6FEB]" />
              </div>
              <h3 className="text-[#E6EDF3] font-semibold mb-2">
                Ready to Evaluate
              </h3>
              <p className="text-[#8B949E] text-sm leading-relaxed max-w-xs">
                Select a scenario and click "Evaluate with ARIA" to see the full
                trust analysis, risk scoring, and decision reasoning.
              </p>
            </div>
          )}

          {analysisState === "analyzing" && (
            <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#1F6FEB]/15 flex items-center justify-center">
                  <Shield size={16} className="text-[#58A6FF]" />
                </div>
                <div>
                  <p className="text-[#E6EDF3] text-sm font-semibold">
                    ARIA Analysis in Progress
                  </p>
                  <p className="text-[#8B949E] text-xs">
                    Processing multi-factor risk evaluation...
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                {ANALYSIS_STEPS.map((step, i) => (
                  <AnalysisStepRow
                    key={step.id}
                    step={step}
                    status={
                      i < completedSteps
                        ? "done"
                        : i === completedSteps
                          ? "running"
                          : i === completedSteps + 1
                            ? "running"
                            : "waiting"
                    }
                  />
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-[#21262D]">
                <div className="w-full h-1 bg-[#21262D] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1F6FEB] rounded-full transition-all duration-500"
                    style={{
                      width: `${((completedSteps + 1) / ANALYSIS_STEPS.length) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[#656D76] text-[10px] mt-2 text-center">
                  Step {Math.max(completedSteps + 1, 1)} of{" "}
                  {ANALYSIS_STEPS.length}
                </p>
              </div>
            </div>
          )}

          {analysisState === "complete" && result && (
            <DecisionResult result={result} />
          )}
        </div>
      </div>
    </div>
  );
}
