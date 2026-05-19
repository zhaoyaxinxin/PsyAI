import {
  simulationAdvanceRequestSchema,
  simulationNodeRequestSchema,
  simulationFinishRequestSchema,
  simulationFinishResponseSchema,
  simulationListRequestSchema,
  simulationListResponseSchema,
  simulationPrepareRequestSchema,
  simulationReportRequestSchema,
  simulationRunRequestSchema,
  simulationScenarioRequestSchema,
  type ErrorEnvelope,
  type SimulationAdvanceResponse,
  type SimulationFinishResponse,
  type SimulationListRequest,
  type SimulationListResponse,
  type SimulationNodeResponse,
  type SimulationPrepareResponse,
  type SimulationReportResponse,
  type SimulationRunResponse,
  type SimulationScenarioResponse
} from "@psyai/contracts";

import {
  SimulationRunNotFoundError,
  SimulationRunStateError,
  SimulationRuntimeRetryExhaustedError,
  SimulationRuntimeTimeoutError,
  SimulationRuntimeUnavailableError,
  SimulationScenarioNotFoundError
} from "../errors.js";
import type { SimulationUseCases } from "../application/simulation-use-cases.js";

type SimulationControllerResult<TSuccess> = Promise<TSuccess | ErrorEnvelope>;

interface ValidationIssue {
  path: Array<string | number>;
  message: string;
}

interface SafeParseSchema<TPayload> {
  safeParse(input: unknown):
    | {
        success: true;
        data: TPayload;
      }
    | {
        success: false;
        error: {
          issues: ValidationIssue[];
        };
      };
}

export interface SimulationController {
  getScenario(
    input: unknown,
    occurredAt?: string
  ): SimulationControllerResult<SimulationScenarioResponse>;
  prepare(
    input: unknown,
    occurredAt?: string
  ): SimulationControllerResult<SimulationPrepareResponse>;
  createRun(
    input: unknown,
    occurredAt?: string
  ): SimulationControllerResult<SimulationRunResponse>;
  getNode(
    input: unknown,
    occurredAt?: string
  ): SimulationControllerResult<SimulationNodeResponse>;
  advance(
    input: unknown,
    occurredAt?: string
  ): SimulationControllerResult<SimulationAdvanceResponse>;
  finish(
    input: unknown,
    occurredAt?: string
  ): SimulationControllerResult<SimulationFinishResponse>;
  list(
    input: unknown,
    occurredAt?: string
  ): SimulationControllerResult<SimulationListResponse>;
  getReportStatus(
    input: unknown,
    occurredAt?: string
  ): SimulationControllerResult<SimulationReportResponse>;
}

export interface CreateSimulationControllerOptions {
  useCases: SimulationUseCases;
  now?: () => string;
}

function toListQuery(
  request: SimulationListRequest
): import("../ports/simulation-repository.js").SimulationRunListQuery {
  return {
    ...(request.status ? { status: request.status } : {}),
    ...(request.scenarioId ? { scenarioId: request.scenarioId } : {}),
    ...(request.page !== undefined ? { page: request.page } : {}),
    ...(request.pageSize !== undefined ? { pageSize: request.pageSize } : {})
  };
}

function toPageInfo(
  request: SimulationListRequest,
  totalItems: number
): SimulationListResponse["data"]["pageInfo"] {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? 20;

  return {
    page,
    pageSize,
    totalItems,
    hasNextPage: page * pageSize < totalItems
  };
}

function createErrorEnvelope(
  code: ErrorEnvelope["error"]["code"],
  message: string,
  timestamp: string,
  recoverability: ErrorEnvelope["error"]["recoverability"],
  details?: Record<string, unknown>
): ErrorEnvelope {
  return {
    status: "error",
    timestamp,
    error: {
      code,
      message,
      recoverability,
      ...(details ? { details } : {})
    }
  };
}

function createValidationErrorEnvelope(
  issues: ValidationIssue[],
  timestamp: string
): ErrorEnvelope {
  return createErrorEnvelope(
    "validation.invalid_payload",
    "Request payload failed validation",
    timestamp,
    "recoverable",
    {
      issues: issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    }
  );
}

function mapError(error: unknown, timestamp: string): ErrorEnvelope {
  if (error instanceof SimulationRunNotFoundError) {
    return createErrorEnvelope(
      "simulation.run_not_found",
      error.message,
      timestamp,
      "recoverable",
      { runId: error.runId }
    );
  }

  if (error instanceof SimulationRuntimeTimeoutError) {
    return createErrorEnvelope(
      "runtime.provider_timeout",
      error.message,
      timestamp,
      "recoverable"
    );
  }

  if (error instanceof SimulationRuntimeRetryExhaustedError) {
    return createErrorEnvelope(
      "runtime.provider_unavailable",
      error.message,
      timestamp,
      "non_recoverable",
      { operation: error.operation, attempts: error.attempts }
    );
  }

  if (error instanceof SimulationRuntimeUnavailableError) {
    return createErrorEnvelope(
      "runtime.unavailable",
      error.message,
      timestamp,
      "recoverable"
    );
  }

  if (
    error instanceof SimulationScenarioNotFoundError ||
    error instanceof SimulationRunStateError
  ) {
    return createErrorEnvelope(
      "validation.invalid_payload",
      error.message,
      timestamp,
      "recoverable"
    );
  }

  return createErrorEnvelope(
    "validation.invalid_payload",
    error instanceof Error ? error.message : "Unknown simulation controller error",
    timestamp,
    "recoverable"
  );
}

async function runControllerAction<
  TPayload,
  TData,
  TResponse extends { status: "ok"; timestamp: string; data: TData }
>(
  input: unknown,
  occurredAt: string,
  schema: SafeParseSchema<TPayload>,
  action: (payload: TPayload) => Promise<TData>
): Promise<TResponse | ErrorEnvelope> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return createValidationErrorEnvelope(parsed.error.issues, occurredAt);
  }

  try {
    const data = await action(parsed.data);

    return {
      status: "ok",
      timestamp: occurredAt,
      data
    } as TResponse;
  } catch (error) {
    return mapError(error, occurredAt);
  }
}

export function createSimulationController(
  options: CreateSimulationControllerOptions
): SimulationController {
  const now = options.now ?? (() => new Date().toISOString());

  return {
    getScenario(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        simulationScenarioRequestSchema,
        (payload) => options.useCases.getScenario(payload)
      );
    },
    prepare(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        simulationPrepareRequestSchema,
        (payload) => options.useCases.prepareScenario(payload, occurredAt)
      );
    },
    createRun(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        simulationRunRequestSchema,
        (payload) => options.useCases.createRun(payload, occurredAt)
      );
    },
    getNode(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        simulationNodeRequestSchema,
        (payload) => options.useCases.getNode(payload)
      );
    },
    advance(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        simulationAdvanceRequestSchema,
        (payload) => options.useCases.advanceRun(payload, occurredAt)
      );
    },
    finish(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        simulationFinishRequestSchema,
        (payload) => options.useCases.finishRun(payload, occurredAt)
      );
    },
    list(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        simulationListRequestSchema,
        async (payload) => {
          const result = await options.useCases.listRuns(toListQuery(payload));
          return {
            items: result.items.map((item) => ({
              runId: item.runId,
              scenarioId: item.scenarioId,
              scenarioTitle: item.scenarioTitle,
              status: item.status as SimulationListResponse["data"]["items"][number]["status"],
              currentNodeTitle: item.currentNodeTitle,
              ...(item.currentTurnIndex !== undefined ? { currentTurnIndex: item.currentTurnIndex } : {}),
              ...(item.stage ? { stage: item.stage as SimulationListResponse["data"]["items"][number]["stage"] } : {}),
              nodeCount: item.nodeCount,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            })),
            pageInfo: toPageInfo(payload, result.totalItems)
          };
        }
      );
    },
    getReportStatus(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        simulationReportRequestSchema,
        (payload) => options.useCases.getReportStatus(payload)
      );
    }
  };
}
