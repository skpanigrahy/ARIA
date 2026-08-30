# AutoFixOrchestrator → Explicit Execution State Refactor
### Implementation Spec — ACES / AutoFixAgent

Adapting SKILL.state (Badhe et al., arXiv:2608.26263) to AutoFixOrchestrator's CI-failure investigation loop. Goal: replace append-only reasoning/observation history with a bounded, structured execution state, cutting per-run token cost and closing the ReasoningBank procedural-memory gap in the same pass.

---

## 1. Problem statement

AutoFixOrchestrator currently investigates a CI failure by iterating: read CI log → reason → propose fix → run tests → repeat. If each step appends its observation and reasoning to a growing prompt (the standard ReAct pattern), cost scales O(T²) in investigation steps, and the model has to re-derive "what have I already tried" from buried transcript text every turn — which is also where hallucinated repeat-fixes come from.

Target: prompt size stays flat regardless of how many fix attempts a given AutoFix run takes.

---

## 2. Execution state schema

A single reusable schema per domain (per the paper's finding that schemas are authored once, not per-task). Java record, versioned so ReasoningBank can store it as a typed PROCEDURE card.

```java
public record AutoFixExecutionState(
    String ciRunId,
    String targetBranch,
    List<FailedTest> failedTests,
    List<FixAttempt> triedFixes,
    String currentHypothesis,
    Set<String> filesTouched,
    CiStatus ciStatus,
    int rollbackCount,
    Instant lastUpdated
) {
    public record FailedTest(String testName, String errorSignature, String stackTraceHash) {}
    public record FixAttempt(String description, String diffHash, boolean succeeded) {}
    public enum CiStatus { PENDING, RUNNING, PASSED, FAILED, ROLLED_BACK }
}
```

Notes:
- `errorSignature` / `diffHash` are hashes, not raw text — keeps the state itself small even though it's structured, not just non-conversational.
- `triedFixes` prevents the exact repeat-fix hallucination the paper's InterCode CTF results show being fixed by explicit hypothesis tracking (pass@1 +7.8 points over the strongest baseline).

---

## 3. Orchestrator loop refactor

Current (implied) pattern — conversational:
```java
// existing-style: prompt grows every iteration
List<Message> transcript = new ArrayList<>();
while (!resolved) {
    transcript.add(observation);
    var response = gateway.chat(transcript); // full history sent every call
    transcript.add(response);
    resolved = execute(response.action());
}
```

Proposed — state-patch pattern:
```java
public class AutoFixOrchestrator {

    public AutoFixExecutionState step(AutoFixExecutionState state, Observation obs) {
        var prompt = promptBuilder.build(SKILL_SPEC, state, obs); // O(1) — never includes prior turns

        var result = gateway.chat(prompt); // internal JPMC gateway, OpenAI-compatible
        var parsed = stateUpdateParser.parse(result); // { statePatch, action }

        var validated = schemaValidator.validate(parsed.statePatch(), AutoFixExecutionState.class);
        if (!validated.isValid()) {
            return retryWithFeedback(state, obs, validated.errors()); // rollback-retry, per paper §7
        }

        var nextState = merge(state, validated.patch()); // dictionary merge, null = delete key
        executeAction(parsed.action());
        return nextState;
    }
}
```

Key behavioral change: `result`'s free-text reasoning is used only to produce `parsed`, then discarded. It is never written back into `state` and never appears in the next call's prompt.

---

## 4. Validation & rollback semantics

Per the paper's error taxonomy on smaller/open-weight models (68% of failures were premature key overwrite, not reasoning failure) — validation needs to live in the deterministic runtime, not be trusted from the model:

- `SchemaValidator` rejects patches with unknown keys, type mismatches, or accidental full-object overwrites where a partial merge was intended.
- On invalid patch: rollback to `state` (unchanged), append a validation-error observation, retry — bounded to N attempts before escalating to human review.
- `rollbackCount` in the schema itself tracks this, feeding BUDGET_ADHERENCE (repeated rollbacks = cost without progress).

This matters more for you than for the paper's benchmarks, since ACES routes through claude-opus-4 style models via the internal gateway rather than only large proprietary models — worth explicitly testing validation-failure rates on your actual model tier before rollout, since the paper's own numbers on smaller open-weight models (Gemma-4-31B, Qwen-3-8B) showed real degradation at long horizons that larger models didn't.

---

## 5. ReasoningBank integration — closing the procedural memory gap

`AutoFixExecutionState`'s schema becomes the first typed PROCEDURE card in ReasoningBank:

```
ReasoningBank.PROCEDURE
  procedure_id: "autofix-ci-investigation-v1"
  schema: AutoFixExecutionState (versioned JSON schema)
  applicable_skills: [AutoFixAgent]
  embedding: pgvector(schema_description)
```

Future procedural skills (beyond AutoFix) register their own schema the same way — this gives you a real answer to "what does a PROCEDURE card look like," which was the open gap.

---

## 6. TrustScore mapping

| TrustScore dimension | How this refactor feeds it |
|---|---|
| BUDGET_ADHERENCE | Flat O(1) prompt footprint vs O(T²) — direct token-cost signal per AutoFix run |
| TRAJECTORY_INTEGRITY | State-patch validation *is* a trajectory-integrity check at each step; `rollbackCount` and repeated-hypothesis detection are concrete anomaly signals, complementing your reservoir-encoder work rather than duplicating it |
| EVAL_RELIABILITY | **Caution** — do not apply this pattern to AgentEvalJudge/EvalHarness. Per the paper's own Limitations, state-centric execution is wrong wherever the trajectory itself is the target output (your case: auditing/grading requires the historical trace, not just final state) |

---

## 7. Benchmark & ablation plan

Mirror the paper's methodology directly, scoped to your CI-failure domain:

**Runtimes to compare:**
1. Current AutoFixOrchestrator (transcript-based, baseline)
2. State-patch refactor (this spec)
3. Budget-matched sliding-window truncation (control — the paper shows this fails catastrophically even at matched token budget, worth confirming on your own domain rather than assuming)

**Metrics:**
- Task success rate (CI failure resolved without breaking other tests)
- Avg prompt tokens per step
- Total tokens per resolved incident
- Recovery steps after externally-injected state drift (e.g. someone else pushes to the branch mid-investigation — direct analog to the paper's Experiment 3)

**Test harness:** JUnit 5 + a synthetic CI-failure generator seeded deterministically (same approach as their Algorithm 2), so all three runtimes see identical event sequences for fair comparison.

**Suggested horizon range:** T = 5, 15, 30, 50 investigation steps — CI investigations are typically shorter-horizon than their 200-step warehouse benchmark, so early-horizon behavior matters more here than asymptotic scaling.

---

## 8. Where NOT to apply this

- **AgentEvalJudge / EvalHarness** — trajectory is the deliverable; keep full transcript.
- **Anything without a stable schema up front** — if a fix category is genuinely novel (schema unknown until mid-investigation), forcing a premature schema risks losing information the paper's Limitations §7(1) explicitly warns about.

---

## 9. Rollout plan

1. Implement schema + validator in isolation, unit-test against synthetic patches (malformed JSON, unknown keys, full-overwrite attempts)
2. Shadow-run state-patch orchestrator alongside current AutoFixOrchestrator on real CI failures, log both, don't act on state-patch output yet
3. Compare token cost + resolution accuracy over ~2 weeks of shadow data
4. Cut over AutoFixAgent's primary path once shadow metrics clear current baseline
5. Register schema as first ReasoningBank PROCEDURE card; document as the template for future procedural skills
