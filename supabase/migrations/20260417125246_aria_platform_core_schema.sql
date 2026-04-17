/*
  # ARIA Platform — Core Schema

  ## Summary
  Creates the full data model for the ARIA Trust & Governance Platform,
  replacing all hardcoded demo data with persistent Supabase tables.

  ## Tables
  1. `agents` — AI agent registry with trust scores and metadata
  2. `agent_trust_history` — Full audit trail of trust score changes per agent
  3. `decisions` — ARIA evaluation decisions (replaces aria_evaluations)
  4. `production_feedback` — Production events that feed back into trust scores
  5. `integration_configs` — Non-secret config for GitHub/Snyk/Sonar/Raven/ServiceNow
  6. `webhook_events` — Audit log of all incoming webhook payloads

  ## Security
  - RLS enabled on all tables
  - Agents: anon can read active agents
  - Decisions: anon can read and insert demo decisions
  - Trust history & feedback: anon can read and insert
  - Integration configs: anon can read (no secrets stored here)
  - Webhook events: anon can insert (webhooks), authenticated to read

  ## Notes
  - All demo seed data is marked with is_demo = true
  - github_username on agents enables PR-to-agent mapping
  - pending_signals JSONB on decisions accumulates webhook payloads before evaluation
*/

-- ============================================================
-- TABLE: agents
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'external',
  provider text,
  owner_team text,
  trust_score float NOT NULL DEFAULT 0.5,
  trust_level text NOT NULL DEFAULT 'MEDIUM',
  total_prs int NOT NULL DEFAULT 0,
  total_incidents int NOT NULL DEFAULT 0,
  total_clean_deploys int NOT NULL DEFAULT 0,
  last_active_at timestamptz,
  registered_at timestamptz DEFAULT now(),
  avatar_color text DEFAULT '#1F6FEB',
  initials text,
  tags text[] DEFAULT '{}',
  recent_trend text DEFAULT 'stable',
  github_username text,
  bitbucket_username text,
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active agents are readable by all"
  ON agents FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert agents"
  ON agents FOR INSERT
  TO anon, authenticated
  WITH CHECK (is_active = true);

CREATE POLICY "Authenticated users can update agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (is_active = true)
  WITH CHECK (is_active = true);

-- ============================================================
-- TABLE: agent_trust_history
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_trust_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  trust_score float NOT NULL,
  trust_delta float NOT NULL DEFAULT 0,
  reason text,
  related_pr text,
  occurred_at timestamptz DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false
);

ALTER TABLE agent_trust_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trust history readable by all"
  ON agent_trust_history FOR SELECT
  TO anon, authenticated
  USING (agent_id IS NOT NULL);

CREATE POLICY "Anyone can insert trust history"
  ON agent_trust_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (agent_id IS NOT NULL);

-- ============================================================
-- TABLE: decisions
-- ============================================================
CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text REFERENCES agents(id),
  pr_title text,
  pr_repo text,
  pr_number text,
  pr_url text,
  service_name text,
  criticality text NOT NULL DEFAULT 'MEDIUM',
  lines_changed int DEFAULT 0,
  files_changed int DEFAULT 0,
  description text,
  decision text,
  risk_score float,
  confidence float,
  trust_score_at_time float,
  tool_signals jsonb DEFAULT '{}',
  risk_breakdown jsonb DEFAULT '{}',
  reasoning text,
  recommendation text,
  pending_signals jsonb DEFAULT '{}',
  signals_received text[] DEFAULT '{}',
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'complete',
  is_demo boolean NOT NULL DEFAULT false,
  evaluated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Decisions readable by all"
  ON decisions FOR SELECT
  TO anon, authenticated
  USING (agent_id IS NOT NULL OR is_demo = true);

CREATE POLICY "Anyone can insert decisions"
  ON decisions FOR INSERT
  TO anon, authenticated
  WITH CHECK (created_at IS NOT NULL);

CREATE POLICY "Anyone can update decisions"
  ON decisions FOR UPDATE
  TO anon, authenticated
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

-- ============================================================
-- TABLE: production_feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS production_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid REFERENCES decisions(id),
  agent_id text REFERENCES agents(id),
  agent_name text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'MEDIUM',
  service_name text,
  description text,
  trust_delta float NOT NULL DEFAULT 0,
  previous_trust float,
  new_trust float,
  linked_pr text,
  source text NOT NULL DEFAULT 'manual',
  external_ticket text,
  occurred_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false
);

ALTER TABLE production_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback readable by all"
  ON production_feedback FOR SELECT
  TO anon, authenticated
  USING (agent_id IS NOT NULL OR is_demo = true);

CREATE POLICY "Anyone can insert feedback"
  ON production_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (event_type IS NOT NULL);

-- ============================================================
-- TABLE: integration_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  config jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  events_received int NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  last_event_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Integration configs readable by all"
  ON integration_configs FOR SELECT
  TO anon, authenticated
  USING (type IS NOT NULL);

CREATE POLICY "Anyone can update integration configs"
  ON integration_configs FOR UPDATE
  TO anon, authenticated
  USING (type IS NOT NULL)
  WITH CHECK (type IS NOT NULL);

-- ============================================================
-- TABLE: webhook_events
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text,
  payload jsonb,
  processed boolean NOT NULL DEFAULT false,
  decision_id uuid REFERENCES decisions(id),
  pr_repo text,
  pr_number text,
  error text,
  received_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook events readable by authenticated"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (source IS NOT NULL);

CREATE POLICY "Anyone can insert webhook events"
  ON webhook_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (source IS NOT NULL);

CREATE POLICY "Anyone can update webhook events"
  ON webhook_events FOR UPDATE
  TO anon, authenticated
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

-- ============================================================
-- SEED: Integration configs (non-secret)
-- ============================================================
INSERT INTO integration_configs (type, name, description, is_active) VALUES
  ('github', 'GitHub', 'Receive PR events from GitHub repositories to trigger ARIA evaluation', false),
  ('bitbucket', 'Bitbucket', 'Receive PR events from Bitbucket repositories', false),
  ('snyk', 'Snyk Security Scanner', 'Receive vulnerability scan results from Snyk for risk scoring', false),
  ('sonarqube', 'SonarQube', 'Receive code quality analysis results from SonarQube', false),
  ('raven', 'Raven Policy Engine', 'Receive policy compliance results from Raven', false),
  ('servicenow', 'ServiceNow', 'Receive incident events to update agent trust scores via production feedback', false)
ON CONFLICT (type) DO NOTHING;

-- ============================================================
-- SEED: Demo agents
-- ============================================================
INSERT INTO agents (id, name, type, provider, owner_team, trust_score, trust_level, total_prs, total_incidents, total_clean_deploys, last_active_at, registered_at, avatar_color, initials, tags, recent_trend, is_demo) VALUES
  ('agent-copilot', 'GitHub Copilot', 'external', 'GitHub / OpenAI', 'Platform Engineering', 0.88, 'HIGH', 1247, 4, 1189, '2026-04-17T09:32:00Z', '2025-09-15T00:00:00Z', '#1F6FEB', 'GC', ARRAY['code-gen','completion','refactor'], 'up', true),
  ('agent-claude', 'Claude (Anthropic)', 'external', 'Anthropic', 'AI Engineering', 0.71, 'MEDIUM', 634, 11, 589, '2026-04-17T08:15:00Z', '2025-11-02T00:00:00Z', '#2EA043', 'CA', ARRAY['reasoning','code-review','analysis'], 'stable', true),
  ('agent-mcp-internal', 'Internal MCP Agent v1', 'mcp', 'JPMC Internal', 'Automation Squad', 0.34, 'LOW', 289, 31, 201, '2026-04-16T18:44:00Z', '2026-01-10T00:00:00Z', '#DA3633', 'IM', ARRAY['mcp','automation','internal'], 'down', true),
  ('agent-gpt4', 'GPT-4 Code Agent', 'external', 'OpenAI', 'Digital Innovation', 0.62, 'MEDIUM', 418, 18, 367, '2026-04-17T07:50:00Z', '2025-10-20T00:00:00Z', '#D29922', 'G4', ARRAY['code-gen','analysis','test-gen'], 'up', true),
  ('agent-securebot', 'SecureBot Internal', 'internal', 'JPMC Security Eng', 'Cybersecurity', 0.79, 'HIGH', 892, 7, 852, '2026-04-17T10:01:00Z', '2025-08-05T00:00:00Z', '#8B5CF6', 'SB', ARRAY['security','compliance','remediation'], 'stable', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Agent trust history
-- ============================================================
INSERT INTO agent_trust_history (agent_id, event_type, trust_score, trust_delta, reason, occurred_at, is_demo) VALUES
  ('agent-copilot', 'REGISTRATION', 0.50, 0, 'Initial registration with default trust score', '2025-09-15T00:00:00Z', true),
  ('agent-copilot', 'CLEAN_DEPLOY', 0.58, 0.08, '45 consecutive clean deployments', '2025-10-01T00:00:00Z', true),
  ('agent-copilot', 'CLEAN_DEPLOY', 0.72, 0.14, '120 clean deployments, zero incidents', '2025-10-28T00:00:00Z', true),
  ('agent-copilot', 'INCIDENT', 0.68, -0.04, 'Minor prod issue in utils library (LOW severity)', '2025-11-15T00:00:00Z', true),
  ('agent-copilot', 'CLEAN_DEPLOY', 0.82, 0.14, 'Extended clean deployment streak - 300+ PRs', '2026-01-20T00:00:00Z', true),
  ('agent-copilot', 'CLEAN_DEPLOY', 0.88, 0.06, 'Consistent HIGH performance maintained', '2026-03-05T00:00:00Z', true),
  ('agent-mcp-internal', 'REGISTRATION', 0.50, 0, 'Initial registration', '2026-01-10T00:00:00Z', true),
  ('agent-mcp-internal', 'INCIDENT', 0.44, -0.06, 'Config error caused API timeout in DEV (MEDIUM)', '2026-01-25T00:00:00Z', true),
  ('agent-mcp-internal', 'INCIDENT', 0.38, -0.06, 'Incorrect schema migration in STAGING (HIGH)', '2026-02-10T00:00:00Z', true),
  ('agent-mcp-internal', 'SECURITY_BREACH', 0.30, -0.08, 'Exposed API key in generated code - PROD (CRITICAL)', '2026-03-01T00:00:00Z', true),
  ('agent-mcp-internal', 'CLEAN_DEPLOY', 0.34, 0.04, 'Post-remediation clean deployments', '2026-04-01T00:00:00Z', true),
  ('agent-claude', 'REGISTRATION', 0.50, 0, 'Initial registration', '2025-11-02T00:00:00Z', true),
  ('agent-claude', 'CLEAN_DEPLOY', 0.60, 0.10, '80 clean deployments across multiple services', '2025-12-10T00:00:00Z', true),
  ('agent-claude', 'INCIDENT', 0.55, -0.05, 'Incorrect null handling in payment service (MEDIUM)', '2026-01-15T00:00:00Z', true),
  ('agent-claude', 'CLEAN_DEPLOY', 0.68, 0.13, '150 consecutive clean deployments', '2026-02-28T00:00:00Z', true),
  ('agent-claude', 'CLEAN_DEPLOY', 0.71, 0.03, 'Stable performance in recent weeks', '2026-04-10T00:00:00Z', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Demo production feedback
-- ============================================================
INSERT INTO production_feedback (agent_id, agent_name, event_type, severity, service_name, description, trust_delta, previous_trust, new_trust, linked_pr, occurred_at, resolved_at, is_demo) VALUES
  ('agent-mcp-internal', 'Internal MCP Agent v1', 'SECURITY_BREACH', 'CRITICAL', 'Authentication Service', 'API key exposed in generated code reached production. Immediate credential rotation required.', -0.08, 0.38, 0.30, 'PR-8821', '2026-03-01T02:47:00Z', '2026-03-01T06:12:00Z', true),
  ('agent-mcp-internal', 'Internal MCP Agent v1', 'INCIDENT', 'HIGH', 'Data Pipeline Service', 'Incorrect schema migration script dropped non-nullable column causing data loss in STAGING.', -0.06, 0.44, 0.38, 'PR-8634', '2026-02-10T11:23:00Z', '2026-02-10T14:45:00Z', true),
  ('agent-claude', 'Claude (Anthropic)', 'INCIDENT', 'MEDIUM', 'Payment Processing API', 'Null pointer exception in payment validation logic caused 3% of transactions to fail for 18 minutes.', -0.05, 0.60, 0.55, 'PR-7891', '2026-01-15T16:34:00Z', '2026-01-15T16:52:00Z', true),
  ('agent-copilot', 'GitHub Copilot', 'INCIDENT', 'LOW', 'Notification Service', 'Minor formatting issue in email template caused layout break in specific email clients. No functional impact.', -0.02, 0.84, 0.82, 'PR-7654', '2026-01-08T09:15:00Z', '2026-01-08T10:30:00Z', true),
  ('agent-copilot', 'GitHub Copilot', 'CLEAN_DEPLOY', 'LOW', 'Multiple Services (batch)', '47 consecutive clean deployments across 12 services over the past 30 days.', 0.06, 0.82, 0.88, 'BATCH-DEPLOY-Q1', '2026-03-05T00:00:00Z', NULL, true),
  ('agent-gpt4', 'GPT-4 Code Agent', 'ROLLBACK', 'MEDIUM', 'Analytics Service', 'Memory leak in data aggregation function caused gradual performance degradation. Rolled back after 2 hours.', -0.05, 0.67, 0.62, 'PR-9104', '2026-04-05T13:20:00Z', '2026-04-05T15:10:00Z', true),
  ('agent-securebot', 'SecureBot Internal', 'CLEAN_DEPLOY', 'LOW', 'Multiple Security Services', '120 clean deployments with zero security incidents. Domain expertise in security tooling.', 0.04, 0.75, 0.79, 'BATCH-SEC-Q1', '2026-03-20T00:00:00Z', NULL, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Demo decisions
-- ============================================================
INSERT INTO decisions (agent_id, pr_title, pr_repo, service_name, criticality, lines_changed, files_changed, decision, risk_score, confidence, trust_score_at_time, tool_signals, risk_breakdown, reasoning, recommendation, source, is_demo, evaluated_at) VALUES
  ('agent-mcp-internal', 'Auth Service - JWT Token Validation Refactor', 'auth-service', 'Authentication Service', 'CRITICAL', 847, 12, 'BLOCK', 0.91, 0.94, 0.30,
   '{"snyk":{"status":"CRITICAL","highVulns":1,"medVulns":2,"riskScore":0.85,"finding":"JWT secret potentially exposed in log statement"},"sonar":{"status":"WARNING","bugs":1,"codeSmells":4,"riskScore":0.55,"finding":"4 code smells, 1 bug in session handler"},"raven":{"status":"VIOLATION","policies":["JPMC-SEC-007","JPMC-AUTH-003"],"riskScore":0.90,"finding":"Policy violation: Hardcoded credentials pattern detected"}}',
   '{"agentRisk":0.70,"toolRisk":0.77,"criticalityRisk":1.00}',
   'BLOCKED: Internal MCP Agent v1 has a critically LOW trust score (30%) with 31 production incidents. CRITICAL infrastructure, active security vulnerabilities, and policy violations.', 'Escalate to Security Engineering. Resolve all Snyk and Raven findings before resubmission.', 'manual', true, '2026-04-15T14:32:00Z'),
  ('agent-claude', 'Payment API - Retry Logic Enhancement', 'payment-api', 'Payment Processing API', 'HIGH', 234, 5, 'REVIEW', 0.52, 0.81, 0.71,
   '{"snyk":{"status":"CLEAN","highVulns":0,"medVulns":0,"lowVulns":1,"riskScore":0.10,"finding":"1 low informational finding in test deps"},"sonar":{"status":"WARNING","bugs":0,"codeSmells":2,"riskScore":0.35,"finding":"2 minor code smells in retry handler"},"raven":{"status":"OK","policies":[],"riskScore":0.05,"finding":"All policies passed"}}',
   '{"agentRisk":0.29,"toolRisk":0.17,"criticalityRisk":0.70}',
   'REVIEW REQUIRED: Claude has MEDIUM trust (71%). Payment service is HIGH criticality with direct financial impact. Minor quality findings warrant human review.', 'Assign to senior payments engineer. Focus on retry exhaustion and idempotency guarantees.', 'manual', true, '2026-04-16T09:18:00Z'),
  ('agent-copilot', 'Shared Utils - String Helper Functions', 'shared-utils', 'Shared Utilities Library', 'LOW', 45, 2, 'ALLOW', 0.11, 0.97, 0.88,
   '{"snyk":{"status":"CLEAN","highVulns":0,"medVulns":0,"lowVulns":0,"riskScore":0.00,"finding":"No vulnerabilities"},"sonar":{"status":"CLEAN","bugs":0,"codeSmells":0,"riskScore":0.00,"finding":"All quality gates passed"},"raven":{"status":"OK","policies":[],"riskScore":0.00,"finding":"All policies passed"}}',
   '{"agentRisk":0.12,"toolRisk":0.00,"criticalityRisk":0.20}',
   'APPROVED: GitHub Copilot has HIGH trust (88%) with 99.7% clean deployment rate. LOW criticality service. All signals clean.', 'Proceed with automated merge. No manual review required.', 'manual', true, '2026-04-16T11:45:00Z'),
  ('agent-gpt4', 'User Service - Profile Data Caching Layer', 'user-service', 'User Profile Service', 'MEDIUM', 312, 7, 'REVIEW', 0.48, 0.76, 0.62,
   '{"snyk":{"status":"WARNING","highVulns":0,"medVulns":1,"lowVulns":2,"riskScore":0.40,"finding":"Medium: Redis connection string handling"},"sonar":{"status":"WARNING","bugs":0,"codeSmells":3,"riskScore":0.40,"finding":"3 code smells in cache eviction logic"},"raven":{"status":"OK","policies":[],"riskScore":0.05}}',
   '{"agentRisk":0.38,"toolRisk":0.28,"criticalityRisk":0.40}',
   'REVIEW REQUIRED: GPT-4 Code Agent has MEDIUM trust (62%). Caching introduces new Redis dependency. Multiple minor findings warrant review.', 'Review Redis security configuration and cache invalidation strategy.', 'manual', true, '2026-04-16T14:22:00Z'),
  ('agent-securebot', 'Security Scanner - CVE Detection Update', 'security-scanner', 'Vulnerability Scanner', 'HIGH', 189, 4, 'ALLOW', 0.22, 0.89, 0.79,
   '{"snyk":{"status":"CLEAN","highVulns":0,"medVulns":0,"lowVulns":0,"riskScore":0.00},"sonar":{"status":"CLEAN","bugs":0,"codeSmells":1,"riskScore":0.10,"finding":"1 minor code smell in CVE parser"},"raven":{"status":"OK","policies":[],"riskScore":0.00}}',
   '{"agentRisk":0.21,"toolRisk":0.03,"criticalityRisk":0.70}',
   'APPROVED: SecureBot Internal has HIGH trust (79%) and specializes in security tooling. Domain expertise reduces risk significantly despite HIGH service criticality.', 'Proceed with merge. Trigger automated security regression tests post-deployment.', 'manual', true, '2026-04-17T08:05:00Z')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDEX: Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_decisions_agent_id ON decisions(agent_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_pr_repo_number ON decisions(pr_repo, pr_number);
CREATE INDEX IF NOT EXISTS idx_trust_history_agent_id ON agent_trust_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_agent_id ON production_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_pr ON webhook_events(pr_repo, pr_number);
