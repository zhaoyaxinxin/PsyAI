import type {
  RuntimeFailureKind,
  RuntimeFailure,
  RetryPolicy,
  RetryDecision,
  TimeoutContext,
  RiskAnalysisOutput,
  RiskLevel,
  EscalationLevel,
  RiskSignal,
  RiskRecommendation,
  ProviderExtension
} from "../provider/index.js";
import {
  computeRetryDecision,
  isTimedOut,
  DEFAULT_RETRY_POLICY
} from "../provider/index.js";

// ── Fake Retry Handler ─────────────────────────────────────────────

export class FakeRetryHandler {
  readonly policy: RetryPolicy;
  #attempts = new Map<string, number>();
  #failures: RuntimeFailure[] = [];

  constructor(policy: RetryPolicy = DEFAULT_RETRY_POLICY) {
    this.policy = policy;
  }

  shouldRetry(operationKey: string, failure: RuntimeFailure): RetryDecision {
    const attempt = this.#attempts.get(operationKey) ?? 0;
    this.#failures.push(failure);
    const decision = computeRetryDecision(this.policy, failure, attempt);

    if (decision.shouldRetry) {
      this.#attempts.set(operationKey, attempt + 1);
    }

    return decision;
  }

  reset(operationKey: string): void {
    this.#attempts.delete(operationKey);
  }

  get failureHistory(): RuntimeFailure[] {
    return [...this.#failures];
  }
}

// ── Fake Timeout Guard ────────────────────────────────────────────

export class FakeTimeoutGuard {
  #defaultDeadlineMs: number;

  constructor(defaultDeadlineMs: number = 30000) {
    this.#defaultDeadlineMs = defaultDeadlineMs;
  }

  check(context: TimeoutContext, now?: string): boolean {
    return isTimedOut(context, now);
  }

  createContext(
    operation: string,
    deadlineMs?: number,
    startedAt?: string
  ): TimeoutContext {
    return {
      deadlineMs: deadlineMs ?? this.#defaultDeadlineMs,
      startedAt: startedAt ?? new Date().toISOString(),
      operation
    };
  }
}

// ── Fake Risk Analyzer ─────────────────────────────────────────────

export class FakeRiskAnalyzer {
  async analyze(
    workflow: "counseling" | "simulation" | "resonance",
    raw: unknown,
    occurredAt?: string
  ): Promise<RiskAnalysisOutput> {
    const text =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object"
          ? JSON.stringify(raw)
          : String(raw);
    const hasUrgent = text.includes("urgent") || text.includes("crisis");
    const hasHigh = text.includes("high") || text.includes("escalate");
    const hasLow = text.includes("low") || text.includes("normal");
    const riskLevel: RiskLevel = hasUrgent ? "urgent" : hasHigh ? "high" : hasLow ? "low" : "moderate";
    const escalationLevel: EscalationLevel = hasUrgent
      ? "urgent"
      : hasHigh
        ? "escalate"
        : hasLow
          ? "none"
          : "monitor";

    const signals: RiskSignal[] = [];

    if (riskLevel !== "low") {
      signals.push({
        signalId: `fake-signal-${workflow}-001`,
        riskLevel,
        escalationLevel,
        reason: `Detected ${riskLevel} risk from ${workflow} analysis.`,
        detectedAt: occurredAt ?? new Date().toISOString(),
        ...(escalationLevel === "urgent"
          ? {
              boundaryNotice:
                "This analysis does not constitute emergency support. Escalate to human assistance."
            }
          : {})
      });
    }

    const recommendations: RiskRecommendation[] = [];

    if (escalationLevel === "urgent") {
      recommendations.push({
        recommendationId: `fake-rec-${workflow}-001`,
        title: "Immediate human escalation",
        rationale: "Urgent risk signals detected; AI-only path is insufficient.",
        priority: "now"
      });
    } else if (escalationLevel === "escalate") {
      recommendations.push({
        recommendationId: `fake-rec-${workflow}-001`,
        title: "Plan supported follow-up",
        rationale: "Elevated risk signals detected; schedule human review.",
        priority: "now"
      });
    } else {
      recommendations.push({
        recommendationId: `fake-rec-${workflow}-001`,
        title: "Continue monitoring",
        rationale: "No elevated risk detected; maintain routine observation.",
        priority: "later"
      });
    }

    return {
      workflow,
      schemaId: `runtime.risk.${workflow}`,
      schemaVersion: "v1",
      riskLevel,
      escalationLevel,
      signals,
      recommendations,
      summary: `Risk analysis for ${workflow} workflow: ${riskLevel} risk, ${signals.length} signal(s).`,
      occurredAt: occurredAt ?? new Date().toISOString(),
      confidence: 0.66
    };
  }
}

// ── Fake Provider Extension ────────────────────────────────────────

export function createFakeProviderExtension(
  providerId: string,
  capabilities: string[] = []
): ProviderExtension {
  return {
    providerId,
    providerVersion: "fake-v1",
    capabilities: capabilities.map((name) => ({
      name,
      version: "v1",
      description: `Fake implementation of ${name}.`
    })),
    metadata: {
      mode: "fake",
      provider: providerId
    }
  };
}
