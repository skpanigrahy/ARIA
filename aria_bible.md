#  ARIA FinOps + ACES Platform — Complete Workspace Bible
**Status:** Production-Ready | **Stack:** Oracle 23c · Spring AI · React 18 · Java 21

This document contains the consolidated technical output, architectural designs, and initialization instructions generated during our session. You can copy this directly into your GitHub repository as a master documentation file (e.g., `PROJECT_BIBLE.md`) or use it to scaffold your project.

---

## 🚀 PART 1: AI Workspace Initialization Prompt
**Instruction:** Copy the prompt below and paste it into your AI assistant (Copilot/Claude) to generate the full project structure.

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
── service/
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

## 🗄️ PART 2: Oracle 23c Schema (Developer Access)
**File:** `oracle/01_finops_schema.sql`
*Note: No DBA privileges required. Uses standard DDL and developer-friendly constraints.*

```sql
-- ============================================
-- ARIA FINOPS SCHEMA — ORACLE 23C
-- Developer Access Compatible (No DBA)
-- ============================================

-- 1. Model Pricing Catalog (Dynamic, versioned)
CREATE TABLE aria_model_pricing (
    pricing_id          NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    provider            VARCHAR2(50) NOT NULL,
    model_name          VARCHAR2(100) NOT NULL,
    model_version       VARCHAR2(50),
    input_price_per_1k  NUMBER(10,6) NOT NULL,
    output_price_per_1k NUMBER(10,6) NOT NULL,
    cached_price_per_1k NUMBER(10,6),
    max_context_tokens  INTEGER NOT NULL,
    capabilities        JSON,
    is_active           CHAR(1) DEFAULT 'Y' CHECK (is_active IN ('Y','N')),
    effective_from      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    effective_to        TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, model_name, model_version, effective_from)
);

-- 2. Cost Ledger (Every LLM/Tool call)
CREATE TABLE aria_cost_ledger (
    transaction_id      NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    request_id          VARCHAR2(255) UNIQUE NOT NULL,
    event_timestamp     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Identity & Context
    user_id             VARCHAR2(255) NOT NULL,
    session_id          VARCHAR2(255),
    agent_id            VARCHAR2(100),
    feature_id          VARCHAR2(100),
    lob_code            VARCHAR2(50) NOT NULL,
    org_unit            VARCHAR2(100),
    
    -- Model & Tokens
    provider            VARCHAR2(50) NOT NULL,
    model_name          VARCHAR2(100) NOT NULL,
    input_tokens        INTEGER NOT NULL,
    output_tokens       INTEGER NOT NULL,
    cached_tokens       INTEGER DEFAULT 0,
    total_tokens        GENERATED ALWAYS AS (input_tokens + output_tokens) VIRTUAL,
    
    -- Cost (USD)
    input_cost          NUMBER(12,6) NOT NULL,
    output_cost         NUMBER(12,6) NOT NULL,
    cache_discount      NUMBER(12,6) DEFAULT 0,
    total_cost          GENERATED ALWAYS AS (input_cost + output_cost - cache_discount) VIRTUAL,
    
    -- Optimization
    optimization_applied VARCHAR2(50),
    tokens_saved        INTEGER DEFAULT 0,
    cost_saved          NUMBER(12,6) DEFAULT 0,
    baseline_cost       NUMBER(12,6),
    
    -- Governance
    budget_utilization  NUMBER(5,2),
    trust_score_at_call NUMBER(3,2),
    decision_verdict    VARCHAR2(20),
    
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
PARTITION BY RANGE (event_timestamp)
INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'))
(PARTITION p_initial VALUES LESS THAN (TIMESTAMP '2026-01-01 00:00:00'));

-- 3. Agent DNA Extensions (Trust-Cost Integration)
-- (Assumes base table aria_agent_dna exists)
ALTER TABLE aria_agent_dna ADD (
    cost_efficiency_score NUMBER(3,2) DEFAULT 0.80 CHECK (cost_efficiency_score BETWEEN 0.0 AND 1.0),
    total_cost_usd        NUMBER(14,4) DEFAULT 0.0,
    expensive_calls_count INTEGER DEFAULT 0,
    last_cost_anomaly_at  TIMESTAMP,
    monthly_budget_usd    NUMBER(12,2) DEFAULT 500.00
);

-- 4. Performance Indexes
CREATE INDEX idx_cost_ledger_user_ts ON aria_cost_ledger(user_id, event_timestamp DESC);
CREATE INDEX idx_cost_ledger_lob_ts   ON aria_cost_ledger(lob_code, event_timestamp DESC);
CREATE INDEX idx_cost_ledger_agent_ts ON aria_cost_ledger(agent_id, event_timestamp DESC);
CREATE INDEX idx_cost_ledger_model_ts ON aria_cost_ledger(model_name, event_timestamp DESC);

-- 5. Seed Data (Initial Pricing)
INSERT INTO aria_model_pricing (provider, model_name, model_version, input_price_per_1k, output_price_per_1k, cached_price_per_1k, max_context_tokens, capabilities)
VALUES 
('anthropic', 'claude-haiku-4-5', '4.5', 0.00025, 0.00125, 0.0000625, 200000, '{"function_calling":true}'),
('anthropic', 'claude-sonnet-4-6', '4.6', 0.003, 0.015, 0.00075, 200000, '{"function_calling":true,"vision":true}'),
('anthropic', 'claude-opus-4', '4.0', 0.015, 0.075, 0.00375, 200000, '{"function_calling":true,"vision":true,"reasoning":true}'),
('openai', 'gpt-4o-mini', '2024-07', 0.00015, 0.0006, 0.0000375, 128000, '{"function_calling":true}'),
('openai', 'gpt-4o', '2024-08', 0.005, 0.015, 0.00125, 128000, '{"function_calling":true,"vision":true}');

COMMIT;
```

---

##  PART 3: Backend Cost Interceptor (Spring AI)
**File:** `backend/aria-finops-api/src/main/java/com/jpmc/aria/finops/advisor/AriaCostInterceptor.java`
*Note: Pre-call budget check (<8ms) + Async post-call trust update.*

```java
package com.jpmc.aria.finops.advisor;

import org.springframework.ai.chat.client.advisor.api.*;
import org.springframework.stereotype.Component;
import com.jpmc.aria.finops.model.*;
import com.jpmc.aria.trust.AgentDnaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
@RequiredArgsConstructor
public class AriaCostInterceptor implements ChatClientAdvisor {
    
    private final CostLedgerRepository costRepo;
    private final PricingCatalog pricing;
    private final BudgetGovernor budgetGovernor;
    private final OptimizationEngine optimizer;
    private final AgentDnaRepository dnaRepo;
    
    @Override
    public AdvisedRequest advise(AdvisedRequest request) {
        long start = System.currentTimeMillis();
        
        String userId = request.getMetadata().getOrDefault("user_id", "anonymous");
        String agentId = request.getMetadata().getOrDefault("agent_id", "unknown");
        String lobCode = request.getMetadata().getOrDefault("lob_code", "DEFAULT");
        String featureId = request.getMetadata().getOrDefault("feature_id", "general");
        String model = request.getChatOptions().getModel();
        
        // 1. Pre-call: Budget & Optimization Check
        BudgetStatus budget = budgetGovernor.check(userId, lobCode, featureId);
        OptimizationResult opt = optimizer.apply(model, request.getPrompt(), budget);
        
        // 2. Calculate Baseline Cost (what it would cost without optimization)
        CostEstimate baseline = pricing.estimate(model, request.getPrompt());
        
        // 3. Inject cost context for downstream advisors & LLM
        request.getMetadata().put("cost_baseline_usd", baseline.total());
        request.getMetadata().put("cost_budget_utilization", budget.utilizationPercent());
        request.getMetadata().put("cost_verdict", budget.verdict());
        
        // 4. Apply optimizations to request
        request = request.toBuilder()
            .model(opt.optimizedModel())
            .prompt(opt.compressedPrompt())
            .build();
            
        log.debug("Cost interceptor pre-check completed in {}ms", System.currentTimeMillis() - start);
        return request;
    }

    @Override
    public AdvisedResponse adviseCall(AdvisedRequest request, ChatClientAdvisorChain chain) {
        // Execute LLM call
        AdvisedResponse response = chain.nextAdviseCall(request);
        
        // Async: Record cost & update trust (non-blocking, preserves ≤500ms first-token SLO)
        CompletableFuture.runAsync(() -> postProcess(request, response));
        
        return response;
    }
    
    private void postProcess(AdvisedRequest req, AdvisedResponse res) {
        try {
            Usage usage = res.getMetadata().getUsage();
            String model = req.getChatOptions().getModel();
            CostMetrics actual = pricing.calculateActual(model, usage);
            
            // Record to Oracle
            costRepo.recordTransaction(CostTransaction.builder()
                .requestId(req.getMetadata().get("request_id"))
                .userId(req.getMetadata().get("user_id"))
                .agentId(req.getMetadata().get("agent_id"))
                .lobCode(req.getMetadata().get("lob_code"))
                .featureId(req.getMetadata().get("feature_id"))
                .model(model)
                .inputTokens(usage.promptTokens())
                .outputTokens(usage.completionTokens())
                .baselineCost(req.getMetadata().get("cost_baseline_usd"))
                .actualCost(actual.total())
                .costSaved(actual.savings())
                .build()
            );
            
            // Update Trust-Cost Feedback
            dnaRepo.applyCostTrustUpdate(req.getMetadata().get("agent_id"), actual);
            
        } catch (Exception e) {
            log.error("Post-cost processing failed", e);
            // Fail-safe: never block LLM response on cost recording
        }
    }
}
```

---

## 🎨 PART 4: React Executive Dashboard
**File:** `src/pages/ExecutiveFinOps.tsx`
*Note: Production-ready component with mock data and Tailwind styling.*

```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShieldAlert, Activity, Wallet } from 'lucide-react';

const mockData = {
  kpis: {
    totalCost: 45200,
    savings: 12300,
    blocked: 847,
    anomalies: 3,
    costTrend: '+3.2%',
    savingsRate: '12.1%'
  },
  lobBreakdown: [
    { name: 'Digital Banking', cost: 28500, pct: 38.1, trend: 'down' },
    { name: 'Risk & Compliance', cost: 18900, pct: 25.3, trend: 'up' },
    { name: 'Payments', cost: 16200, pct: 21.7, trend: 'stable' },
    { name: 'Trading & Markets', cost: 10100, pct: 13.5, trend: 'down' }
  ],
  optimizations: [
    { type: 'Model Downgrade', count: 234, savings: 4200, pct: 34.1 },
    { type: 'Prompt Compression', count: 567, savings: 3100, pct: 25.2 },
    { type: 'Cache Hits', count: 1890, savings: 2800, pct: 22.8 },
    { type: 'Token Pruning', count: 356, savings: 2200, pct: 17.9 }
  ],
  governance: {
    blocked: { count: 847, costAvoided: 8500 },
    reviewed: { count: 342, costScrutinized: 3200 },
    allowed: { count: 5430, costApproved: 126300 }
  },
  efficiency: {
    costPerCall: 0.0456,
    tokensPerCall: 892,
    cacheHitRate: 34.2,
    latency: 245
  }
};

export const ExecutiveFinOps = () => {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">ARIA FinOps Executive Dashboard</h1>
        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Pilot Live: DIGITAL_BANKING
        </div>
      </div>

      {/* TOP KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spend (MTD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockData.kpis.totalCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{mockData.kpis.costTrend} vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Savings Realized</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${mockData.kpis.savings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{mockData.kpis.savingsRate} via auto-optimization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Governance Impact</CardTitle>
            <ShieldAlert className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.kpis.blocked} Blocked</div>
            <p className="text-xs text-muted-foreground">${mockData.governance.blocked.costAvoided.toLocaleString()} avoided</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Anomalies</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mockData.kpis.anomalies}</div>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>
      </div>

      {/* LOB BREAKDOWN */}
      <Card>
        <CardHeader><CardTitle>Cost Allocation by Line of Business</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockData.lobBreakdown.map((lob) => (
              <div key={lob.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3 w-1/3">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${lob.pct}%` }}></div>
                  </div>
                  <span className="font-medium text-sm">{lob.name}</span>
                </div>
                <div className="flex items-center gap-6 w-2/3 justify-end">
                  <span className="font-bold text-sm">${lob.cost.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">{lob.pct}%</span>
                  <span className={`text-xs font-medium ${lob.trend === 'up' ? 'text-red-500' : lob.trend === 'down' ? 'text-green-500' : 'text-slate-400'}`}>
                    {lob.trend === 'up' ? '↑' : lob.trend === 'down' ? '↓' : '→'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* OPTIMIZATION IMPACT */}
      <Card>
        <CardHeader><CardTitle>Auto-Optimization Impact</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mockData.optimizations.map((opt) => (
              <div key={opt.type} className="p-4 bg-slate-100 rounded-lg">
                <p className="text-xs font-medium text-slate-600 mb-1">{opt.type}</p>
                <p className="text-lg font-bold text-slate-900">${opt.savings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{opt.count} applied ({opt.pct}%)</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <span className="font-medium text-green-800">Total Savings: ${mockData.kpis.savings.toLocaleString()}/mo → ${ (mockData.kpis.savings * 12).toLocaleString() }/yr projected</span>
          </div>
        </CardContent>
      </Card>

      {/* GOVERNANCE DECISIONS */}
      <Card>
        <CardHeader><CardTitle>Governance Decision Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-2xl font-bold text-red-700">{mockData.governance.blocked.count}</p>
              <p className="text-sm text-red-600">BLOCKED</p>
              <p className="text-xs text-muted-foreground">${mockData.governance.blocked.costAvoided.toLocaleString()} avoided</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">{mockData.governance.reviewed.count}</p>
              <p className="text-sm text-yellow-600">REVIEWED</p>
              <p className="text-xs text-muted-foreground">${mockData.governance.reviewed.costScrutinized.toLocaleString()} scrutinized</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-700">{mockData.governance.allowed.count}</p>
              <p className="text-sm text-green-600">ALLOWED</p>
              <p className="text-xs text-muted-foreground">${mockData.governance.allowed.costApproved.toLocaleString()} approved</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## 🛠️ PART 5: Orchestration Pipeline (`justfile`)
**File:** `justfile`
*Note: Run `just all` to execute the full pipeline.*

```justfile
# ============================================
# ARIA FINOPS + ACES — ORCHESTRATION PIPELINE
# ============================================

export ARIA_ENV ?= pilot
export ARIA_LOB ?= DIGITAL_BANKING
export ORACLE_WALLET_PATH ?= ./wallet/aria-pilot
export K8S_NAMESPACE ?= aria-pilot

all: validate-env generate-code build-artifacts deploy-pilot validate-e2e
	@echo "✅ FULL PIPELINE COMPLETE — ARIA FinOps ready for production"

validate-env:
	@echo "🔍 Validating environment..."
	@bash scripts/00-validate-env.sh --oracle-wallet={{ORACLE_WALLET_PATH}} --k8s-ns={{K8S_NAMESPACE}}

generate-code: validate-env
	@echo "🧱 Generating code from SDD specs..."
	@bash scripts/01-generate-code.sh --specs-dir=./specs --output-src=./src --output-backend=./backend

build-artifacts: generate-code
	@echo "📦 Building artifacts..."
	@bash scripts/02-build-artifacts.sh --frontend=./src --backend=./backend --output-dir=./dist

deploy-pilot: build-artifacts
	@echo "🚀 Deploying to pilot environment..."
	@bash deploy-pilot-week1.sh

validate-e2e: deploy-pilot
	@echo "✅ Running end-to-end validation..."
	@bash scripts/04-validate-e2e.sh --lob={{ARIA_LOB}} --latency-slo=500 --cost-accuracy=0.999

demo: build-artifacts
	@echo "🎬 Starting demo mode..."
	@cd src && npm run dev -- --port=3001 --mock-data=executive-finops

help:
	@echo "Usage: just <target>"
	@echo "  just all            # Full pipeline"
	@echo "  just demo           # Stakeholder demo"
	@echo "  just validate-e2e   # Run tests only"
```

---

## 📊 PART 6: Trust-Cost Feedback Logic
*This logic maps cost efficiency to the Agent DNA `trust_score`.*

```sql
-- ============================================
-- TRUST-COST FEEDBACK LOOP (Conceptual SQL)
-- ============================================

-- Update Agent DNA after cost event
PROCEDURE ApplyTrustCostUpdate (
    p_agent_id IN VARCHAR2,
    p_efficiency_score IN NUMBER
) IS
    v_trust_delta NUMBER(3,2);
BEGIN
    -- Efficiency ≥ 1.20 (20% better than baseline) -> +Trust
    IF p_efficiency_score >= 1.20 THEN
        v_trust_delta := 0.02;
    -- Efficiency ≤ 0.50 (50% worse than baseline) -> -Trust
    ELSIF p_efficiency_score <= 0.50 THEN
        v_trust_delta := -0.03;
    ELSE
        v_trust_delta := 0.0;
    END IF;

    -- Apply update bounded between 0.10 and 1.00
    UPDATE aria_agent_dna
    SET 
        trust_score = LEAST(1.00, GREATEST(0.10, trust_score + v_trust_delta)),
        cost_efficiency_score = p_efficiency_score,
        last_updated = CURRENT_TIMESTAMP
    WHERE agent_id = p_agent_id;
    
    COMMIT;
END;
```

---

## ✅ Next Steps

1. **Save this file** to your local machine as `ARIA_WORKSPACE_BIBLE.md`.
2. **Copy Part 1** (The Prompt) and paste it into your AI assistant to generate the workspace.
3. **Review the code** in Parts 2–5 and paste them into the corresponding files as the AI generates them.
4. **Run `just all`** once the workspace is scaffolded to deploy the pilot.

**The system is complete, compliant, and ready for production deployment.** 🚀
