import { useState } from "react";
import {
  Shield,
  Cpu,
  Layers,
  Database,
  Zap,
  Network,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface LayerConfig {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  borderColor: string;
  items: { name: string; desc: string }[];
  isCore?: boolean;
  isPlanned?: boolean;
}

const LAYERS: LayerConfig[] = [
  {
    id: "interaction",
    label: "INTERACTION LAYER",
    sublabel: "User & System Interfaces",
    color: "#1F6FEB",
    borderColor: "#1F6FEB40",
    items: [
      {
        name: "Web Dashboard",
        desc: "Real-time trust visibility and decision explorer",
      },
      {
        name: "REST APIs",
        desc: "Integration interface for CI/CD and agent systems",
      },
      {
        name: "Voice Interface",
        desc: "Conversational ARIA queries (roadmap)",
      },
      { name: "CLI Tool", desc: "Developer-facing evaluation tool (roadmap)" },
    ],
  },
  {
    id: "governance",
    label: "GOVERNANCE LAYER",
    sublabel: "(Powered by ARIA) — Trust, Risk & Explainability",
    color: "#58A6FF",
    borderColor: "#1F6FEB60",
    isCore: true,
    items: [
      {
        name: "Trust Engine",
        desc: "Dynamic agent scoring based on behavior history",
      },
      {
        name: "Decision Engine",
        desc: "Context-aware risk evaluation and policy enforcement",
      },
      {
        name: "Explanation Engine",
        desc: "Plain-English reasoning for every ARIA decision",
      },
      {
        name: "Feedback Processor",
        desc: "Production outcome ingestion and trust updates",
      },
    ],
  },
  {
    id: "execution",
    label: "EXECUTION LAYER",
    sublabel: "(ACES) — Agent Orchestration & Workflows",
    color: "#D29922",
    borderColor: "#D2992240",
    isPlanned: true,
    items: [
      {
        name: "Agent Orchestrator",
        desc: "Manages multi-agent workflows and task routing",
      },
      {
        name: "Capability Registry",
        desc: "Plugin-based tool and skill management",
      },
      {
        name: "Workflow Engine",
        desc: "Triggers and sequences automated actions",
      },
      {
        name: "Integration Hooks",
        desc: "Connects to CI/CD pipelines and enterprise tools",
      },
    ],
  },
  {
    id: "enterprise",
    label: "ENTERPRISE SYSTEMS",
    sublabel: "Existing Infrastructure & Tooling",
    color: "#8B949E",
    borderColor: "#8B949E30",
    items: [
      {
        name: "GitHub Copilot / Claude",
        desc: "External AI agents generating code changes",
      },
      {
        name: "Snyk / SonarQube / Raven",
        desc: "Security, quality, and policy signal providers",
      },
      {
        name: "CI/CD Pipelines",
        desc: "Jenkins, GitHub Actions, deployment systems",
      },
      {
        name: "Observability & Prod",
        desc: "Incidents, metrics, and production signals",
      },
    ],
  },
];

function LayerBlock({ layer, index }: { layer: LayerConfig; index: number }) {
  const [expanded, setExpanded] = useState(layer.isCore || false);

  return (
    <div className="relative">
      <div
        className={`rounded-xl border-2 transition-all duration-300 overflow-hidden ${layer.isCore ? "shadow-lg" : ""}`}
        style={{
          borderColor: layer.borderColor,
          backgroundColor: layer.isCore
            ? `${layer.color}08`
            : `${layer.color}05`,
          boxShadow: layer.isCore ? `0 0 30px ${layer.color}20` : undefined,
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-1.5 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: layer.color }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: layer.color }}
                >
                  {layer.label}
                </span>
                {layer.isCore && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/30">
                    CORE
                  </span>
                )}
                {layer.isPlanned && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D29922]/20 text-[#E3B341] border border-[#D29922]/30">
                    PHASE 2
                  </span>
                )}
              </div>
              <p className="text-[#8B949E] text-xs mt-0.5">{layer.sublabel}</p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-[#656D76]" />
          ) : (
            <ChevronDown size={16} className="text-[#656D76]" />
          )}
        </button>

        {expanded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 pb-5">
            {layer.items.map((item) => (
              <div
                key={item.name}
                className="bg-[#0D1117] border border-[#21262D] rounded-lg p-3"
              >
                <p className="text-[#E6EDF3] text-xs font-medium mb-1">
                  {item.name}
                </p>
                <p className="text-[#656D76] text-[10px] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {index < LAYERS.length - 1 && (
        <div className="flex flex-col items-center py-1">
          <div className="w-px h-4 bg-[#21262D]" />
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-[#21262D]" />
            <div className="w-1 h-1 rounded-full bg-[#21262D]" />
            <div className="w-1 h-1 rounded-full bg-[#21262D]" />
          </div>
          <div className="w-px h-4 bg-[#21262D]" />
        </div>
      )}
    </div>
  );
}

function DataFlowDiagram() {
  const steps = [
    {
      id: 1,
      label: "Agent Action",
      sub: "PR or workflow triggered",
      color: "#8B949E",
      icon: Cpu,
    },
    {
      id: 2,
      label: "ARIA Evaluates",
      sub: "Trust + risk + tool signals",
      color: "#1F6FEB",
      icon: Shield,
    },
    {
      id: 3,
      label: "Decision",
      sub: "ALLOW / REVIEW / BLOCK",
      color: "#E3B341",
      icon: Zap,
    },
    {
      id: 4,
      label: "Deploy",
      sub: "Change goes to production",
      color: "#3FB950",
      icon: Layers,
    },
    {
      id: 5,
      label: "Feedback",
      sub: "Outcomes update trust score",
      color: "#58A6FF",
      icon: Database,
    },
  ];

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
      <h3 className="text-[#E6EDF3] font-semibold text-sm mb-5">
        Autonomous Trust Flow
      </h3>
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center min-w-24">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 flex-shrink-0"
                  style={{
                    backgroundColor: `${step.color}15`,
                    border: `1px solid ${step.color}30`,
                  }}
                >
                  <Icon size={20} style={{ color: step.color }} />
                </div>
                <p className="text-[#E6EDF3] text-xs font-medium text-center">
                  {step.label}
                </p>
                <p className="text-[#656D76] text-[10px] text-center mt-0.5 max-w-20">
                  {step.sub}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center px-2 flex-shrink-0">
                  <div className="w-8 h-px bg-[#21262D] relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-[#21262D] border-y-2 border-y-transparent" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-[#21262D] flex items-center gap-2">
        <div className="flex-1 h-px bg-gradient-to-r from-[#1F6FEB]/50 via-[#1F6FEB]/20 to-transparent" />
        <span className="text-[10px] text-[#656D76] whitespace-nowrap">
          Closed-Loop Feedback Architecture
        </span>
        <div className="flex-1 h-px bg-gradient-to-l from-[#1F6FEB]/50 via-[#1F6FEB]/20 to-transparent" />
      </div>
    </div>
  );
}

function PluginArchitecture() {
  const plugins = [
    {
      name: "Agent Connectors",
      items: [
        "GitHub Copilot",
        "Claude (Anthropic)",
        "GPT-4",
        "ACES (Phase 2)",
        "Custom MCP",
      ],
      color: "#1F6FEB",
    },
    {
      name: "Signal Providers",
      items: [
        "Snyk Security",
        "SonarQube",
        "Raven Policy",
        "SAST Tools",
        "Custom Scanner",
      ],
      color: "#3FB950",
    },
    {
      name: "Policy Modules",
      items: [
        "Domain Rules",
        "Compliance Checks",
        "Risk Thresholds",
        "Custom Policies",
      ],
      color: "#E3B341",
    },
    {
      name: "Feedback Sources",
      items: [
        "Incident Systems",
        "Observability",
        "Deployment Logs",
        "SLO Signals",
      ],
      color: "#8957E5",
    },
  ];

  return (
    <div className="bg-[#161B22] border border-[#21262D] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Network size={16} className="text-[#58A6FF]" />
        <h3 className="text-[#E6EDF3] font-semibold text-sm">
          Plugin Architecture
        </h3>
        <span className="text-[#656D76] text-xs ml-2">
          Extensible · Modular · Plug-and-play
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {plugins.map((plugin) => (
          <div
            key={plugin.name}
            className="bg-[#0D1117] border border-[#21262D] rounded-xl p-4"
          >
            <p
              className="text-xs font-semibold mb-3 pb-2 border-b border-[#21262D]"
              style={{ color: plugin.color }}
            >
              {plugin.name}
            </p>
            <ul className="space-y-1.5">
              {plugin.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-1.5 text-[10px]"
                >
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: plugin.color }}
                  />
                  <span className="text-[#8B949E]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Architecture() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#58A6FF]/10 to-transparent border border-[#1F6FEB]/20 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1F6FEB]/20 flex items-center justify-center flex-shrink-0">
            <Network size={18} className="text-[#58A6FF]" />
          </div>
          <div>
            <h2 className="text-[#E6EDF3] font-semibold text-base mb-1">
              ARIA Platform Architecture
            </h2>
            <p className="text-[#8B949E] text-sm leading-relaxed">
              A modular, extensible trust governance platform with clear
              separation between execution and governance. ACES (Phase 2) will
              provide the execution layer, while ARIA governs trust, risk, and
              accountability across all AI-driven actions.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-0">
        {LAYERS.map((layer, i) => (
          <LayerBlock key={layer.id} layer={layer} index={i} />
        ))}
      </div>

      <DataFlowDiagram />
      <PluginArchitecture />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: "Phase 1 — Now",
            color: "#3FB950",
            items: [
              "Agent Registry & Trust Profiles",
              "Decision Engine (ARIA Core)",
              "Decision Archaeology",
              "Production Feedback Loop",
              "Dashboard & APIs",
            ],
          },
          {
            title: "Phase 2 — Q3 2026",
            color: "#E3B341",
            items: [
              "ACES Execution Layer",
              "Multi-agent Orchestration",
              "CI/CD Deep Integration",
              "Auto-remediation Workflows",
              "Cost Tracking Module",
            ],
          },
          {
            title: "Phase 3 — 2027+",
            color: "#58A6FF",
            items: [
              "Enterprise-wide Rollout",
              "Predictive Risk Modeling",
              "Voice Interface (ARIA Chat)",
              "Capability Marketplace",
              "Zero Trust Integration",
            ],
          },
        ].map((phase) => (
          <div
            key={phase.title}
            className="bg-[#161B22] border border-[#21262D] rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: phase.color }}
              />
              <h3 className="text-[#E6EDF3] font-semibold text-sm">
                {phase.title}
              </h3>
            </div>
            <ul className="space-y-2">
              {phase.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-xs text-[#8B949E]"
                >
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: phase.color }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
