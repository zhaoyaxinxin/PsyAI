import type { RuntimeWorkflowKind } from "../common.js";

export type RuntimeFailureKind =
  | "transient"
  | "permanent"
  | "fatal"
  | "timeout"
  | "rate_limited";

export interface RuntimeFailure {
  kind: RuntimeFailureKind;
  code: string;
  message: string;
  retryable: boolean;
  occurredAt: string;
  workflow?: RuntimeWorkflowKind;
  details?: Record<string, unknown>;
}

export function isRetryableFailure(failure: RuntimeFailure): boolean {
  return failure.kind === "transient" || failure.kind === "timeout" || failure.kind === "rate_limited";
}

export function createRuntimeFailure(
  kind: RuntimeFailureKind,
  code: string,
  message: string,
  options: {
    occurredAt?: string;
    workflow?: RuntimeWorkflowKind;
    details?: Record<string, unknown>;
  } = {}
): RuntimeFailure {
  return {
    kind,
    code,
    message,
    retryable: isRetryableFailure({ kind, code, message, retryable: false, occurredAt: options.occurredAt ?? "" }),
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    ...(options.workflow ? { workflow: options.workflow } : {}),
    ...(options.details ? { details: options.details } : {})
  };
}

/**
 * Classify a raw provider error into a structured RuntimeFailure.
 *
 * Inspects error name, message, and status-like properties to determine
 * the appropriate failure kind and code. Provider-agnostic: works with
 * any Error-like object.
 */
function failureOptions(
  occurredAt: string,
  workflow?: RuntimeWorkflowKind,
  operation?: string
): { occurredAt: string; workflow?: RuntimeWorkflowKind; details?: Record<string, unknown> } {
  const result: { occurredAt: string; workflow?: RuntimeWorkflowKind; details?: Record<string, unknown> } = {
    occurredAt
  };
  if (workflow) result.workflow = workflow;
  if (operation) result.details = { operation };
  return result;
}

export function classifyProviderError(
  error: unknown,
  options?: {
    workflow?: RuntimeWorkflowKind;
    operation?: string;
  }
): RuntimeFailure {
  const occurredAt = new Date().toISOString();
  const opts = failureOptions(occurredAt, options?.workflow, options?.operation);

  if (error && typeof error === "object" && "kind" in error && "code" in error) {
    const existing = error as RuntimeFailure;
    const merged: RuntimeFailure = { ...existing };
    if (options?.workflow && !existing.workflow) merged.workflow = options.workflow;
    if (options?.operation) {
      merged.details = { ...existing.details, operation: options.operation };
    }
    return merged;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown provider error";

  const errorName = error instanceof Error ? error.name : "";

  if (
    errorName === "TimeoutError" ||
    errorName === "AbortError" ||
    message.toLowerCase().includes("timeout") ||
    message.toLowerCase().includes("timed out")
  ) {
    return createRuntimeFailure("timeout", "PROVIDER_TIMEOUT", message, opts);
  }

  if (
    message.includes("429") ||
    message.includes("rate") ||
    message.includes("Rate") ||
    errorName === "RateLimitError"
  ) {
    return createRuntimeFailure("rate_limited", "PROVIDER_RATE_LIMITED", message, opts);
  }

  if (
    errorName === "NetworkError" ||
    errorName === "FetchError" ||
    errorName === "ECONNREFUSED" ||
    errorName === "ENOTFOUND" ||
    errorName === "ETIMEDOUT" ||
    message.includes("ECONN") ||
    message.includes("fetch failed") ||
    message.includes("network")
  ) {
    return createRuntimeFailure("transient", "PROVIDER_UNAVAILABLE", message, opts);
  }

  if (
    errorName === "SyntaxError" ||
    errorName === "TypeError" ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("400") ||
    message.includes("invalid")
  ) {
    return createRuntimeFailure("permanent", "PROVIDER_BAD_REQUEST", message, opts);
  }

  if (
    errorName === "RangeError" ||
    errorName === "ReferenceError" ||
    message.includes("500") ||
    message.includes("503") ||
    message.includes("crash")
  ) {
    return createRuntimeFailure("fatal", "PROVIDER_FATAL", message, opts);
  }

  return createRuntimeFailure("fatal", "PROVIDER_UNKNOWN", message, opts);
}
