import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Target,
  AlertCircle,
  Award,
  BarChart3,
} from "lucide-react";
import MetricCard from "../components/ui/MetricCard";

interface ExecutiveMetrics {
  totalCostMtd: number;
  projectedMonthlyCost: number;
  savingsRealized: number;
  optimizationsApplied: number;
  costTrend: "up" | "down" | "stable";
  savingsPercent: number;
  governanceBlocksSaved: number;
  anomaliesDetected: number;
}

interface DimensionalBreakdown {
  lob: Array<{ name: string; cost: number; percent: number; trend: string }>;
  models: Array<{ name: string; cost: number; percent: number; calls: number }>;
  teams: Array<{ name: string; cost: number; percent: number; trend: string }>;
  optimizations: Array<{ type: string; saved: number; applied: number }>;
}

interface CostEfficiency {
  costPerCall: number;
  tokensPerCall: number;
  cacheHitRate: number;
  avgLatencyMs: number;
  benchmarkPercentile: number;
}

export default function ExecutiveFinOps() {
  const [metrics, setMetrics] = useState<ExecutiveMetrics>({
    totalCostMtd: 45230.5,
    projectedMonthlyCost: 98450.0,
    savingsRealized: 12340.75,
    optimizationsApplied: 1247,
    costTrend: "down",
    savingsPercent: 12.1,
    governanceBlocksSaved: 847,
    anomaliesDetected: 23,
  });

  const [breakdown, setBreakdown] = useState<DimensionalBreakdown>({
    lob: [
      { name: "Digital Banking", cost: 28500, percent: 38.1, trend: "down" },
      { name: "Risk & Compliance", cost: 18900, percent: 25.3, trend: "up" },
      { name: "Payments", cost: 16200, percent: 21.7, trend: "stable" },
      { name: "Trading & Markets", cost: 10100, percent: 13.5, trend: "down" },
    ],
    models: [
      { name: "Claude Opus", cost: 32100, percent: 43, calls: 4521 },
      { name: "GPT-4o", cost: 21200, percent: 28.4, calls: 8932 },
      { name: "Claude Sonnet", cost: 15600, percent: 21, calls: 18900 },
      { name: "Copilot", cost: 5800, percent: 7.8, calls: 12340 },
    ],
    teams: [
      { name: "ML Platform", cost: 18900, percent: 25.3, trend: "down" },
      { name: "Data Eng", cost: 14500, percent: 19.4, trend: "up" },
      { name: "API Gateway", cost: 12300, percent: 16.5, trend: "stable" },
      { name: "Security Ops", cost: 10200, percent: 13.7, trend: "down" },
    ],
    optimizations: [
      { type: "Model Downgrade (Opus→Sonnet)", saved: 4200, applied: 234 },
      { type: "Prompt Compression", saved: 3100, applied: 567 },
      { type: "Cache Hits", saved: 2800, applied: 1890 },
      { type: "Token Pruning", saved: 2240, applied: 356 },
    ],
  });

  const [efficiency, setEfficiency] = useState<CostEfficiency>({
    costPerCall: 0.0456,
    tokensPerCall: 892,
    cacheHitRate: 34.2,
    avgLatencyMs: 245,
    benchmarkPercentile: 68,
  });

  return (
    <div className="w-full bg-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Executive FinOps Dashboard
        </h1>
        <p className="text-slate-600">
          Real-time cost intelligence, optimization tracking, and governance
          impact across all lines of business
        </p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={DollarSign}
          label="Total Cost (MTD)"
          value={`$${(metrics.totalCostMtd / 1000).toFixed(1)}K`}
          trend={metrics.costTrend}
          trendValue={3.2}
          subtitle={`Projected: $${(metrics.projectedMonthlyCost / 1000).toFixed(0)}K/mo`}
        />
        <MetricCard
          icon={TrendingDown}
          label="Savings Realized"
          value={`$${(metrics.savingsRealized / 1000).toFixed(1)}K`}
          trend="down"
          trendValue={metrics.savingsPercent}
          subtitle={`${metrics.optimizationsApplied.toLocaleString()} optimizations applied`}
        />
        <MetricCard
          icon={Award}
          label="Governance Impact"
          value={metrics.governanceBlocksSaved.toLocaleString()}
          trend="down"
          trendValue={8.5}
          subtitle="Risky requests blocked"
        />
        <MetricCard
          icon={AlertCircle}
          label="Anomalies Detected"
          value={metrics.anomaliesDetected}
          trend="up"
          trendValue={2.1}
          subtitle="Requiring review"
        />
      </div>

      {/* Cost Breakdown by Line of Business */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* LOB Breakdown */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <div className="flex items-center mb-6">
            <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-slate-900">
              Cost by Line of Business
            </h2>
          </div>
          <div className="space-y-4">
            {breakdown.lob.map((lob, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">
                    {lob.name}
                  </span>
                  <span className="text-sm text-slate-600">
                    ${(lob.cost / 1000).toFixed(1)}K ({lob.percent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full"
                    style={{ width: `${lob.percent}%` }}
                  />
                </div>
                <div className="flex items-center">
                  {lob.trend === "down" ? (
                    <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
                  ) : lob.trend === "up" ? (
                    <TrendingUp className="w-4 h-4 text-red-600 mr-1" />
                  ) : (
                    <div className="w-4 h-4 text-slate-400 mr-1">—</div>
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      lob.trend === "down"
                        ? "text-green-600"
                        : lob.trend === "up"
                          ? "text-red-600"
                          : "text-slate-500"
                    }`}
                  >
                    {lob.trend === "down"
                      ? "↓"
                      : lob.trend === "up"
                        ? "↑"
                        : "→"}{" "}
                    Trending {lob.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <div className="flex items-center mb-6">
            <Zap className="w-5 h-5 text-amber-600 mr-2" />
            <h2 className="text-xl font-bold text-slate-900">Cost by Model</h2>
          </div>
          <div className="space-y-4">
            {breakdown.models.map((model, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">
                    {model.name}
                  </span>
                  <span className="text-sm text-slate-600">
                    ${(model.cost / 1000).toFixed(1)}K ({model.percent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full"
                    style={{ width: `${model.percent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">
                  {model.calls.toLocaleString()} calls
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Optimizations & Savings */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 mb-8">
        <div className="flex items-center mb-6">
          <Target className="w-5 h-5 text-green-600 mr-2" />
          <h2 className="text-xl font-bold text-slate-900">
            Auto-Optimization Impact
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">
                  Optimization Type
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Applied
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  Savings
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">
                  % of Total Savings
                </th>
              </tr>
            </thead>
            <tbody>
              {breakdown.optimizations.map((opt, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="py-3 px-4 text-slate-700">{opt.type}</td>
                  <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                    {opt.applied.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-green-600">
                      ${(opt.saved / 1000).toFixed(1)}K
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-semibold">
                      {((opt.saved / metrics.savingsRealized) * 100).toFixed(1)}
                      %
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-600 mb-1">Total Optimizations</p>
            <p className="text-2xl font-bold text-slate-900">
              {breakdown.optimizations
                .reduce((sum, o) => sum + o.applied, 0)
                .toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Savings Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {((metrics.savingsRealized / metrics.totalCostMtd) * 100).toFixed(
                1,
              )}
              %
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Avg Savings per Opt</p>
            <p className="text-2xl font-bold text-slate-900">
              $
              {(
                metrics.savingsRealized /
                breakdown.optimizations.reduce((sum, o) => sum + o.applied, 0)
              ).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Cost Efficiency & Benchmarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <p className="text-sm text-blue-700 font-semibold mb-2">
            Cost per Call
          </p>
          <p className="text-3xl font-bold text-blue-900">
            ${efficiency.costPerCall.toFixed(4)}
          </p>
          <p className="text-xs text-blue-600 mt-2">Org benchmark: $0.0421</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <p className="text-sm text-purple-700 font-semibold mb-2">
            Avg Tokens/Call
          </p>
          <p className="text-3xl font-bold text-purple-900">
            {efficiency.tokensPerCall}
          </p>
          <p className="text-xs text-purple-600 mt-2">Trend: Stable</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <p className="text-sm text-green-700 font-semibold mb-2">
            Cache Hit Rate
          </p>
          <p className="text-3xl font-bold text-green-900">
            {efficiency.cacheHitRate}%
          </p>
          <p className="text-xs text-green-600 mt-2">↑ 8.3% vs last month</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <p className="text-sm text-orange-700 font-semibold mb-2">
            Avg Latency
          </p>
          <p className="text-3xl font-bold text-orange-900">
            {efficiency.avgLatencyMs}ms
          </p>
          <p className="text-xs text-orange-600 mt-2">Within SLA</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-6 border border-cyan-200">
          <p className="text-sm text-cyan-700 font-semibold mb-2">
            Efficiency Rank
          </p>
          <p className="text-3xl font-bold text-cyan-900">
            {efficiency.benchmarkPercentile}th %ile
          </p>
          <p className="text-xs text-cyan-600 mt-2">Better than peers</p>
        </div>
      </div>

      {/* Governance & Risk Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Governance Cost Avoidance
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200">
              <div>
                <p className="font-semibold text-slate-900">BLOCK Decisions</p>
                <p className="text-sm text-slate-600">
                  High-risk requests prevented
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">847</p>
                <p className="text-sm text-red-600">$8.5K avoided</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
              <div>
                <p className="font-semibold text-slate-900">REVIEW Decisions</p>
                <p className="text-sm text-slate-600">
                  Escalated for human review
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">342</p>
                <p className="text-sm text-yellow-600">$3.2K scrutinized</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <div>
                <p className="font-semibold text-slate-900">ALLOW Decisions</p>
                <p className="text-sm text-slate-600">Trusted agent requests</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">5,430</p>
                <p className="text-sm text-green-600">$126.3K approved</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Monthly Trend & Projections
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">
                  April 2026 (Current)
                </span>
                <span className="text-sm font-bold text-slate-900">
                  $45.2K / 46% of budget
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full"
                  style={{ width: "46%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">
                  Projected (EOY)
                </span>
                <span className="text-sm font-bold text-slate-900">
                  $98.5K / 100% of budget
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-2">
                Budget Status by LOB
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-xs text-green-700 font-semibold">
                    Digital Banking
                  </p>
                  <p className="text-sm font-bold text-green-900">42% used</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p className="text-xs text-yellow-700 font-semibold">
                    Risk & Compliance
                  </p>
                  <p className="text-sm font-bold text-yellow-900">58% used</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p className="text-xs text-yellow-700 font-semibold">
                    Payments
                  </p>
                  <p className="text-sm font-bold text-yellow-900">55% used</p>
                </div>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-xs text-green-700 font-semibold">
                    Trading & Markets
                  </p>
                  <p className="text-sm font-bold text-green-900">38% used</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
