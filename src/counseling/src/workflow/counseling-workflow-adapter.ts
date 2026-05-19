import {
  CounselingRuntimeRetryExhaustedError,
  CounselingRuntimeTimeoutError,
  CounselingRuntimeUnavailableError
} from "../errors.js";
import type {
  CounselingRuntimePort,
  CounselingRuntimeReplyInput,
  CounselingRuntimeReplyOutput,
  CounselingRuntimeStartInput,
  CounselingRuntimeStartOutput
} from "../ports/counseling-runtime-port.js";
import type { CounselingSession } from "../session/counseling-session.js";

// ── Retry / timeout configuration ───────────────────────────────────

export interface CounselingRuntimeRetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export const DEFAULT_COUNSELING_RETRY_POLICY: CounselingRuntimeRetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  timeoutMs: 30000
};

// ── Adapter ─────────────────────────────────────────────────────────

export interface CounselingWorkflowAdapter {
  start(input: CounselingRuntimeStartInput): Promise<CounselingRuntimeStartOutput>;
  reply(
    session: CounselingSession,
    message: string,
    occurredAt: string
  ): Promise<CounselingRuntimeReplyOutput>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyRuntimeError(error: unknown, operation: string): Error {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out") || error.name === "TimeoutError") {
      return new CounselingRuntimeTimeoutError(
        `Counseling runtime timeout during ${operation}: ${error.message}`
      );
    }
  }
  return new CounselingRuntimeUnavailableError(
    error instanceof Error
      ? `Counseling runtime failed during ${operation}: ${error.message}`
      : `Counseling runtime failed during ${operation}`
  );
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: CounselingRuntimeRetryPolicy,
  operation: string
): Promise<T> {
  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= policy.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = classifyRuntimeError(error, operation);

      if (attempt >= policy.maxRetries) {
        throw new CounselingRuntimeRetryExhaustedError(
          operation,
          policy.maxRetries + 1,
          lastError.message
        );
      }

      if (lastError instanceof CounselingRuntimeTimeoutError) {
        throw lastError;
      }

      const computedDelay = Math.min(
        policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt),
        policy.maxDelayMs
      );

      await delay(computedDelay);
      attempt += 1;
    }
  }

  throw lastError ?? new CounselingRuntimeUnavailableError(`Counseling runtime exhausted during ${operation}`);
}

export interface CreateCounselingWorkflowAdapterOptions {
  runtime: CounselingRuntimePort;
  retryPolicy?: CounselingRuntimeRetryPolicy;
}

export function createCounselingWorkflowAdapter(
  runtimeOrOptions: CounselingRuntimePort | CreateCounselingWorkflowAdapterOptions
): CounselingWorkflowAdapter {
  const runtime: CounselingRuntimePort =
    "runtime" in runtimeOrOptions ? runtimeOrOptions.runtime : runtimeOrOptions;
  const retryPolicy: CounselingRuntimeRetryPolicy =
    "retryPolicy" in runtimeOrOptions && runtimeOrOptions.retryPolicy
      ? runtimeOrOptions.retryPolicy
      : DEFAULT_COUNSELING_RETRY_POLICY;

  return {
    async start(input) {
      return executeWithRetry(
        () => runtime.start(input),
        retryPolicy,
        "start"
      );
    },
    async reply(session, message, occurredAt) {
      const runtimeInput: CounselingRuntimeReplyInput = {
        message,
        history: [...session.turns],
        occurredAt,
        ...(session.latestAnalysis ? { latestAnalysis: session.latestAnalysis } : {})
      };

      return executeWithRetry(
        () => runtime.reply(runtimeInput),
        retryPolicy,
        "reply"
      );
    }
  };
}
