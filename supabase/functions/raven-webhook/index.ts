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
      source: "raven",
      event_type: payload.eventType ?? "policy_check",
      payload: payload,
    });

    const policyResult = payload.policyResult ?? payload;
    const rawStatus = (policyResult.status ?? "").toUpperCase();
    const violations: string[] =
      policyResult.violations ?? payload.violations ?? [];

    let status = "PASS";
    if (rawStatus === "VIOLATION" || violations.length > 0)
      status = "VIOLATION";
    else if (rawStatus === "WARN") status = "WARN";

    const prRepo = payload.repoFullName ?? payload.repo ?? "";
    const prNumber = payload.prNumber ?? 0;

    if (prRepo && prNumber) {
      const { data: existingDecision } = await supabase
        .from("decisions")
        .select("id")
        .eq("pr_repo", prRepo)
        .eq("pr_number", prNumber)
        .eq("raven_status", "PENDING")
        .maybeSingle();

      if (existingDecision) {
        await supabase
          .from("decisions")
          .update({
            raven_status: status,
            raven_violations: violations,
          })
          .eq("id", existingDecision.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, status, violations }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("raven-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
