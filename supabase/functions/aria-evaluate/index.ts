import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ToolSignalInput {
  snyk?: { status: string; criticalCount?: number; highCount?: number };
  sonar?: { status: string; bugs?: number; vulnerabilities?: number; codeSmells?: number };
  raven?: { status: string; violations?: string[] };
}

interface EvaluateRequest {
  agentId: string;
  serviceName: string;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  prTitle: string;
  prRepo: string;
  prNumber: number;
  filesChanged?: number;
  linesChanged?: number;
  toolSignals?: ToolSignalInput;
}

const CRITICALITY_WEIGHTS: Record<string, number> = {
  LOW: 0.20,
  MEDIUM: 0.45,
  HIGH: 0.72,
  CRITICAL: 1.00,
};

function computeToolRisk(signals: ToolSignalInput): number {
  let snykScore = 0;
  let sonarScore = 0;
  let ravenScore = 0;

  if (signals.snyk) {
    const s = signals.snyk;
    if (s.status === "CRITICAL") snykScore = 1.0;
    else if (s.status === "HIGH") snykScore = 0.75;
    else if (s.status === "MEDIUM") snykScore = 0.45;
    else snykScore = 0.05;
    if (s.criticalCount && s.criticalCount > 0) snykScore = Math.max(snykScore, 0.9);
    if (s.highCount && s.highCount > 2) snykScore = Math.max(snykScore, 0.7);
  } else {
    snykScore = 0.3;
  }

  if (signals.sonar) {
    const s = signals.sonar;
    if (s.status === "FAILED" || s.status === "ERROR") sonarScore = 0.8;
    else if (s.status === "WARN") sonarScore = 0.45;
    else sonarScore = 0.05;
    if (s.vulnerabilities && s.vulnerabilities > 0) sonarScore = Math.max(sonarScore, 0.7);
    if (s.bugs && s.bugs > 3) sonarScore = Math.max(sonarScore, 0.5);
  } else {
    sonarScore = 0.3;
  }

  if (signals.raven) {
    const s = signals.raven;
    if (s.status === "VIOLATION") ravenScore = 1.0;
    else if (s.status === "WARN") ravenScore = 0.55;
    else ravenScore = 0.05;
    if (s.violations && s.violations.length > 0) ravenScore = Math.max(ravenScore, 0.85);
  } else {
    ravenScore = 0.25;
  }

  return snykScore * 0.45 + sonarScore * 0.25 + ravenScore * 0.30;
}

function generateReasoning(
  agentName: string,
  trustScore: number,
  agentRisk: number,
  toolRisk: number,
  criticalityRisk: number,
  overallRisk: number,
  criticality: string,
  signals: ToolSignalInput,
  decision: string
): string {
  const parts: string[] = [];

  if (agentRisk > 0.6) {
    parts.push(`${agentName} has a low trust score of ${Math.round(trustScore * 100)}%, indicating a history of incidents or insufficient track record.`);
  } else if (agentRisk > 0.3) {
    parts.push(`${agentName} has a moderate trust score of ${Math.round(trustScore * 100)}%, showing generally reliable behavior with some past issues.`);
  } else {
    parts.push(`${agentName} has a strong trust score of ${Math.round(trustScore * 100)}%, demonstrating consistent reliability.`);
  }

  if (signals.snyk && (signals.snyk.status === "CRITICAL" || signals.snyk.status === "HIGH")) {
    parts.push(`Snyk detected ${signals.snyk.status.toLowerCase()} severity vulnerabilities in the dependency tree.`);
  }
  if (signals.sonar && (signals.sonar.status === "FAILED" || signals.sonar.status === "ERROR")) {
    parts.push(`SonarQube quality gate failed with code quality violations.`);
  }
  if (signals.raven && signals.raven.status === "VIOLATION") {
    parts.push(`Raven policy engine detected compliance violations: ${signals.raven.violations?.join(", ") || "policy breach"}.`);
  }

  if (criticality === "CRITICAL" || criticality === "HIGH") {
    parts.push(`The target service is rated ${criticality.toLowerCase()} criticality, requiring elevated scrutiny.`);
  }

  parts.push(`Overall risk score: ${Math.round(overallRisk * 100)}/100. Decision: ${decision}.`);
  return parts.join(" ");
}

function generateRecommendation(decision: string, agentName: string, toolSignals: ToolSignalInput): string {
  if (decision === "BLOCK") {
    const issues: string[] = [];
    if (toolSignals.snyk && toolSignals.snyk.status !== "CLEAN") issues.push("resolve Snyk vulnerabilities");
    if (toolSignals.sonar && toolSignals.sonar.status !== "OK") issues.push("fix SonarQube quality gate failures");
    if (toolSignals.raven && toolSignals.raven.status === "VIOLATION") issues.push("remediate Raven policy violations");
    const issueStr = issues.length > 0 ? ` Specifically: ${issues.join(", ")}.` : "";
    return `This PR is blocked from deployment.${issueStr} A security review and manual approval from the platform engineering team is required before proceeding.`;
  }
  if (decision === "REVIEW") {
    return `This PR requires human review before deployment. Assign to a senior engineer familiar with the service. Verify all tool signal warnings have been acknowledged and document justification for proceeding.`;
  }
  return `This PR is approved for automated deployment. Ensure monitoring alerts are active for the target service and verify deployment health checks post-release.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: EvaluateRequest = await req.json();
    const { agentId, serviceName, criticality, prTitle, prRepo, prNumber, filesChanged, linesChanged, toolSignals } = body;

    if (!agentId || !serviceName || !criticality || !prTitle) {
      return new Response(JSON.stringify({ error: "Missing required fields: agentId, serviceName, criticality, prTitle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name, trust_score, trust_level, type, provider, owner_team")
      .eq("id", agentId)
      .maybeSingle();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found", details: agentError?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signals = toolSignals || {};
    const agentRisk = 1 - agent.trust_score;
    const toolRisk = computeToolRisk(signals);
    const criticalityRisk = CRITICALITY_WEIGHTS[criticality] ?? 0.45;
    const overallRisk = agentRisk * 0.38 + toolRisk * 0.42 + criticalityRisk * 0.20;
    const confidence = 0.72 + Math.random() * 0.18;

    let decision: string;
    if (overallRisk > 0.68) decision = "BLOCK";
    else if (overallRisk > 0.38) decision = "REVIEW";
    else decision = "ALLOW";

    const snykSignal = signals.snyk
      ? { status: signals.snyk.status, critical_count: signals.snyk.criticalCount ?? 0, high_count: signals.snyk.highCount ?? 0 }
      : { status: "PENDING", critical_count: 0, high_count: 0 };

    const sonarSignal = signals.sonar
      ? { status: signals.sonar.status, bugs: signals.sonar.bugs ?? 0, vulnerabilities: signals.sonar.vulnerabilities ?? 0, code_smells: signals.sonar.codeSmells ?? 0 }
      : { status: "PENDING", bugs: 0, vulnerabilities: 0, code_smells: 0 };

    const ravenSignal = signals.raven
      ? { status: signals.raven.status, violations: signals.raven.violations ?? [] }
      : { status: "PENDING", violations: [] };

    const reasoning = generateReasoning(agent.name, agent.trust_score, agentRisk, toolRisk, criticalityRisk, overallRisk, criticality, signals, decision);
    const recommendation = generateRecommendation(decision, agent.name, signals);

    const { data: saved, error: saveError } = await supabase
      .from("decisions")
      .insert({
        agent_id: agentId,
        pr_title: prTitle,
        pr_repo: prRepo ?? "",
        pr_number: prNumber ?? 0,
        pr_service_name: serviceName,
        pr_criticality: criticality,
        pr_files_changed: filesChanged ?? 0,
        pr_lines_changed: linesChanged ?? 0,
        trust_score_at_time: agent.trust_score,
        agent_risk: agentRisk,
        tool_risk: toolRisk,
        criticality_risk: criticalityRisk,
        overall_risk: overallRisk,
        decision: decision,
        confidence: confidence,
        snyk_status: snykSignal.status,
        snyk_critical_count: snykSignal.critical_count,
        snyk_high_count: snykSignal.high_count,
        sonar_status: sonarSignal.status,
        sonar_bugs: sonarSignal.bugs,
        sonar_vulnerabilities: sonarSignal.vulnerabilities,
        sonar_code_smells: sonarSignal.code_smells,
        raven_status: ravenSignal.status,
        raven_violations: ravenSignal.violations,
        reasoning: reasoning,
        recommendation: recommendation,
        is_demo: false,
      })
      .select()
      .maybeSingle();

    if (saveError) {
      console.error("Failed to save decision:", saveError);
    }

    return new Response(
      JSON.stringify({
        id: saved?.id ?? crypto.randomUUID(),
        decision,
        overallRisk: Math.round(overallRisk * 100),
        confidence: Math.round(confidence * 100),
        riskBreakdown: {
          agentRisk: Math.round(agentRisk * 100),
          toolRisk: Math.round(toolRisk * 100),
          criticalityRisk: Math.round(criticalityRisk * 100),
        },
        agent: {
          id: agent.id,
          name: agent.name,
          trustScore: Math.round(agent.trust_score * 100),
          trustLevel: agent.trust_level,
          type: agent.type,
        },
        toolSignals: {
          snyk: snykSignal,
          sonar: sonarSignal,
          raven: ravenSignal,
        },
        reasoning,
        recommendation,
        evaluatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("aria-evaluate error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
