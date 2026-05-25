import type { DemoScenario } from "../types";

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "scenario-high-risk",
    title: "Scenario 1: High Risk — Auth Service Refactor",
    description:
      "Internal MCP Agent on critical authentication service with active security findings",
    riskLevel: "HIGH",
    expectedDecision: "BLOCK",
    demoNarrative:
      "An internal MCP agent with a troubled history attempts to refactor the authentication service. Watch ARIA detect multi-layered risk and block the change.",
    pr: {
      title: "Authentication Service — Session Management Refactor",
      agentId: "agent-mcp-internal",
      serviceName: "Authentication Service",
      repoName: "auth-service",
      criticality: "CRITICAL",
      linesChanged: 847,
      filesChanged: 12,
      description:
        "Refactored JWT validation logic, session token generation, and added new session invalidation endpoints. Changes span authentication core modules.",
    },
    toolSignals: {
      snyk: {
        status: "CRITICAL",
        highVulns: 1,
        medVulns: 2,
        lowVulns: 0,
        riskScore: 0.85,
        finding:
          "HIGH: JWT secret potentially exposed in log statement (line 247)",
      },
      sonar: {
        status: "WARNING",
        bugs: 1,
        codeSmells: 4,
        riskScore: 0.55,
        finding: "4 code smells, 1 bug in session handler class",
      },
      raven: {
        status: "VIOLATION",
        policies: ["JPMC-SEC-007", "JPMC-AUTH-003"],
        riskScore: 0.9,
        finding: "VIOLATION: Hardcoded credentials pattern detected",
      },
    },
  },
  {
    id: "scenario-medium-risk",
    title: "Scenario 2: Medium Risk — Payment API Enhancement",
    description:
      "Claude agent improving payment retry logic — high-value service requiring review",
    riskLevel: "MEDIUM",
    expectedDecision: "REVIEW",
    demoNarrative:
      "Claude proposes an improvement to payment retry logic. The agent is trustworthy, but the service criticality demands human oversight.",
    pr: {
      title: "Payment API — Exponential Backoff Retry Enhancement",
      agentId: "agent-claude",
      serviceName: "Payment Processing API",
      repoName: "payment-api",
      criticality: "HIGH",
      linesChanged: 234,
      filesChanged: 5,
      description:
        "Added exponential backoff retry logic with jitter for failed payment transactions. Includes new idempotency key handling and dead letter queue integration.",
    },
    toolSignals: {
      snyk: {
        status: "CLEAN",
        highVulns: 0,
        medVulns: 0,
        lowVulns: 1,
        riskScore: 0.1,
        finding:
          "LOW: Informational finding in test dependency (non-production)",
      },
      sonar: {
        status: "WARNING",
        bugs: 0,
        codeSmells: 2,
        riskScore: 0.35,
        finding: "2 minor code smells in RetryHandler class",
      },
      raven: {
        status: "OK",
        policies: [],
        riskScore: 0.05,
        finding: "All JPMC policies passed",
      },
    },
  },
  {
    id: "scenario-low-risk",
    title: "Scenario 3: Low Risk — Utilities Library Update",
    description:
      "GitHub Copilot adding helper functions to a non-critical shared library",
    riskLevel: "LOW",
    expectedDecision: "ALLOW",
    demoNarrative:
      "A trusted agent makes a small, clean change to a low-criticality utility library. ARIA approves with high confidence.",
    pr: {
      title: "Shared Utils — String Sanitization Helper Functions",
      agentId: "agent-copilot",
      serviceName: "Shared Utilities Library",
      repoName: "shared-utils",
      criticality: "LOW",
      linesChanged: 45,
      filesChanged: 2,
      description:
        "Added string sanitization utilities for XSS prevention, URL encoding helpers, and format validation functions. All functions are pure and stateless.",
    },
    toolSignals: {
      snyk: {
        status: "CLEAN",
        highVulns: 0,
        medVulns: 0,
        lowVulns: 0,
        riskScore: 0.0,
        finding: "No vulnerabilities detected",
      },
      sonar: {
        status: "CLEAN",
        bugs: 0,
        codeSmells: 0,
        riskScore: 0.0,
        finding: "All quality gates passed",
      },
      raven: {
        status: "OK",
        policies: [],
        riskScore: 0.0,
        finding: "All policies passed",
      },
    },
  },
];
