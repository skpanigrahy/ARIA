import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
      source: "snyk",
      event_type: payload.event ?? "scan_complete",
      payload: payload,
    });

    const project = payload.project ?? {};
    const issues = payload.newIssues ?? payload.issues ?? [];

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    for (const issue of issues) {
      const sev = (issue.issueData?.severity ?? issue.severity ?? "").toLowerCase();
      if (sev === "critical") criticalCount++;
      else if (sev === "high") highCount++;
      else if (sev === "medium") mediumCount++;
    }

    let status = "CLEAN";
    if (criticalCount > 0) status = "CRITICAL";
    else if (highCount > 0) status = "HIGH";
    else if (mediumCount > 0) status = "MEDIUM";

    const prRepo = project.name ?? payload.repoFullName ?? "";
    const prNumber = payload.prNumber ?? 0;

    if (prRepo && prNumber) {
      const { data: existingDecision } = await supabase
        .from("decisions")
        .select("id")
        .eq("pr_repo", prRepo)
        .eq("pr_number", prNumber)
        .eq("snyk_status", "PENDING")
        .maybeSingle();

      if (existingDecision) {
        await supabase
          .from("decisions")
          .update({
            snyk_status: status,
            snyk_critical_count: criticalCount,
            snyk_high_count: highCount,
          })
          .eq("id", existingDecision.id);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, status, criticalCount, highCount, mediumCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("snyk-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
