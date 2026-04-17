/*
  # ARIA Platform - Evaluations Table

  ## Summary
  Creates a table to store AI agent evaluation decisions made through the ARIA
  Decision Engine. This persists live demo evaluations and allows tracking of
  decisions made during hackathon presentations.

  ## Tables
  - `aria_evaluations`: Stores each evaluation result from the ARIA engine
    - agent_name: Name of the AI agent evaluated
    - service_name: Target service/repository name
    - criticality: Service criticality level (LOW/MEDIUM/HIGH/CRITICAL)
    - decision: ARIA decision (ALLOW/BLOCK/REVIEW)
    - risk_score: Computed risk score (0-1)
    - trust_score: Agent trust score at time of evaluation
    - tool_signals: JSON with Snyk/Sonar/Raven results
    - reasoning: Plain English explanation of the decision
    - is_demo: Marks this as demo data for RLS policy

  ## Security
  - RLS enabled
  - Anon users can read demo evaluations (is_demo = true)
  - Anon users can insert demo evaluations (is_demo = true)
*/

CREATE TABLE IF NOT EXISTS aria_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  agent_type text NOT NULL DEFAULT 'external',
  service_name text NOT NULL,
  criticality text NOT NULL DEFAULT 'MEDIUM',
  decision text NOT NULL,
  risk_score float NOT NULL DEFAULT 0,
  trust_score float NOT NULL DEFAULT 0,
  confidence float NOT NULL DEFAULT 0,
  tool_signals jsonb,
  reasoning text,
  scenario_id text,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE aria_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo evaluations are publicly readable"
  ON aria_evaluations FOR SELECT
  TO anon, authenticated
  USING (is_demo = true);

CREATE POLICY "Anyone can create demo evaluations"
  ON aria_evaluations FOR INSERT
  TO anon, authenticated
  WITH CHECK (is_demo = true);
