import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AriaEvaluation {
  id?: string;
  agent_name: string;
  agent_type: string;
  service_name: string;
  criticality: string;
  decision: string;
  risk_score: number;
  trust_score: number;
  confidence: number;
  tool_signals: Record<string, unknown>;
  reasoning: string;
  scenario_id?: string;
  is_demo: boolean;
  created_at?: string;
}

export async function saveEvaluation(evaluation: AriaEvaluation) {
  const { data, error } = await supabase
    .from("aria_evaluations")
    .insert(evaluation)
    .select()
    .maybeSingle();
  return { data, error };
}

export async function fetchRecentEvaluations(limit = 20) {
  const { data, error } = await supabase
    .from("aria_evaluations")
    .select("*")
    .eq("is_demo", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
}
