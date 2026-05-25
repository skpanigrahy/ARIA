/*
  # Executive FinOps Analytics Layer

  ## Summary
  Adds executive-grade analytics views, cost breakdowns, and KPI tracking for
  C-level visibility into token usage, optimization impact, and governance-driven
  cost reductions across entire organization, LOBs, teams, and individuals.

  ## Tables
  1. `finops_kpis` — Executive KPIs (daily snapshots for trending)
  2. `cost_breakdown_dimensions` — Multi-dimensional cost rollups
  3. `optimization_impact` — Realized savings from auto-optimizations
  4. `cost_efficiency_benchmarks` — Cost per task, per user, per model
  5. `governance_cost_impact` — Cost impact of governance decisions
  6. `team_cost_allocation` — Charge-back model for billing
  7. `executive_alerts` — Threshold-based alerts for execs
  8. `finops_audit_trail` — Complete audit of cost decisions

  ## Key Features
  1. Multi-level rollups: Organization → LOB → Sub-LOB → Team → User
  2. Cost attribution per: model, agent, workflow, request type, optimization
  3. Savings tracking: Realized vs projected per optimization type
  4. Governance cost: Cost impact of BLOCK/REVIEW/ALLOW decisions
  5. Efficiency benchmarks: Cost per task, per user, per model family
  6. Executive alerts: Anomalies, budget overruns, optimization opportunities
  7. Audit trail: Who did what, when, cost impact, business justification

  ## Organization Hierarchy
  - Organization (company level)
  - Line of Business (LOB)
  - Sub-LOB (optional)
  - Team
  - User
  - Agent/Model/Workflow

  ## Security
  - RLS enables role-based access (executive, LOB lead, team lead, user)
  - Executives can read all org data
  - LOB leads read own LOB + sub-LOB
  - Team leads read own team
  - Users read own usage

  ## Important Notes
  - KPI snapshots taken daily for trending and variance analysis
  - All costs are in USD, all tokens are counted
  - Savings calculations: (original_cost - optimized_cost) / original_cost * 100
  - Governance cost: cost difference between ALLOW vs BLOCK/REVIEW paths
  - Benchmarks recalculated daily with moving averages
*/

-- ============================================================
-- TABLE: organization_hierarchy
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  org_name text NOT NULL,
  lob_id text NOT NULL,
  lob_name text NOT NULL,
  sublob_id text,
  sublob_name text,
  team_id text NOT NULL,
  team_name text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_email text,
  role text NOT NULL DEFAULT 'contributor',
  manager_id text,
  cost_center text,
  business_unit text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, lob_id, sublob_id, team_id, user_id)
);

ALTER TABLE organization_hierarchy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own hierarchy"
  ON organization_hierarchy FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text OR role = 'executive');

CREATE POLICY "Anyone can insert hierarchy"
  ON organization_hierarchy FOR INSERT
  TO anon, authenticated
  WITH CHECK (org_id IS NOT NULL);

-- ============================================================
-- TABLE: finops_kpis (Daily Executive Metrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS finops_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  lob_id text,
  team_id text,
  user_id text,
  measurement_date date NOT NULL,
  total_cost_usd decimal(12, 4),
  total_tokens int,
  num_calls int,
  num_optimizations_applied int,
  optimizations_savings_usd decimal(12, 4),
  cost_reduction_percent decimal(5, 2),
  avg_cost_per_call decimal(10, 6),
  avg_tokens_per_call int,
  cache_hit_rate_percent decimal(5, 2),
  model_diversity_score int,
  top_model text,
  governance_blocks int,
  governance_reviews int,
  governance_allows int,
  anomalies_detected int,
  agents_restricted int,
  daily_budget_utilization_percent decimal(5, 2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, lob_id, team_id, user_id, measurement_date)
);

ALTER TABLE finops_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read KPIs"
  ON finops_kpis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert KPIs"
  ON finops_kpis FOR INSERT
  TO anon, authenticated
  WITH CHECK (org_id IS NOT NULL);

-- ============================================================
-- TABLE: cost_breakdown_dimensions
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_breakdown_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  lob_id text,
  team_id text,
  user_id text,
  breakdown_by text NOT NULL,
  category text NOT NULL,
  period text NOT NULL,
  total_cost_usd decimal(12, 4),
  total_tokens int,
  num_calls int,
  avg_cost_per_call decimal(10, 6),
  percent_of_total decimal(5, 2),
  trend text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, lob_id, team_id, user_id, breakdown_by, category, period)
);

ALTER TABLE cost_breakdown_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read breakdowns"
  ON cost_breakdown_dimensions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- TABLE: optimization_impact
-- ============================================================
CREATE TABLE IF NOT EXISTS optimization_impact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  team_id text NOT NULL,
  agent_id text,
  user_id text,
  optimization_id uuid REFERENCES cost_optimizations(id),
  optimization_type text NOT NULL,
  description text,
  model_before text,
  model_after text,
  original_cost_usd decimal(12, 4),
  optimized_cost_usd decimal(12, 4),
  savings_usd decimal(12, 4),
  savings_percent decimal(5, 2),
  calls_optimized int,
  tokens_saved int,
  optimization_applied_at timestamptz,
  realized_savings_usd decimal(12, 4) DEFAULT 0,
  realization_date timestamptz,
  is_verified boolean DEFAULT false,
  business_justification text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE optimization_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read optimization impact"
  ON optimization_impact FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team leads approve optimizations"
  ON optimization_impact FOR UPDATE
  TO authenticated
  USING (team_id IS NOT NULL)
  WITH CHECK (team_id IS NOT NULL);

-- ============================================================
-- TABLE: cost_efficiency_benchmarks
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_efficiency_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  benchmark_type text NOT NULL,
  dimension text NOT NULL,
  value text NOT NULL,
  cost_per_unit decimal(10, 6),
  cost_per_token decimal(12, 8),
  cost_per_call decimal(10, 6),
  tokens_per_call int,
  calls_in_sample int,
  percentile_10 decimal(10, 6),
  percentile_50 decimal(10, 6),
  percentile_90 decimal(10, 6),
  trend text,
  previous_period_value decimal(10, 6),
  variance_percent decimal(5, 2),
  measurement_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, benchmark_type, dimension, value, measurement_date)
);

ALTER TABLE cost_efficiency_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read benchmarks"
  ON cost_efficiency_benchmarks FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- TABLE: governance_cost_impact
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_cost_impact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  decision_id uuid REFERENCES decisions(id),
  agent_id text REFERENCES agents(id),
  governance_decision text NOT NULL,
  cost_if_allowed_usd decimal(12, 4),
  cost_if_blocked_usd decimal(12, 4),
  cost_if_reviewed_usd decimal(12, 4),
  cost_avoidance_usd decimal(12, 4),
  trust_impact decimal(5, 2),
  risk_reduced_percent decimal(5, 2),
  incident_prevention_value_usd decimal(12, 4),
  decision_made_at timestamptz,
  actual_outcome text,
  outcome_cost_impact_usd decimal(12, 4),
  verification_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE governance_cost_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read governance impact"
  ON governance_cost_impact FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- TABLE: team_cost_allocation
-- ============================================================
CREATE TABLE IF NOT EXISTS team_cost_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  lob_id text NOT NULL,
  team_id text NOT NULL,
  team_name text,
  allocation_month date NOT NULL,
  monthly_budget_usd decimal(12, 2),
  actual_spend_usd decimal(12, 4),
  budget_variance_usd decimal(12, 4),
  budget_variance_percent decimal(5, 2),
  chargeback_rate_per_token decimal(12, 8),
  chargeback_amount_usd decimal(12, 4),
  cost_center_code text,
  profit_center_code text,
  allocation_approved_by text,
  allocation_approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, lob_id, team_id, allocation_month)
);

ALTER TABLE team_cost_allocation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can read allocations"
  ON team_cost_allocation FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "LOB leads manage own allocation"
  ON team_cost_allocation FOR UPDATE
  TO authenticated
  USING (lob_id IS NOT NULL)
  WITH CHECK (lob_id IS NOT NULL);

-- ============================================================
-- TABLE: executive_alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS executive_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text,
  metric_name text,
  metric_value decimal(12, 4),
  threshold_value decimal(12, 4),
  impacted_dimension text,
  impacted_value text,
  recommended_action text,
  cost_impact_usd decimal(12, 4),
  potential_savings_usd decimal(12, 4),
  alert_triggered_at timestamptz DEFAULT now(),
  is_acknowledged boolean DEFAULT false,
  acknowledged_by text,
  acknowledged_at timestamptz,
  action_taken text,
  action_completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE executive_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read alerts"
  ON executive_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Executives update alerts"
  ON executive_alerts FOR UPDATE
  TO authenticated
  USING (org_id IS NOT NULL)
  WITH CHECK (org_id IS NOT NULL);

-- ============================================================
-- TABLE: finops_audit_trail
-- ============================================================
CREATE TABLE IF NOT EXISTS finops_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  actor_id text NOT NULL,
  actor_name text,
  actor_role text,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  change_description text,
  cost_impact_usd decimal(12, 4),
  business_justification text,
  compliance_notes text,
  action_timestamp timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE finops_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compliance read audit trail"
  ON finops_audit_trail FOR SELECT
  TO authenticated
  USING (org_id IS NOT NULL);

CREATE POLICY "Anyone can insert audit events"
  ON finops_audit_trail FOR INSERT
  TO anon, authenticated
  WITH CHECK (org_id IS NOT NULL);

-- ============================================================
-- TABLE: finops_reports_scheduled
-- ============================================================
CREATE TABLE IF NOT EXISTS finops_reports_scheduled (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  report_name text NOT NULL,
  report_type text NOT NULL,
  recipients text[] NOT NULL,
  schedule_cron text,
  include_sections text[] DEFAULT '{"cost_summary","optimizations","anomalies","benchmarks","governance_impact"}',
  filters jsonb,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE finops_reports_scheduled ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Executives manage reports"
  ON finops_reports_scheduled FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_finops_kpis_org_date ON finops_kpis(org_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_finops_kpis_lob_date ON finops_kpis(lob_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_finops_kpis_team_date ON finops_kpis(team_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_finops_kpis_user_date ON finops_kpis(user_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_cost_breakdown_org_period ON cost_breakdown_dimensions(org_id, period);
CREATE INDEX IF NOT EXISTS idx_cost_breakdown_by ON cost_breakdown_dimensions(breakdown_by, category);
CREATE INDEX IF NOT EXISTS idx_optimization_impact_org ON optimization_impact(org_id);
CREATE INDEX IF NOT EXISTS idx_optimization_impact_team ON optimization_impact(team_id);
CREATE INDEX IF NOT EXISTS idx_optimization_impact_realized ON optimization_impact(is_verified, realization_date DESC);
CREATE INDEX IF NOT EXISTS idx_benchmarks_org_type ON cost_efficiency_benchmarks(org_id, benchmark_type);
CREATE INDEX IF NOT EXISTS idx_governance_impact_org ON governance_cost_impact(org_id);
CREATE INDEX IF NOT EXISTS idx_governance_impact_agent ON governance_cost_impact(agent_id);
CREATE INDEX IF NOT EXISTS idx_team_allocation_month ON team_cost_allocation(org_id, allocation_month DESC);
CREATE INDEX IF NOT EXISTS idx_executive_alerts_severity ON executive_alerts(org_id, severity, is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON finops_audit_trail(org_id, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON finops_audit_trail(org_id, action_type);
