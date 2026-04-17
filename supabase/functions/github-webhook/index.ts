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

    const event = req.headers.get("X-GitHub-Event") ?? "unknown";
    const payload = await req.json();

    await supabase.from("webhook_events").insert({
      source: "github",
      event_type: event,
      payload: payload,
    });

    if (event !== "pull_request") {
      return new Response(JSON.stringify({ ok: true, message: "Event logged" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const action = payload.action;
    if (!["opened", "synchronize", "reopened"].includes(action)) {
      return new Response(JSON.stringify({ ok: true, message: "PR action not evaluated" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pr = payload.pull_request;
    const githubUsername = pr?.user?.login ?? "";
    const prNumber = pr?.number ?? 0;
    const prTitle = pr?.title ?? "Untitled PR";
    const prRepo = payload.repository?.full_name ?? "";
    const filesChanged = pr?.changed_files ?? 0;
    const linesChanged = (pr?.additions ?? 0) + (pr?.deletions ?? 0);

    const { data: agent } = await supabase
      .from("agents")
      .select("id, trust_score, trust_level")
      .eq("github_username", githubUsername)
      .eq("is_active", true)
      .maybeSingle();

    if (!agent) {
      return new Response(JSON.stringify({ ok: true, message: `No ARIA agent mapped to GitHub user: ${githubUsername}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ariaUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/aria-evaluate`;
    const evalResponse = await fetch(ariaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        agentId: agent.id,
        serviceName: prRepo,
        criticality: "MEDIUM",
        prTitle,
        prRepo,
        prNumber,
        filesChanged,
        linesChanged,
        toolSignals: {},
      }),
    });

    const evalResult = await evalResponse.json();

    return new Response(JSON.stringify({ ok: true, evaluation: evalResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("github-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
