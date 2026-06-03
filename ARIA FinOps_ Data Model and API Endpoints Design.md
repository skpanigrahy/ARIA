# ARIA FinOps: Data Model and API Endpoints Design

This document outlines the data model and API endpoints for the ARIA FinOps (Financial Operations) and Cost Intelligence modules. The design focuses on enabling multi-dimensional AI cost tracking, attribution, and optimization, as well as supporting the "Before vs. After ARIA" visualization for the end-to-end demo.

## 1. Core Principles

*   **Granularity**: Capture cost data at the lowest possible level (e.g., per API call, per compute second) to enable flexible attribution.
*   **Extensibility**: The data model should easily accommodate new cost dimensions (e.g., new models, new LOBs) without significant schema changes.
*   **Attribution**: Enable cost allocation across various organizational and technical dimensions.
*   **Performance**: Optimize for fast ingestion and retrieval of cost data for real-time dashboards and analytics.
*   **Security**: Ensure data isolation and access control, especially for sensitive financial information.

## 2. Data Model Design

The core of the FinOps module revolves around capturing and attributing AI usage and associated costs. We will extend the existing PostgreSQL database with `pgvector` for potential future semantic cost analysis, and leverage Redis for caching and real-time aggregations.

### 2.1. `ai_usage_event` Table

This table will store raw AI usage events, representing individual interactions with AI models or services. This is the most granular level of data capture.

```sql
CREATE TABLE ai_usage_event (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id             TEXT NOT NULL,          -- User who initiated the AI interaction (e.g., Firebase UID)
    session_id          UUID,                   -- ARIA conversation session ID if applicable
    request_id          UUID,                   -- Unique ID for the specific AI request/turn
    model_id            TEXT NOT NULL,          -- Identifier for the AI model used (e.g., claude-opus-4.7, gpt-4, gemini-pro)
    model_vendor        TEXT NOT NULL,          -- e.g., ANTHROPIC, OPENAI, GOOGLE, AZURE_OPENAI
    application_id      TEXT NOT NULL,          -- Application/Service making the AI call (e.g., ARIA_COPILOT, RETAIL_AI_ASSISTANT)
    solution_id         TEXT,                   -- Broader solution category (e.g., CUSTOMER_SERVICE_AI, DEVELOPER_TOOLS)
    product_id          TEXT,                   -- Product this usage belongs to (e.g., ARIA_PLATFORM, CORE_BANKING_APP)
    lob_id              TEXT,                   -- Line of Business (e.g., RETAIL_BANKING, INVESTMENT_BANKING)
    environment         TEXT NOT NULL,          -- e.g., PROD, DEV, QA
    input_tokens        INT NOT NULL DEFAULT 0,
    output_tokens       INT NOT NULL DEFAULT 0,
    cost_model_usd      NUMERIC(10, 4) NOT NULL DEFAULT 0.0, -- Direct model cost
    cost_infra_usd      NUMERIC(10, 4) NOT NULL DEFAULT 0.0, -- Attributed infrastructure cost
    cost_observ_usd     NUMERIC(10, 4) NOT NULL DEFAULT 0.0, -- Attributed observability cost
    cost_gov_usd        NUMERIC(10, 4) NOT NULL DEFAULT 0.0, -- Attributed governance cost
    cost_storage_usd    NUMERIC(10, 4) NOT NULL DEFAULT 0.0, -- Attributed storage cost
    cost_network_usd    NUMERIC(10, 4) NOT NULL DEFAULT 0.0, -- Attributed network cost
    total_cost_usd      NUMERIC(10, 4) NOT NULL DEFAULT 0.0, -- Sum of all costs
    metadata            JSONB,                  -- Additional context (e.g., IDE used, feature flags)
    is_optimized        BOOLEAN NOT NULL DEFAULT FALSE -- Flag if this event was part of an optimized flow
);

CREATE INDEX idx_ai_usage_user_id ON ai_usage_event (user_id, timestamp DESC);
CREATE INDEX idx_ai_usage_model_id ON ai_usage_event (model_id, timestamp DESC);
CREATE INDEX idx_ai_usage_app_id ON ai_usage_event (application_id, timestamp DESC);
CREATE INDEX idx_ai_usage_lob_id ON ai_usage_event (lob_id, timestamp DESC);
CREATE INDEX idx_ai_usage_env ON ai_usage_event (environment, timestamp DESC);
CREATE INDEX idx_ai_usage_timestamp ON ai_usage_event (timestamp DESC);
```

### 2.2. `cost_dimension_mapping` Table

This table will store metadata and hierarchical relationships for various cost dimensions, allowing for flexible grouping and reporting.

```sql
CREATE TABLE cost_dimension_mapping (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_type      TEXT NOT NULL,          -- e.g., USER, MODEL, APPLICATION, LOB, PRODUCT, SOLUTION
    dimension_key       TEXT NOT NULL UNIQUE,   -- Unique identifier for the dimension (e.g., Firebase UID, claude-opus-4.7)
    display_name        TEXT NOT NULL,
    parent_dimension_key TEXT,                  -- For hierarchical relationships (e.g., LOB -> Product)
    metadata            JSONB,                  -- Additional details (e.g., LOB owner, model pricing details)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cost_dim_type_key ON cost_dimension_mapping (dimension_type, dimension_key);
CREATE INDEX idx_cost_dim_parent_key ON cost_dimension_mapping (parent_dimension_key);
```

### 2.3. `optimization_recommendation` Table

This table stores the recommendations generated by the Optimization Engine.

```sql
CREATE TABLE optimization_recommendation (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT now(),
    recommendation_type TEXT NOT NULL,          -- e.g., ECS_DOWNSIZE, MODEL_SWITCH, TRACE_SAMPLING
    description         TEXT NOT NULL,
    target_dimension_type TEXT NOT NULL,        -- e.g., APPLICATION, PROJECT, LOB
    target_dimension_key TEXT NOT NULL,
    estimated_savings_usd NUMERIC(10, 4) NOT NULL,
    confidence_score    NUMERIC(3, 2) NOT NULL, -- 0.0 to 1.0
    status              TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPLIED, DISMISSED, TICKET_CREATED
    action_taken_by     TEXT,                   -- User who applied/dismissed
    action_taken_at     TIMESTAMPTZ,
    metadata            JSONB                   -- Additional context for the recommendation
);

CREATE INDEX idx_opt_rec_target ON optimization_recommendation (target_dimension_type, target_dimension_key);
CREATE INDEX idx_opt_rec_status ON optimization_recommendation (status);
```

### 2.4. `cost_model_rates` Table

This table will store the dynamic pricing rates for various AI models and infrastructure components.

```sql
CREATE TABLE cost_model_rates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_type           TEXT NOT NULL,          -- e.g., LLM_INPUT_TOKEN, LLM_OUTPUT_TOKEN, ECS_VCPU_HOUR, S3_GB_MONTH
    resource_key        TEXT NOT NULL,          -- e.g., claude-opus-4.7, gpt-4, ecs-fargate-cpu
    unit_cost_usd       NUMERIC(10, 6) NOT NULL,
    effective_from      TIMESTAMPTZ NOT NULL,
    effective_to        TIMESTAMPTZ,            -- NULL for current rate
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cost_rates_type_key_from ON cost_model_rates (rate_type, resource_key, effective_from);
```

## 3. API Endpoints Design

The FinOps module will expose RESTful API endpoints, adhering to the existing ARIA API standards (e.g., JWT authentication, PII redaction).

### 3.1. Cost Ingestion API

*   **`POST /api/v1/finops/usage-events`**
    *   **Description**: Ingests a batch of AI usage events. This endpoint will be called by various ARIA agents or external systems (e.g., IDE plugins, LLM gateways) to report AI usage.
    *   **Request Body**: `List<AiUsageEventDto>`
    *   **Response**: `202 Accepted` or `400 Bad Request`.
    *   **Notes**: This endpoint should be highly performant and potentially asynchronous to handle high volumes of events. It will trigger the cost attribution logic.

### 3.2. Cost Reporting APIs

*   **`GET /api/v1/finops/costs`**
    *   **Description**: Retrieves aggregated AI costs based on various dimensions and time ranges.
    *   **Query Parameters**:
        *   `start_date`, `end_date`: Date range for aggregation.
        *   `group_by`: Comma-separated list of dimensions to group by (e.g., `user_id,model_id,lob_id`).
        *   `filter_by`: Key-value pairs for filtering (e.g., `application_id=ARIA_COPILOT`).
        *   `environment`: Filter by environment (e.g., `PROD`, `DEV`).
        *   `is_optimized`: Filter by optimization status (`true`, `false`, `all`).
    *   **Response**: `List<CostAggregationDto>` (e.g., `[{ dimension: 'user_id', key: 'john.doe', total_cost_usd: 123.45, model_cost_usd: 50.00, ... }]`)

*   **`GET /api/v1/finops/costs/summary`**
    *   **Description**: Provides a high-level summary of AI costs for the Executive FinOps Dashboard.
    *   **Query Parameters**: `start_date`, `end_date`, `environment`.
    *   **Response**: `FinOpsSummaryDto` (e.g., `total_spend_mtd_usd`, `projected_annual_spend_usd`, `total_savings_identified_usd`, `cost_per_1k_transactions_usd`).

*   **`GET /api/v1/finops/costs/before-after`**
    *   **Description**: Retrieves data for the "Before vs. After ARIA" comparison.
    *   **Query Parameters**: `start_date`, `end_date`, `target_dimension_type`, `target_dimension_key`.
    *   **Response**: `BeforeAfterComparisonDto` (e.g., `before_cost_buckets`, `after_cost_buckets`, `total_savings_usd`, `percentage_savings`).

### 3.3. Optimization Recommendation APIs

*   **`GET /api/v1/finops/recommendations`**
    *   **Description**: Retrieves a list of active optimization recommendations.
    *   **Query Parameters**: `status` (e.g., `PENDING`, `APPLIED`), `target_dimension_type`, `target_dimension_key`.
    *   **Response**: `List<OptimizationRecommendationDto>`.

*   **`POST /api/v1/finops/recommendations/{id}/apply`**
    *   **Description**: Marks a recommendation as applied. This would trigger a simulated or actual change in the system (e.g., updating a configuration that affects model routing).
    *   **Response**: `200 OK`.

*   **`POST /api/v1/finops/recommendations/{id}/dismiss`**
    *   **Description**: Marks a recommendation as dismissed.
    *   **Response**: `200 OK`.

*   **`POST /api/v1/finops/recommendations/{id}/create-ticket`**
    *   **Description**: Integrates with the existing ARIA `ticket_mcp` to create a support ticket for a recommendation.
    *   **Response**: `200 OK` with `ticket_id`.

### 3.4. Dimension Management APIs

*   **`GET /api/v1/finops/dimensions`**
    *   **Description**: Retrieves a list of available cost dimensions and their values.
    *   **Query Parameters**: `dimension_type`.
    *   **Response**: `List<CostDimensionDto>`.

## 4. Integration with ARIA Platform

*   **Ingestion**: The `ai_usage_event` table will be populated by:
    *   **ARIA Agent Traces**: The existing `aria_trace` table can be a source, or a new `FinOpsAgentTraceAdvisor` can publish events.
    *   **IDE Plugins**: Direct integration from Copilot/LLM gateways in VSCode/IntelliJ to `POST /api/v1/finops/usage-events`.
    *   **External Systems**: Other enterprise AI applications reporting their usage.
*   **Cost Attribution Logic**: A dedicated Spring Boot service (`aria-finops-processor`) will consume `ai_usage_event` records, calculate attributed costs (infra, observ, gov, storage, network) based on defined rules and `cost_model_rates`, and update the `ai_usage_event` record or store aggregated data.
*   **Optimization Engine**: The `aria-finops-optimizer` service will periodically run rules against aggregated cost data and generate `optimization_recommendation` records.
*   **UI**: The React.js frontend will consume the FinOps APIs to render dashboards and interactive components.
*   **Security**: Leverage ARIA's existing Spring Security for JWT authentication and authorization for all FinOps API endpoints.

## 5. Mock Data Generation Strategy

For the demo, realistic mock data will be crucial. This will involve:

*   **`ai_usage_event`**: Generate events across different users, models (Claude Opus, Haiku, Codex), applications, LOBs, and environments. Include a mix of `is_optimized=true` and `is_optimized=false` events to showcase the "Before vs. After" scenario.
*   **`cost_dimension_mapping`**: Populate with sample users, models, applications, LOBs, etc.
*   **`cost_model_rates`**: Define realistic (simulated) pricing for tokens, compute, storage, etc.
*   **`optimization_recommendation`**: Generate a set of pending and applied recommendations with varying estimated savings.

This data will be generated via a dedicated Spring Boot `DataLoader` or a script for easy setup of the demo environment.
