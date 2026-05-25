import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json();

    await supabase.from("webhook_events").insert({
      source: "sonarqube",
      event_type: "analysis_complete",
      payload: payload,
    });

    const qualityGate = payload.qualityGate ?? {};
    const gateStatus = (qualityGate.status ?? "").toUpperCase();

    let status = "OK";
    if (gateStatus === "ERROR" || gateStatus === "FAILED") status = "FAILED";
    else if (gateStatus === "WARN") status = "WARN";

    let bugs = 0;
    let vulnerabilities = 0;
    let codeSmells = 0;

    const conditions = qualityGate.conditions ?? [];
    for (const cond of conditions) {
      const metric = cond.metric ?? "";
      const value = parseInt(cond.value ?? "0", 10);
      if (metric === "bugs") bugs = value;
      else if (metric === "vulnerabilities") vulnerabilities = value;
      else if (metric === "code_smells") codeSmells = value;
    }

    const project = payload.project ?? {};
    const prRepo = project.key ?? payload.repoFullName ?? "";
    const prNumber = payload.prNumber ?? 0;

    if (prRepo && prNumber) {
      const { data: existingDecision } = await supabase
        .from("decisions")
        .select("id")
        .eq("pr_repo", prRepo)
        .eq("pr_number", prNumber)
        .eq("sonar_status", "PENDING")
        .maybeSingle();

      if (existingDecision) {
        await supabase
          .from("decisions")
          .update({
            sonar_status: status,
            sonar_bugs: bugs,
            sonar_vulnerabilities: vulnerabilities,
            sonar_code_smells: codeSmells,
          })
          .eq("id", existingDecision.id);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, status, bugs, vulnerabilities, codeSmells }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("sonar-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
