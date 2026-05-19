import type { RuntimeWorkflowKind } from "../common.js";
import type { RetryPolicy } from "./retry-policy.js";
import { computeRetryDecision } from "./retry-policy.js";
import type { RuntimeFailure } from "./runtime-failure.js";
import { classifyProviderError, createRuntimeFailure } from "./runtime-failure.js";

export interface ExecutionGuardOptions {
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  operation: string;
  workflow?: RuntimeWorkflowKind;
}

export interface GuardedExecutionResult<T> {
  success: boolean;
  result?: T;
  failure?: RuntimeFailure;
  attempts: number;
  totalDurationMs: number;
}

function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operation: string,
  workflow?: RuntimeWorkflowKind
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const failureOpts: { workflow?: RuntimeWorkflowKind; details: Record<string, unknown> } = {
        details: { timeoutMs, operation }
      };
      if (workflow) failureOpts.workflow = workflow;

      reject(
        createRuntimeFailure(
          "timeout",
          "TIMEOUT",
          `Operation '${operation}' exceeded ${timeoutMs}ms deadline.`,
          failureOpts
        )
      );
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeWithGuard<T>(
  fn: () => Promise<T>,
  options: ExecutionGuardOptions
): Promise<GuardedExecutionResult<T>> {
  const startedAt = Date.now();
  let lastFailure: RuntimeFailure | undefined;
  let attempt = 0;

  while (true) {
    try {
      const result = await withTimeout(fn, options.timeoutMs, options.operation, options.workflow);
      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalDurationMs: Date.now() - startedAt
      };
    } catch (error) {
      if (error && typeof error === "object" && "kind" in error && "code" in error) {
        lastFailure = error as RuntimeFailure;
      } else {
        const classifyOpts: { workflow?: RuntimeWorkflowKind; operation?: string } = {};
        if (options.workflow) classifyOpts.workflow = options.workflow;
        classifyOpts.operation = options.operation;
        lastFailure = classifyProviderError(error, classifyOpts);
      }

      const decision = computeRetryDecision(options.retryPolicy, lastFailure, attempt);

      if (!decision.shouldRetry) {
        const result: GuardedExecutionResult<T> = {
          success: false,
          attempts: attempt + 1,
          totalDurationMs: Date.now() - startedAt
        };
        if (lastFailure) result.failure = lastFailure;
        return result;
      }

      await delay(decision.delayMs);
      attempt += 1;
    }
  }
}
