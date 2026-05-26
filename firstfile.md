# 🎯 ARIA Workspace Setup: First Prompt for Copilot/Claude Opus

Copy and paste this **exact prompt** into your IDE's AI assistant (VS Code Copilot, Cursor, or Claude Desktop) to bootstrap your ARIA workspace:

---

```markdown
# ARIA WORKSPACE INITIALIZATION PROMPT

You are an expert enterprise architect and senior engineer helping me set up the ARIA FinOps + ACES platform workspace.

## Context
I am building ARIA (Adaptive Risk Intelligence for AI Agents) — a production-grade governance and cost intelligence platform with these constraints:
- Stack: Java 21, Spring Boot 3.3, Spring AI 1.0, Oracle 23c Autonomous DB, React 18, TypeScript
- Architecture: SDD (Spec-Driven Development), plugin-based, Oracle VPD for isolation
- Key modules: Cost Intelligence Engine, Trust-Cost Feedback Loop, Executive FinOps Dashboard, ACES MCP execution
- Compliance: SOX/DORA audit trail, 7-year retention, PII-safe, developer-access only (no DBA privileges)

## Your Task
Help me initialize my workspace by generating the following artifacts IN ORDER. Wait for my confirmation after each step before proceeding.

### STEP 1: Project Structure & Root Files
Generate:
1. `justfile` — orchestration pipeline with targets: validate-env, generate-code, build-artifacts, deploy-pilot, validate-e2e, demo
2. `.env.example` — environment template with Oracle wallet path, Supabase ref, K8s namespace, signing key placeholders
3. `README.md` — project overview, quick start, architecture diagram reference
4. Directory structure:
   ```
   aria-workspace/
   ├── specs/                    # SDD contracts
   ├── src/                      # React frontend + shared libs
   ├── backend/                  # Spring Boot modules
   ├── k8s/                      # Kubernetes manifests
   ├── supabase/                 # Migrations + RLS policies
   ├── oracle/                   # DDL scripts (developer-access safe)
   ├── plugins/                  # IDE plugin sources
   ├── scripts/                  # Bash utility scripts
   └── docs/                     # Architecture, runbooks, compliance
   ```

### STEP 2: SDD Spec Contracts
Generate these JSON/YAML specs with strict validation schemas:
1. `specs/skill-manifest.spec.json` — FinOps skill contract (input/output, configSchema, permissions)
2. `specs/ide-interceptor.contract.yaml` — OpenAPI 3.1 spec for IDE ↔ ARIA API
3. `specs/trust-cost-feedback.schema.json` — JSON Schema for cost → trust score mapping

### STEP 3: Oracle 23c Schema (Developer Access)
Generate `oracle/01_finops_schema.sql` with:
- `aria_model_pricing` table (dynamic pricing catalog)
- `aria_cost_ledger` table (partitioned by month, virtual cost columns)
- `aria_agent_dna` extensions (cost_efficiency_score, total_cost_usd, budget fields)
- Indexes for executive queries (LOB, agent, model, timestamp)
- Seed data for Anthropic/OpenAI model pricing
- NO DBMS_RLS/VPD calls — app-layer isolation only

### STEP 4: Spring Boot Module Scaffold
Generate `backend/aria-finops-api/build.gradle.kts` and package structure:
```
com.jpmc.aria.finops/
├── advisor/
│   └── AriaCostInterceptor.java  (ChatClientAdvisor, <8ms overhead)
├── model/
│   ├── CostTransaction.java
│   ├── CostMetrics.java
│   └── BudgetStatus.java
├── repository/
│   ├── CostLedgerRepository.java
│   └── AgentDnaRepository.java
├── service/
│   ├── PricingCatalog.java
│   ├── BudgetGovernor.java
│   └── OptimizationEngine.java
└── config/
    └── OracleConfig.java  (ADB wallet connection, no DBA privileges)
```

### STEP 5: React Dashboard Component
Generate `src/pages/ExecutiveFinOps.tsx` with:
- 4 KPI cards (Total Cost, Savings Realized, Governance Impact, Anomalies)
- LOB breakdown chart (Digital Banking, Risk, Payments, Trading)
- Optimization impact table (Model Downgrade, Compression, Cache, Pruning)
- Governance decision grid (BLOCK/REVIEW/ALLOW)
- Tailwind CSS styling, Lucide React icons, TypeScript types

### STEP 6: Validation Scripts
Generate `scripts/00-validate-env.sh` that checks:
- Oracle wallet connectivity (developer credentials only)
- Supabase project access
- Kubectl context + namespace
- Node/Java toolchain
- SDD spec presence

## Constraints
- All code must be production-ready: type-safe, error-handled, logged
- Never include hardcoded secrets — use environment variables or secret managers
- Oracle DDL must work with developer-level privileges only (no DBMS_RLS, no ALTER SYSTEM)
- Latency: CostInterceptor pre-check ≤8ms, async post-processing only
- Security: App-layer LOB isolation via JWT claims + repository filters

## Output Format
For each step:
1. Show the file path
2. Provide the complete file content in a code block
3. Add brief comments explaining critical sections
4. Wait for my "✅ Step N complete" before proceeding to next step

Begin with STEP 1 now.
```

---

## 🚀 How to Use This Prompt

1. **Open your IDE** (VS Code with Copilot, Cursor, or Claude Desktop)
2. **Create a new folder**: `aria-workspace/`
3. **Open a new chat** with your AI assistant
4. **Paste the prompt above** exactly as written
5. **Review each generated artifact** before confirming with "✅ Step N complete"
6. **Commit incrementally** to Git after each approved step

---

## ✅ Expected First Output (Step 1 Preview)

Your AI should generate a `justfile` like this:

```justfile
# ARIA FinOps + ACES — Orchestration Pipeline
export ARIA_ENV ?= pilot
export ARIA_LOB ?= DIGITAL_BANKING
export ORACLE_WALLET_PATH ?= ./wallet/aria-pilot
export K8S_NAMESPACE ?= aria-pilot

all: validate-env generate-code build-artifacts deploy-pilot validate-e2e
	@echo "✅ FULL PIPELINE COMPLETE"

validate-env:
	@bash scripts/00-validate-env.sh --oracle-wallet={{ORACLE_WALLET_PATH}}

generate-code:
	@bash scripts/01-generate-code.sh --specs-dir=./specs

# ... (additional targets)
```

---

## 🔑 Pro Tips for Best Results

| Tip | Why It Matters |
|-----|---------------|
| **Use "Wait for confirmation"** | Prevents the AI from generating everything at once (quality control) |
| **Specify "developer-access only"** | Ensures Oracle DDL won't require DBA privileges |
| **Include latency constraints** | Forces the AI to design async patterns, not blocking calls |
| **Request TypeScript + Tailwind** | Guarantees type-safe, production-ready frontend code |
| **Ask for brief comments** | Helps you understand critical sections without clutter |

---

## 🔄 If the AI Deviates

If the assistant starts generating code out of order or ignores constraints:

```
🛑 STOP. Please follow the prompt exactly:
1. Generate ONLY Step 1 artifacts now
2. Wait for my "✅ Step 1 complete" before proceeding
3. Ensure Oracle DDL uses only developer-accessible commands (no DBMS_RLS)
4. Keep CostInterceptor pre-check ≤8ms overhead

Retry Step 1 now.
```

---

**Your workspace initialization starts now.** Paste the prompt, review each artifact, and build your ARIA platform step-by-step with confidence. 🚀
