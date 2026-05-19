import type { RuntimeFailureKind } from "./runtime-failure.js";

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableKinds: RuntimeFailureKind[];
}

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  attempt: number;
}

export function computeRetryDecision(
  policy: RetryPolicy,
  failure: { kind: RuntimeFailureKind },
  attempt: number
): RetryDecision {
  if (attempt >= policy.maxRetries) {
    return {
      shouldRetry: false,
      delayMs: 0,
      attempt
    };
  }

  if (!policy.retryableKinds.includes(failure.kind)) {
    return {
      shouldRetry: false,
      delayMs: 0,
      attempt
    };
  }

  const rawDelay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt);
  const delayMs = Math.min(rawDelay, policy.maxDelayMs);

  return {
    shouldRetry: true,
    delayMs,
    attempt
  };
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  retryableKinds: ["transient", "timeout", "rate_limited"]
};
