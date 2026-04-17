import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SEVERITY_TRUST_DELTA: Record<string, number> = {
  "1": -0.15,
  "2": -0.10,
  "3": -0.06,
  "4": -0.03,
  "5": -0.01,
  critical: -0.15,
  high: -0.10,
  medium: -0.06,
  low: -0.03,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();

    await supabase.from("webhook_events").insert({
      source: "servicenow",
      event_type: payload.event ?? payload.record_type ?? "incident",
      payload: payload,
    });

    const incidentState = (payload.state ?? payload.incident_state ?? "").toLowerCase();
    const isNewOrActive = ["new", "active", "1", "2"].includes(incidentState);

    if (!isNewOrActive) {
      return new Response(JSON.stringify({ ok: true, message: "Incident state not actionable" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const severity = (payload.severity ?? payload.impact ?? "3").toString().toLowerCase();
    const trustDelta = SEVERITY_TRUST_DELTA[severity] ?? -0.05;

    const agentId = payload.ariaAgentId ?? null;
    const githubUsername = payload.assignedTo ?? payload.github_username ?? null;

    let agentQuery = supabase.from("agents").select("id, name, trust_score");

    if (agentId) {
      agentQuery = agentQuery.eq("id", agentId);
    } else if (githubUsername) {
      agentQuery = agentQuery.eq("github_username", githubUsername);
    } else {
      return new Response(JSON.stringify({ ok: true, message: "No agent identifier in payload" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agent } = await agentQuery.eq("is_active", true).maybeSingle();

    if (!agent) {
      return new Response(JSON.stringify({ ok: true, message: "No matching ARIA agent found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newScore = Math.max(0, Math.min(1, agent.trust_score + trustDelta));
    let newLevel = "HIGH";
    if (newScore < 0.45) newLevel = "LOW";
    else if (newScore < 0.70) newLevel = "MEDIUM";

    await supabase
      .from("agents")
      .update({ trust_score: newScore, trust_level: newLevel })
      .eq("id", agent.id);

    await supabase.from("agent_trust_history").insert({
      agent_id: agent.id,
      trust_score: newScore,
      trust_delta: trustDelta,
      event_type: "INCIDENT",
      reason: `ServiceNow incident: ${payload.short_description ?? payload.number ?? "Unknown incident"}`,
      date: new Date().toISOString().split("T")[0],
    });

    await supabase.from("production_feedback").insert({
      agent_id: agent.id,
      event_type: "INCIDENT",
      service_name: payload.cmdb_ci ?? payload.service ?? "Unknown Service",
      description: payload.short_description ?? "Incident reported via ServiceNow",
      trust_impact: trustDelta,
      source: "servicenow",
      severity: severity,
      resolved: false,
    });

    return new Response(
      JSON.stringify({ ok: true, agentId: agent.id, agentName: agent.name, trustDelta, newScore: Math.round(newScore * 100) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("servicenow-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
