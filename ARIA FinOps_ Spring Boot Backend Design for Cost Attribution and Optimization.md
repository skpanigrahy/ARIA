# ARIA FinOps: Spring Boot Backend Design for Cost Attribution and Optimization

This document details the Spring Boot backend design for the ARIA FinOps and Cost Intelligence modules. It focuses on implementing the multi-dimensional AI cost tracking, attribution, and optimization logic, leveraging the data model and API endpoints defined previously. The backend will be developed using **Java 21** and **Spring Boot 3.3**, aligning with the ARIA product specification [1].

## 1. Project Structure

The FinOps backend will be integrated as a modular component within the broader ARIA platform. Following the `aria/` module structure from the product specification [1], we will introduce a new `aria-finops/` module.

```
aria/
  aria-api/          → Existing REST + WebSocket controllers, JWT auth
  aria-agent/        → Existing ChatClient config, advisor chain
  aria-memory/       → Existing UserScopedMemory (pgvector), ConversationHistory (Redis)
  aria-mcp/          → Existing MCP client config
  aria-safety/       → Existing PIIDetector, RefusalAdvisor
  aria-eval/         → Existing Safety evals, accuracy evals
  aria-observability/→ Existing Micrometer config, Grafana dashboards
  aria-web/          → Existing React 18 + TypeScript frontend
  aria-infra/        → Existing Docker Compose, Kubernetes manifests
  aria-finops/       → NEW: FinOps module
    src/
      main/
        java/
          com/
            aria/
              finops/
                config/         → Spring configurations (e.g., database, async)
                controller/     → REST API endpoints for FinOps
                dto/            → Data Transfer Objects for API requests/responses
                entity/         → JPA Entities for FinOps data model
                repository/     → Spring Data JPA repositories
                service/        → Business logic for cost attribution, optimization, reporting
                event/          → Event definitions and listeners for internal communication
                util/           → Utility classes (e.g., cost calculation formulas)
        resources/
          application.yml     → Module-specific configurations
          db/migration/       → Flyway/Liquibase scripts for FinOps schema
    pom.xml              → Maven build file for finops module
  CLAUDE.md          → Existing Agent system prompt
  .claude/           → Existing skills/, hooks/
```

## 2. Key Backend Services and Logic

### 2.1. `AiUsageEventIngestionService`

*   **Purpose**: Handles the ingestion of raw AI usage events from various sources.
*   **Input**: `AiUsageEventDto` (from `POST /api/v1/finops/usage-events`).
*   **Logic**:
    1.  **Validation**: Validate incoming event data.
    2.  **Persistence**: Save raw `AiUsageEvent` to the `ai_usage_event` table.
    3.  **Event Publishing**: Publish an internal `AiUsageEventReceived` event to trigger asynchronous cost attribution.
*   **Integration**: This service will be the primary entry point for AI usage data, receiving events from IDE plugins (Copilot, etc.), ARIA's internal `AgentTraceAdvisor`, and other AI-powered applications within the enterprise.

### 2.2. `CostAttributionService`

*   **Purpose**: Calculates and attributes the various cost components for each AI usage event.
*   **Trigger**: Listens for `AiUsageEventReceived` events.
*   **Logic**:
    1.  **Retrieve Rates**: Fetch current pricing rates from `cost_model_rates` for the specific model, infrastructure components, etc.
    2.  **Calculate Model Cost**: Based on `input_tokens`, `output_tokens`, and model-specific rates.
    3.  **Attribute Infrastructure Cost**: Use proportional allocation logic (e.g., `(user_requests / total_requests) * total_ecs_cost`) by querying aggregated usage data. This will involve querying `ai_usage_event` for total requests within a time window and attributing a share of a simulated or actual total infrastructure cost.
    4.  **Attribute Observability Cost**: Similar proportional allocation based on trace events or log volume.
    5.  **Attribute Governance Cost**: Proportional allocation based on evaluated requests or governance overhead factors.
    6.  **Attribute Storage/Network Cost**: Based on estimated usage or proportional allocation.
    7.  **Update Event**: Update the `ai_usage_event` record with calculated `cost_model_usd`, `cost_infra_usd`, `cost_observ_usd`, `cost_gov_usd`, `cost_storage_usd`, `cost_network_usd`, and `total_cost_usd`.
*   **Asynchronous Processing**: This service will run asynchronously to avoid blocking the ingestion pipeline, potentially using Spring's `@Async` or a dedicated message queue (e.g., Kafka, RabbitMQ) for high throughput.

### 2.3. `FinOpsReportingService`

*   **Purpose**: Provides aggregated cost data for the FinOps dashboards.
*   **Methods**:
    *   `getCosts(criteria)`: Aggregates `ai_usage_event` data based on `group_by`, `filter_by`, and `time_range` parameters. This will involve complex SQL queries or potentially leveraging a data warehousing solution like Google BigQuery for pre-aggregated views.
    *   `getFinOpsSummary(timeRange)`: Calculates high-level metrics (Total Spend, Projected Annual Spend, Total Savings, Cost per 1k Transactions).
    *   `getBeforeAfterComparison(dimension, key, timeRange)`: Compares costs for a given dimension before and after optimization. This will involve querying `ai_usage_event` where `is_optimized` is `TRUE` vs. `FALSE` or applying optimization rules retrospectively to `is_optimized=FALSE` data.
*   **Caching**: Utilize Redis for caching frequently accessed aggregated reports to meet dashboard latency requirements.

### 2.4. `OptimizationEngineService`

*   **Purpose**: Identifies cost optimization opportunities and generates recommendations.
*   **Trigger**: Scheduled task (e.g., daily, weekly) or on-demand via API.
*   **Logic**:
    1.  **Data Retrieval**: Fetch aggregated `ai_usage_event` data and `cost_dimension_mapping`.
    2.  **Rule Evaluation**: Apply predefined optimization rules (as outlined in the previous architecture document) to identify inefficiencies.
        *   *Example*: Identify applications with consistently low CPU utilization for their provisioned AI infrastructure.
        *   *Example*: Detect models being used for simple, low-token requests that could be routed to cheaper alternatives.
    3.  **Recommendation Generation**: For each identified opportunity, create an `OptimizationRecommendation` entity, including estimated savings, confidence score, and target dimension.
    4.  **Persistence**: Save new recommendations to the `optimization_recommendation` table.
    5.  **Update Status**: Update the status of recommendations (e.g., `PENDING`, `APPLIED`).
*   **Integration with Google Vertex AI**: For more advanced scenarios, this service could integrate with Vertex AI to train models for predictive cost anomaly detection or to generate more sophisticated optimization strategies based on historical patterns and external market data.

### 2.5. `RecommendationActionService`

*   **Purpose**: Handles actions related to optimization recommendations.
*   **Methods**:
    *   `applyRecommendation(id)`: Marks a recommendation as `APPLIED`. In a real system, this would trigger an automated workflow (e.g., Terraform update, CI/CD pipeline modification) or a ticket creation in Jira via the `ticket_mcp`.
    *   `dismissRecommendation(id)`: Marks a recommendation as `DISMISSED`.
    *   `createTicket(id)`: Integrates with ARIA's `ticket_mcp` to create a support ticket for manual intervention.

### 2.6. `DataLoaderService` (for Demo)

*   **Purpose**: Populates the database with realistic mock data for the demo.
*   **Logic**:
    1.  Generate `cost_model_rates` for various LLMs (Claude Opus 4.6/4.7, Haiku, Codex, Gemini, GPT-4) and infrastructure components.
    2.  Generate `cost_dimension_mapping` for sample users, applications, LOBs, products, and solutions.
    3.  Generate a large volume of `ai_usage_event` records, simulating usage patterns from different users, models, and environments. Crucially, generate a mix of "before optimization" events (`is_optimized=FALSE`) and "after optimization" events (`is_optimized=TRUE`) to showcase the cost savings.
    4.  Generate sample `optimization_recommendation` records with varying statuses.
*   **Execution**: This service will be run once during demo setup.

## 3. Technology Stack Details

*   **Java Development Kit**: JDK 21 (as per best practices).
*   **Spring Boot**: 3.3.x for robust, production-grade microservices.
*   **Spring Data JPA**: For seamless interaction with PostgreSQL and `pgvector`.
*   **Spring WebFlux**: For reactive programming, especially for high-throughput ingestion and potentially for streaming aggregated data.
*   **Spring Security**: For JWT-based authentication and authorization, integrating with ARIA's existing security context.
*   **PostgreSQL + pgvector**: As the primary data store for all FinOps entities.
*   **Redis**: For caching aggregated results and potentially for rate limiting on ingestion endpoints.
*   **Maven**: For dependency management and build automation.
*   **Google Cloud Integration**: While the core logic is in Spring Boot, integration points with Google Cloud services like **Vertex AI** (for advanced ML models in optimization) and **BigQuery** (for large-scale analytics) will be designed for future scalability.

## 4. API Endpoint Implementation

The controllers within `com.aria.finops.controller` will implement the API endpoints defined in the `ARIA_FinOps_DataModel_API.md` document, mapping DTOs to service calls and handling responses. Standard error handling and logging will be implemented across all endpoints.

## 5. Mock Data Generation Strategy (Detailed)

To effectively demonstrate the FinOps capabilities, the `DataLoaderService` will generate data that highlights:

*   **Cost Variances**: Show how different models (e.g., Claude Opus vs. Haiku) have different cost profiles for similar tasks.
*   **Attribution Breakdown**: Ensure that costs are clearly attributable to specific users, applications, and LOBs.
*   **Optimization Impact**: Create scenarios where applying recommendations leads to significant, quantifiable savings. For instance, a user who initially uses a high-cost model for simple queries will show a high `total_cost_usd` for `is_optimized=FALSE` events, and a lower cost for subsequent `is_optimized=TRUE` events after a simulated model switch.
*   **IDE Context**: The `metadata` field in `ai_usage_event` can include `{"ide": "VSCode", "plugin": "Copilot"}` to simulate usage from different developer environments.

This comprehensive backend design ensures that the ARIA FinOps module is robust, scalable, and capable of delivering the promised value proposition for AI cost management and optimization.
