import {
  SimulationRuntimeRetryExhaustedError,
  SimulationRuntimeTimeoutError,
  SimulationRuntimeUnavailableError
} from "../errors.js";
import type {
  SimulationRuntimePrepareInput,
  SimulationRuntimePrepareOutput,
  SimulationRuntimeAdvanceInput,
  SimulationRuntimeOutput,
  SimulationRuntimePort,
  SimulationRuntimeStartInput
} from "../ports/simulation-runtime-port.js";

// ── Retry / timeout configuration ───────────────────────────────────

export interface SimulationRuntimeRetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export const DEFAULT_SIMULATION_RETRY_POLICY: SimulationRuntimeRetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  timeoutMs: 30000
};

// ── Adapter ─────────────────────────────────────────────────────────

export interface SimulationWorkflowAdapter {
  prepare?(input: SimulationRuntimePrepareInput): Promise<SimulationRuntimePrepareOutput>;
  start(input: SimulationRuntimeStartInput): Promise<SimulationRuntimeOutput>;
  advance(input: SimulationRuntimeAdvanceInput): Promise<SimulationRuntimeOutput>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyRuntimeError(error: unknown, operation: string): Error {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out") || error.name === "TimeoutError") {
      return new SimulationRuntimeTimeoutError(
        `Simulation runtime timeout during ${operation}: ${error.message}`
      );
    }
  }
  return new SimulationRuntimeUnavailableError(
    error instanceof Error
      ? `Simulation runtime failed during ${operation}: ${error.message}`
      : `Simulation runtime failed during ${operation}`
  );
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: SimulationRuntimeRetryPolicy,
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
        throw new SimulationRuntimeRetryExhaustedError(
          operation,
          policy.maxRetries + 1,
          lastError.message
        );
      }

      if (lastError instanceof SimulationRuntimeTimeoutError) {
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

  throw lastError ?? new SimulationRuntimeUnavailableError(`Simulation runtime exhausted during ${operation}`);
}

export interface CreateSimulationWorkflowAdapterOptions {
  runtime: SimulationRuntimePort;
  retryPolicy?: SimulationRuntimeRetryPolicy;
}

export function createSimulationWorkflowAdapter(
  runtimeOrOptions: SimulationRuntimePort | CreateSimulationWorkflowAdapterOptions
): SimulationWorkflowAdapter {
  const runtime: SimulationRuntimePort =
    "runtime" in runtimeOrOptions ? runtimeOrOptions.runtime : runtimeOrOptions;
  const retryPolicy: SimulationRuntimeRetryPolicy =
    "retryPolicy" in runtimeOrOptions && runtimeOrOptions.retryPolicy
      ? runtimeOrOptions.retryPolicy
      : DEFAULT_SIMULATION_RETRY_POLICY;

  return {
    async prepare(input) {
      if (!runtime.prepare) {
        return {
          summary: `${input.scenarioTitle} 的准备阶段已装配完成。`
        };
      }
      return executeWithRetry(
        () => runtime.prepare!(input),
        retryPolicy,
        "prepare"
      );
    },
    async start(input) {
      return executeWithRetry(
        () => runtime.start(input),
        retryPolicy,
        "start"
      );
    },
    async advance(input) {
      return executeWithRetry(
        () => runtime.advance(input),
        retryPolicy,
        "advance"
      );
    }
  };
}
