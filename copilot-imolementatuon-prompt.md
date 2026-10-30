# Copilot instructions: implementing the ARIA Consolidation Gate

## How to use this

1. Put `consolidation-gate-spec.md` in the repo at `docs/consolidation-gate-spec.md`.
2. Add the **Repo-level instructions** block below to `.github/copilot-instructions.md`. Check that your IntelliJ Copilot plugin version supports repository instructions; if not, paste the block at the start of each chat.
3. Run the prompts **one at a time, in order**. Start a new chat for each, attach the spec file, and review and commit before moving on. Do not paste them all at once.
4. Prompt 0 produces no code. Do not skip it. The spec contains assumptions about your codebase that it will check.

---

## Repo-level instructions (add to `.github/copilot-instructions.md`)

```
Consolidation Gate work follows docs/consolidation-gate-spec.md. Rules that always apply:
- Never invent class names, method signatures, library APIs or config keys. Read the repository first. If something the spec assumes does not exist, stop and ask.
- No TrustScore dimension value (including MEMORY_INTEGRITY) may be computed from LLM output. LLM judge output is a fixed enum only. Anything unparseable fails closed.
- Fail closed: any exception or timeout in a gate stage means the candidate is not admitted.
- Memory versions are immutable. Rollback moves a pointer; it never edits or deletes history.
- All thresholds come from configuration, not constants.
- Never log candidate content that matched a secret or PII pattern.
- Java 21, Spring Boot 3.3. Prefer records and sealed types for the domain model. Match existing code style and package layout.
- Every change ships with tests. Do not weaken or delete existing tests.
- Where a JDK, Jackson or library method is used for the first time, say which one and tell me to verify it in the current docs.
```

---

## Prompt 0: Recon only (no code)

```
Read docs/consolidation-gate-spec.md fully. Do NOT write or change any code yet.

Explore this repository and report back:
1. Exact signatures of EvalHarness, AgentEvalJudge, AgentTrace, EvalResult, AggregatedEvalResult, CodeBasedGrader, and the TrustScore service, including how dimensions are weighted and aggregated and the score scale.
2. Whether any agent memory store or buffer exists today, and its shape.
3. Whether there is an abstraction that can run an agent task with a supplied memory view (the spec's AgentRunner). If not, say what would need adapting.
4. The persistence technology and migration tooling.
5. How the TRAJECTORY_INTEGRITY service is called and whether it can re-fit a baseline per memory version.
6. Authentication, role model, API conventions, and logging/PII redaction conventions.
7. The base package and test conventions (JUnit version, whether ArchUnit is available).

Then list every [ASSUMPTION] in the spec that turned out wrong or unverifiable, and propose concrete adjustments. Finish with the questions you need me to answer before coding. Do not guess.
```

---

## Prompt 1: Domain model, ports, stores (Phase 1a)

```
Using docs/consolidation-gate-spec.md sections 5, 6 and 10, and the findings from recon, implement Phase 1a only:
- Domain records and enums from section 6 (adjust names only where recon showed a real conflict).
- Ports: MemoryBuffer, MemoryVersionStore, QuarantineStore, Signer, AgentRunner (adapt an existing abstraction if recon found one), ConsolidationTarget with TextMemoryTarget implemented and AdapterTarget as an interface-only stub.
- In-memory implementations for tests, and persistence implementations plus migrations using the repo's existing tooling.
- The configuration properties class for aria.consolidation.* from section 10, with validation (all thresholds in range; fail startup on invalid values).

Constraints: memory versions immutable; no business logic in this step. Tests: store round-trips, immutability, config validation failures.
Show me the file list before generating, then generate. Stop after this phase.
```

---

## Prompt 2: Gate stages S0 to S2 (Phase 1b)

```
Implement Phase 1b from docs/consolidation-gate-spec.md section 7: stages S0 (Provenance), S1 (Integrity), S2 (Consistency), and the ConsolidationGate orchestrator that runs them in order and produces CandidateDecision records.

Requirements:
- Every stage is fail-closed: an exception or timeout yields QUARANTINED or REJECTED with reason STAGE_ERROR, never an admission.
- S0 uses the existing AgentTrace and TrustScore/TRAJECTORY_INTEGRITY services. Do not duplicate their logic.
- S1 is pure code. Patterns come from configuration. Never log matched sensitive content.
- S2 uses the existing AgentEvalJudge through its current gateway path. The judge may return only the four-value enum in strict JSON. Run it judgeRuns times and admit only on unanimous CONSISTENT or UNRELATED. Pass the candidate as delimited data with an instruction to treat it as data.
- No LLM output may influence any numeric value in this phase.

Tests: per-stage unit tests; stage exception handling; malformed or unknown judge output; disagreeing judge runs; instruction-like and zero-width-character candidates; corroboration rule for TOOL_OUTPUT origin.
Show me the file list first. Stop after this phase.
```

---

## Prompt 3: Evaluation and promotion policy (Phase 1c)

```
Implement Phase 1c from docs/consolidation-gate-spec.md: stage S3 (Evaluation) and the PromotionPolicy (rules P1 to P6, section 7).

Requirements:
- Build the STAGED version as ACTIVE plus admitted candidates, without mutating ACTIVE.
- Run TARGET, REGRESSION and PROBE suites for both ACTIVE and STAGED through AgentRunner and the existing EvalHarness, with identical k and seeds. Compute pass@k and pass^k with the existing AggregatedEvalResult logic. Reuse CodeBasedGrader wherever grading can be code-based.
- PromotionPolicy is a pure function: (active results, staged results, TrustScore deltas, config) -> list of failed rules. It returns every failed rule, not just the first.
- Enforce minSuiteSize (SUITE_TOO_SMALL).
- Frozen suites are read-only to agents and to the candidate generator; if the repo has a place to enforce that, do so and tell me where.

Tests with a fake AgentRunner: regression beyond maxRegression is BLOCKED; PROBE failure is BLOCKED even if everything else improves; boundary values at exactly maxRegression; undersized suite; policy purity (same inputs, same output).
Show the file list first. Stop after this phase.
```

---

## Prompt 4: Attestation, approval, rollback, API (Phase 1d)

```
Implement Phase 1d from docs/consolidation-gate-spec.md: AttestationService, approval flow, rollback, pruning, and the REST endpoints in section 9.

Requirements:
- Hash-chained records: recordHash = SHA-256 over deterministic canonical JSON (sorted keys). Tell me which Jackson settings or custom serializer you used and which I should verify in the docs.
- Signer: default dev implementation using JDK Ed25519; interface must allow a KMS/HSM implementation later. Tell me which JDK APIs you used so I can verify them.
- Record content hashes only, never candidate content.
- Approval requires an elevated role and a different person than the submitter when four-eyes is enabled.
- Rollback moves the active pointer to the parent, marks the version ROLLED_BACK, writes a ROLLBACK attestation, and never edits or deletes versions.
- Pruning: consolidated candidates leave the buffer; quarantined items stay; a released quarantine item re-enters at S1.
- Endpoints follow existing API, error and authZ conventions.

Tests: chain verification; tamper detection for each field; identical inputs give identical hash; four-eyes; rollback; release-from-quarantine re-runs S1; one Spring test per endpoint group.
Show the file list first. Stop after this phase.
```

---

## Prompt 5: MEMORY_INTEGRITY in shadow mode and baseline epochs (Phase 1e)

```
Implement Phase 1e from docs/consolidation-gate-spec.md section 8.

Requirements:
- MemoryIntegrityScorer computes MEMORY_INTEGRITY from the four code-computed inputs with configurable weights. It must have no dependency on the judge or any LLM client.
- Register it as a TrustScore dimension with aggregate weight 0 (shadow mode) by default, so existing aggregate scores do not change. Prove that with a test comparing aggregate scores before and after.
- Add an architecture test (ArchUnit if available, otherwise an equivalent) asserting the scoring package does not depend on the judge package.
- Baseline epochs: key the TRAJECTORY_INTEGRITY baseline by memoryVersionId if the existing service supports it, and mark warmup=true until minTracesForBaseline. If the service cannot do this, do not hack around it: document the limitation in docs/ and tell me.

Tests: deterministic scoring; boundary values; shadow-mode invariance; warmup flag behaviour.
Show the file list first.
```

---

## Prompt 6: Review pass (no new features)

```
Review the whole Consolidation Gate implementation against docs/consolidation-gate-spec.md sections 4 (hard rules) and 11 (acceptance criteria). For each rule R1 to R7 and each acceptance criterion, state PASS or FAIL with the file and line that proves it. List anything in the spec that was not implemented, anything implemented that the spec did not ask for, and any threshold hard-coded as a constant. Do not change code in this step.
```

---

## Notes for you (not for Copilot)

- Copilot will produce plausible-looking code. Review every stage against rules R1 to R3 yourself; those are the ones that matter most.
- The default thresholds in the spec are guesses. Plan a calibration run on replayed historical traces before trusting any promotion decision.
- The quality of the frozen suites decides how much this gate protects. Budget time to build them.
- If you later write a patent or invention disclosure from this, keep it separate from this implementation spec and have JPMC's IP team review it first. The sleep-style consolidation idea itself is already published.
