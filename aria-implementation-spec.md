# ARIA Implementation Spec: Reasoning-Boundary Contracts, TRAJECTORY_INTEGRITY, and EVAL_RELIABILITY

**Audience:** implementing engineer / coding agent (Copilot).
**Scope:** three related pieces of work against the ARIA trust-scoring layer:

- **Part A** — a cross-cutting contract-and-validation framework that every TrustScore dimension must follow (this is a constraint on all dimensions, not a standalone feature).
- **Part B** — TRAJECTORY_INTEGRITY, the 6th TrustScore dimension (runtime trajectory anomaly detection).
- **Part C** — EVAL_RELIABILITY, the 5th TrustScore dimension (LLM-as-Judge reliability scoring via AgentEvalJudge + EvalHarness).

Everything below is written as an implementation contract: data shapes, validation rules, failure policy, and acceptance criteria. Where a decision depends on details not specified here (exact ReasoningBank schema, exact gateway auth flow, existing package layout), leave a `// TODO(spec-gap):` comment rather than guessing — do not invent business logic silently.

---

## Part A — Reasoning-Boundary Contract Framework (applies to every dimension)

### A.1 Governing rule

Every TrustScore dimension computation is decomposed into three layers, and each layer has a hard rule:

| Layer | What belongs here | Rule |
|---|---|---|
| Deterministic code | retrieval, arithmetic, threshold checks, state transitions, weighting/aggregation | Must be pure functions wherever possible. No LLM call may compute a numeric score directly. |
| Bounded inner model | classification/extraction from unstructured input only (e.g. judge rationale text, log text, trajectory commentary) | Output MUST be schema-validated before use. Never trusted implicitly. |
| Orchestration | wires the above together, owns retry/escalate policy, owns observability | Lives in the dimension's `*Evaluator` / `*Service` class. |

**Non-negotiable constraint:** no TrustScore dimension's final numeric value may be a field an LLM populated directly. LLMs populate *evidence* (categorical judgments, findings, references). Code combines evidence into scores using fixed, versioned formulas.

### A.2 Universal typed-output contract

Every bounded LLM call in ARIA (AgentEvalJudge included) must return an object satisfying this shape — implement as a Java `record` (Spring AI structured output) and mirror as a Pydantic model on any Python-side service (e.g. the trajectory microservice) for cross-service consistency:

```java
// Java 21 record — canonical contract for any bounded inner-LLM output in ARIA
public record ModelFinding<T>(
    T category,                    // must be a closed enum, never free text
    String summary,                // length-capped, see A.4
    List<String> evidenceIds,      // MUST reference IDs that exist in source data
    double rawModelConfidence,     // captured for observability ONLY — never used in scoring
    boolean requiresEscalation     // model may flag uncertainty; code decides what to do with it
) {}
```

```python
# Python mirror (pydantic) — trajectory service / any FastAPI component
class ModelFinding(BaseModel):
    category: Literal[...]          # closed enum per use site
    summary: str = Field(max_length=500)
    evidence_ids: list[str]
    raw_model_confidence: float     # observability only, never scoring input
    requires_escalation: bool
```

Key point: `rawModelConfidence` / `raw_model_confidence` is captured and logged but **must never appear in a scoring formula**. It exists for observability/drift-detection only (see A.6). This directly encodes the "evidence over confidence" rule — evidence IDs are falsifiable, self-reported confidence is not.

### A.3 Provenance separation

Every dimension's assessment object must separate **measured** fields from **interpreted** fields at the type level — not by convention, by distinct field groups with a naming/structuring rule:

```java
public record DimensionAssessment(
    String subjectId,               // agent/trajectory/eval-run id
    Map<String, Double> measured,   // computed by code — trust unconditionally
    List<ModelFinding<?>> findings, // produced by a bounded LLM — treat as claims
    double score,                   // computed ONLY from `measured` + validated `findings`
    List<String> incompleteSources, // never silently empty — see A.5
    String scoringFormulaVersion    // required for reproducibility / audit
) {}
```

`scoringFormulaVersion` is mandatory on every assessment. If the weighting formula changes, old assessments must remain interpretable against the version that produced them — this is what makes a TrustScore auditable after the fact.

### A.4 Validation checklist (implement as a single reusable validator, not per-dimension copies)

Build one shared component, e.g. `ModelFindingValidator`, used by every dimension:

```java
public interface ModelFindingValidator<T> {
    ValidationResult validate(ModelFinding<T> finding, SourceData sourceData);
}
```

`ValidationResult` must check, in this order (fail fast, record which check failed):

1. **Enum membership** — `category` is one of the declared closed values. Anything else is a hard failure, not a warning.
2. **Evidence existence** — every ID in `evidenceIds` exists in `sourceData` as supplied to the model call. This is the highest-leverage check; do not skip it for latency reasons.
3. **Length bound** — `summary` is within its declared cap. Reject, don't truncate silently (truncation hides prompt-injection payloads instead of surfacing them).
4. **Schema completeness** — all required fields present, no field silently defaulted.
5. **No out-of-schema content** — if using a raw JSON parse step before deserialization, reject any response containing content outside the expected JSON object (leaked reasoning traces, instructions, markdown fencing left over).

`ValidationResult` shape:

```java
public record ValidationResult(
    boolean valid,
    List<String> failedChecks,     // empty if valid
    FailurePolicy appliedPolicy    // set by caller, see A.5
) {}
```

### A.5 Failure policy (retry / fallback / escalate)

Do not hardcode one global behavior. Each call site declares its policy explicitly:

```java
public enum FailurePolicy {
    RETRY_ONCE,          // corrective re-prompt, then apply next policy in chain if still invalid
    FALLBACK_UNKNOWN,    // return a category="unknown" finding, log clearly, continue
    ESCALATE_TO_HUMAN    // block automated action, raise for governance review
}
```

Rule of thumb for choosing: `ESCALATE_TO_HUMAN` for anything feeding a rollback/auto-merge/auto-block decision; `FALLBACK_UNKNOWN` for anything advisory-only; `RETRY_ONCE` as a first attempt before either of the above, never as the last resort on its own.

**Never** pass a `ModelFinding` that failed validation into a scoring formula. This must be enforced structurally — `DimensionAssessment.findings` should only be constructible from already-validated findings (private constructor + factory that requires a `ValidationResult.valid == true`, or equivalent).

Also track `incompleteSources` explicitly at every layer: a timeout fetching trajectory events is `incompleteSources=["trajectory-events"]`, never silently folded into "score computed normally." A dimension score computed on incomplete evidence must be visibly marked as such downstream, not presented with the same confidence as a complete one.

### A.6 Observability — required fields on every bounded LLM call

Every call to AgentEvalJudge or any other bounded model step must log, at minimum:

- model identifier + prompt/template version
- input token count, output token count
- latency (ms)
- retry count and which policy branch was taken
- validation result (pass/fail + failed checks list)
- evidence IDs returned
- `rawModelConfidence` (for drift monitoring, never for scoring)
- final `DimensionAssessment.scoringFormulaVersion` it fed into

Emit these as structured log events (or metrics + trace spans if ARIA already has an observability pipeline) keyed by `subjectId` so a reviewer can reconstruct exactly what evidence produced a given TrustScore.

### A.7 Testing requirement per layer

- Deterministic code (weighting, thresholds, aggregation): standard unit tests, one assertion per rule, no flakiness tolerated.
- `ModelFindingValidator`: table-driven tests covering each of the 5 checks in A.4, both pass and fail cases.
- Bounded LLM call (AgentEvalJudge, trajectory classifier if any): a versioned evaluation set — fixed inputs with known-correct categorical labels — re-run on every model/prompt version bump, not just at initial build. Track invalid-output rate and escalation rate as first-class metrics, not just accuracy.
- Full chain: integration tests that assert the *chain's* output is correct, not just each layer in isolation — a fluent wrong answer three layers upstream is the actual production risk (see closing note).

---

## Part B — TRAJECTORY_INTEGRITY (6th TrustScore dimension)

### B.1 Purpose

Detect and localize anomalies in an agent's runtime execution trajectory (its sequence of tool calls, intermediate states, and decisions), and support rollback-and-retry when an anomaly is confirmed. This dimension is **entirely statistical/deterministic** — it must not use an LLM to judge "does this trajectory look anomalous." That question has a fixed, learnable answer given a trained model, which is precisely the "can this be specified completely, given a trained detector" case from Part A.2 — it belongs to code (a trained statistical model), not to a general-purpose LLM asked to eyeball a sequence.

### B.2 Architecture

```
Agent trajectory (sequence of TrajectoryEvent)
        |
        v
Reservoir encoder (fixed, untrained-recurrent-projection) -> fixed-length embedding per step
        |
        v
Ridge regression anomaly scorer -> per-step anomaly score (continuous)
        |
        v
Thresholding + localization -> which step(s) triggered, confirmed anomaly True/False
        |
        v
TrajectoryAssessment (typed, per Part A.3)
        |
        v
Rollback-and-retry decision (rules, not model) -> feeds back to orchestrator
```

Baseline comparator: IsolationForest, run in parallel during evaluation/ablation to confirm the reservoir+ridge approach is actually earning its complexity — keep both in the benchmark suite permanently, not just at initial validation, so future regressions are caught against a simpler baseline.

### B.3 Data contracts

```python
class TrajectoryEvent(BaseModel):
    step_index: int
    agent_id: str
    tool_called: str | None
    tool_args_hash: str          # hash, not raw args — avoid leaking sensitive payloads into the model pipeline
    latency_ms: int
    outcome: Literal["success", "error", "timeout"]
    timestamp: datetime

class StepAnomalyScore(BaseModel):
    step_index: int
    score: float                 # raw ridge-regression output
    is_anomalous: bool           # score > threshold, threshold is versioned config, not a magic number in code
    baseline_score: float        # IsolationForest score for the same step, logged for drift comparison

class TrajectoryAssessment(BaseModel):
    trajectory_id: str
    agent_id: str
    step_scores: list[StepAnomalyScore]
    anomaly_detected: bool
    localized_steps: list[int]           # which step_indices triggered
    recommended_action: Literal["none", "flag", "rollback_and_retry", "escalate"]
    incomplete_sources: list[str]        # e.g. ["missing-trailing-events"] if trajectory was truncated
    scoring_formula_version: str
    model_version: str                   # reservoir+ridge model artifact version, for reproducibility
```

Note there is **no LLM-produced field anywhere in `TrajectoryAssessment`**. This dimension should be implementable and testable with zero live model calls in its critical path — that's a deliberate design property, not an oversight.

### B.4 Service surface (FastAPI, per existing prototype)

```
POST /trajectory/score
  body: { trajectory_id, events: [TrajectoryEvent, ...] }
  returns: TrajectoryAssessment

GET /trajectory/{trajectory_id}/assessment
  returns: TrajectoryAssessment (cached/last-computed)

POST /trajectory/model/reload
  admin-only: hot-reload a new reservoir/ridge model artifact version without service restart
```

### B.5 Rollback-and-retry integration

`recommended_action` is produced by **fixed rules operating on `step_scores` and `anomaly_detected`**, e.g.:

```python
def determine_action(assessment_input) -> Literal["none","flag","rollback_and_retry","escalate"]:
    # TODO(spec-gap): exact thresholds should come from versioned config,
    # not be hardcoded here — confirm with existing BudgetEnforcementAdvisor
    # config pattern in ACES for consistency.
    ...
```

This function must be unit-testable with fixed inputs and fixed expected outputs — no model call inside it.

### B.6 Test suite requirements

- Benchmark suite with ablations (already prototyped) — keep as a regression gate in CI, not a one-time validation.
- IsolationForest baseline comparison run on every model artifact update.
- pytest suite covering: encoder determinism (same input -> same embedding), scorer threshold boundary cases, localization correctness on synthetic injected-anomaly trajectories, and `incomplete_sources` population when events are missing/truncated.
- Load/latency test: this dimension sits in a runtime path (potentially gating rollback), so p99 latency budget must be defined and tested against explicitly.

### B.7 TrustScore integration

Add `TRAJECTORY_INTEGRITY` as a 6th weighted dimension. Weighting change requires a `scoringFormulaVersion` bump per A.3, and existing TrustScore consumers must be able to distinguish scores computed under the old 5-dimension formula from the new 6-dimension one.

---

## Part C — EVAL_RELIABILITY (5th TrustScore dimension)

### C.1 Purpose

Score how reliable the *evaluation layer itself* is — i.e., is AgentEvalJudge's judgment on a given agent run trustworthy enough to feed the other TrustScore dimensions. This is a meta-dimension: it evaluates the evaluator, which is exactly why it must be held to a stricter contract than the thing it's evaluating.

### C.2 Architecture

```
Agent run/trajectory + task context
        |
        v
AgentEvalJudge (bounded LLM, via gateway) -> per-criterion ModelFinding (Part A.2 contract)
        |
        v
ModelFindingValidator (Part A.4) -> pass/fail per finding
        |
        v
EvalHarness -> runs judge against versioned eval set, tracks agreement-with-human-reviewed-incidents
        |
        v
EVAL_RELIABILITY score (code, from validated findings + EvalHarness historical agreement rate)
```

### C.3 AgentEvalJudge — bounded LLM contract

AgentEvalJudge must be scoped to produce **categorical judgments with evidence references only** — never a raw reliability number.

```java
public record JudgeCriterionFinding(
    String criterionId,                       // e.g. "goal_completion", "tool_use_correctness"
    Literal category,                         // e.g. "met" | "partially_met" | "not_met" | "unclear"
    String rationale,                          // length-capped per A.4
    List<String> evidenceIds,                  // must reference actual trajectory/log event IDs
    double rawModelConfidence,                 // observability only — see A.2
    boolean requiresEscalation
) {}
```

Prompt design constraint: the prompt must require the model to cite `evidenceIds` for every criterion — a finding with an empty `evidenceIds` list on a criterion that claims a specific outcome should fail validation (extend check 2 in A.4: not just "do cited IDs exist" but "are IDs cited when the category is decisive").

### C.4 EvalHarness

EvalHarness owns:

- **Versioned eval set**: fixed (input, expected-criterion-outcome) pairs, curated from real reviewed incidents. Must be re-run on every prompt/model version change (per A.7).
- **Agreement tracking**: computes agreement rate between AgentEvalJudge output and human-reviewed ground truth over time — this is a first-class metric, not a one-off validation run.
- **Drift detection**: compares `rawModelConfidence` distribution and invalid-output rate over time to flag silent model/prompt drift before it shows up as a real disagreement.

```python
class EvalHarnessRun(BaseModel):
    run_id: str
    judge_model_version: str
    prompt_version: str
    eval_set_version: str
    total_cases: int
    valid_output_count: int          # passed ModelFindingValidator
    agreement_with_ground_truth: float
    escalation_rate: float
    mean_latency_ms: float
    run_timestamp: datetime
```

### C.5 EVAL_RELIABILITY scoring formula

Computed entirely in code from EvalHarness historical data plus the current run's validated findings — never a number the judge asserts about itself:

```
eval_reliability_score = f(
    current_run_valid_output_rate,      # from ModelFindingValidator results this run
    rolling_agreement_rate,             # from EvalHarness historical runs (e.g. trailing N runs)
    escalation_rate_delta,              # deviation from historical baseline — spikes indicate drift
)
```

`// TODO(spec-gap): exact weighting/decay function for the rolling agreement rate needs a decision — recommend exponential decay favoring recent EvalHarness runs so the score reflects current judge reliability, not a stale average. Confirm window size with team before hardcoding.`

### C.6 Test suite requirements

- `ModelFindingValidator` tests reused from Part A, plus the extended "decisive category requires evidence" rule from C.3.
- EvalHarness regression tests: fixed eval-set subset with known expected agreement rate; CI should fail if agreement drops below a defined floor.
- Drift simulation test: feed EvalHarness a deliberately degraded judge (e.g. shuffled/randomized outputs) and confirm `eval_reliability_score` drops accordingly — this proves the metric is sensitive, not just present.

### C.7 TrustScore integration

Add `EVAL_RELIABILITY` as the 5th weighted dimension, ordered before `TRAJECTORY_INTEGRITY` (6th) per existing rollout sequencing. Because this dimension scores the reliability of the evaluation layer itself, define explicitly what happens to the *other* four dimensions' scores when `EVAL_RELIABILITY` is low — recommend flagging the overall TrustScore as `low_confidence` rather than silently averaging in a low-reliability judge's findings at full weight.

---

## Cross-cutting acceptance criteria

Implementation is complete when:

1. `ModelFinding`, `ModelFindingValidator`, `DimensionAssessment`, and `FailurePolicy` exist as shared components used identically by TRAJECTORY_INTEGRITY-adjacent code (if it ever needs a bounded LLM call) and EVAL_RELIABILITY — no per-dimension duplicate validation logic.
2. No TrustScore dimension's numeric score field is ever assigned directly from LLM output — grep-able rule: no `score = ` or `.score(` assignment appears inside a class that also constructs a prompt or calls the gateway.
3. Every bounded LLM call site has a declared `FailurePolicy` and emits the full observability field set from A.6.
4. `scoringFormulaVersion` is present and enforced (non-nullable) on every `DimensionAssessment`.
5. TRAJECTORY_INTEGRITY's critical path (event -> assessment -> recommended_action) has zero live LLM calls, confirmed by test coverage that mocks/asserts no gateway client is invoked.
6. EVAL_RELIABILITY's score is reproducible: running EvalHarness twice against the same eval-set version and judge/prompt version produces the same `agreement_with_ground_truth` within defined tolerance.
7. TrustScore aggregation is updated to 6 weighted dimensions with a version bump, and old (4- or 5-dimension) assessments remain distinguishable and interpretable via `scoringFormulaVersion`.

## Open items requiring a team decision before/during implementation

- Exact weight values for the 6-dimension TrustScore formula.
- Rolling window size and decay function for EVAL_RELIABILITY's agreement-rate component.
- Whether `low_confidence` TrustScore flagging (C.7) blocks downstream automated actions or only surfaces a warning — this is a policy decision, not an engineering one, and should be confirmed with governance stakeholders before hardcoding behavior.
- Threshold values for TRAJECTORY_INTEGRITY's anomaly scorer — should come from versioned config consistent with BudgetEnforcementAdvisor's existing pattern, not literals in code.
