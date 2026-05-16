# ARIA Trust Model Schema: Tracking Behavioral Trends and Incident History

Within the ARIA (Adaptive Risk Intelligence Platform) framework, the **Trust Model Schema** serves as the persistent 
record, or "DNA," for each AI agent. It is crucial for moving beyond static risk assessment to a dynamic, performance-based accountability system. This document details how specific fields within the schema are utilized to track an AI agent's behavioral trends and incident history, ultimately influencing its overall trust score and autonomy.

## 1. The Trust Model Schema: Agent DNA Profile

The core of ARIA's agent governance is the `Agent Profile` stored in the `Trust Registry`. This profile is a rich data structure that captures both quantitative metrics and qualitative historical data.

| Field | Type | Description | Role in Tracking Behavioral Trends & Incident History |
| :--- | :--- | :--- | :--- |
| `agent_id` | String | Unique identifier for the AI agent (e.g., `copilot-agent-7`). | Primary key for all historical data and incidents. |
| `agent_type` | Enum | The underlying model or platform (e.g., `Copilot`, `Claude`, `MCP`). | Categorizes agents for aggregate trend analysis and policy application. |
| `trust_score` | Float | A normalized value (0.0 to 1.0) representing the current trust level. | **Behavioral Trend**: The ultimate output, reflecting the agent's current reliability based on all historical data. |
| `total_prs` | Integer | Total number of pull requests or changes proposed by the agent. | **Behavioral Trend**: Baseline for calculating success rates. |
| `blocked_prs` | Integer | Number of changes blocked by the governance layer. | **Behavioral Trend**: Direct indicator of proposals that failed ARIA's checks, contributing to a lower success rate. |
| `prod_incidents` | Integer | Number of production incidents directly attributed to this agent. | **Incident History**: A critical metric for tracking real-world failures. Directly impacts the trust score via penalties. |
| `trend` | Enum | The current performance trajectory (`improving`, `stable`, `declining`, `new`). | **Behavioral Trend**: High-level summary of recent performance, derived from `recent_activity` and `trust_score` changes. |
| `recent_activity` | Array[Float] | A rolling window of recent trust score evaluations (for sparklines). | **Behavioral Trend**: Provides granular data for trend analysis, allowing the `Adaptive Risk Model` to detect shifts in performance. |
| `specializations` | Array[String] | Domains where the agent has shown high proficiency (e.g., `Java`, `K8s`). | Contextualizes performance; an incident in a specialized area might be weighted differently. |
| `last_incident` | String | Timestamp and brief description of the most recent production failure. | **Incident History**: Provides immediate context for the most recent negative event, crucial for human review. |

## 2. Tracking Behavioral Trends

ARIA tracks behavioral trends through a combination of quantitative metrics and derived indicators:

*   **Success Rate**: Calculated from `total_prs` and `blocked_prs`. A consistently high `blocked_prs` count relative to `total_prs` indicates a declining trend in the agent's ability to propose acceptable changes.
*   **`recent_activity`**: This array stores a moving average or a series of recent `trust_score` values. The `Adaptive Risk Model` analyzes this sequence to determine if the agent's performance is `improving`, `stable`, or `declining`. For instance, if the last few scores are consistently lower than previous ones, the `trend` will shift to `declining`.
*   **`trend` field**: This enum provides a quick, human-readable summary of the agent's current trajectory. It's a direct output of the `Adaptive Risk Model`'s analysis of `recent_activity`.

## 3. Tracking Incident History

Incident history is paramount for a truly adaptive risk model. ARIA captures this through:

*   **`prod_incidents`**: This counter is incremented every time a production incident is directly attributed to an AI agent's deployed change. This is a critical input to the `Adaptive Risk Model`, where each incident incurs a penalty on the `trust_score`.
*   **`last_incident`**: This field provides immediate context about the most recent production failure. It includes a timestamp and a brief description, which is invaluable for the `Decision Archaeology` layer to explain *why* an agent's trust score might have dropped.
*   **Production Feedback Loop**: The `Signal Ingestor` continuously monitors production systems for incidents. When an incident occurs, the `Adaptive Risk Model` processes this signal, updates `prod_incidents`, adjusts the `trust_score`, and records the `last_incident` details. This closed-loop mechanism ensures that real-world failures directly impact an agent's future autonomy.

## 4. Impact on Trust Score and Autonomy

The continuous tracking of behavioral trends and incident history directly informs the `trust_score`. A higher `trust_score` grants an AI agent more autonomy, potentially reducing the need for human oversight or allowing it to operate in more critical areas. Conversely, a declining trend or an increase in `prod_incidents` will lower the `trust_score`, leading to increased scrutiny, more `WARN` or `BLOCK` decisions, and potentially requiring more human intervention for its proposed changes.

This dynamic adjustment ensures that trust is earned and maintained, making ARIA a robust platform for scalable and trustworthy AI adoption.
