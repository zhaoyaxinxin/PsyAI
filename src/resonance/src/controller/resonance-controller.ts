import {
  resonanceAnalyzeRequestSchema,
  resonanceCompareRequestSchema,
  resonanceDetailRequestSchema,
  resonanceInputRequestSchema,
  resonanceListRequestSchema,
  resonanceMatchesRequestSchema,
  resonanceReportRequestSchema,
  type ErrorEnvelope,
  type ResonanceAnalyzeResponse,
  type ResonanceCompareResponse,
  type ResonanceDetailResponse,
  type ResonanceInputResponse,
  type ResonanceListRequest,
  type ResonanceListResponse,
  type ResonanceMatchesResponse,
  type ResonanceReportResponse
} from "@psyai/contracts";

import {
  ResonanceComparisonNotFoundError,
  ResonanceInputNotFoundError,
  ResonanceRetrievalRetryExhaustedError,
  ResonanceRetrievalTimeoutError,
  ResonanceRuntimeUnavailableError
} from "../errors.js";
import type { ResonanceUseCases } from "../application/resonance-use-cases.js";

type ResonanceControllerResult<TSuccess> = Promise<TSuccess | ErrorEnvelope>;

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

export interface ResonanceController {
  submitInput(
    input: unknown,
    occurredAt?: string
  ): ResonanceControllerResult<ResonanceInputResponse>;
  analyzeInput(
    input: unknown,
    occurredAt?: string
  ): ResonanceControllerResult<ResonanceAnalyzeResponse>;
  compare(
    input: unknown,
    occurredAt?: string
  ): ResonanceControllerResult<ResonanceCompareResponse>;
  getMatches(
    input: unknown,
    occurredAt?: string
  ): ResonanceControllerResult<ResonanceMatchesResponse>;
  getDetail(
    input: unknown,
    occurredAt?: string
  ): ResonanceControllerResult<ResonanceDetailResponse>;
  list(
    input: unknown,
    occurredAt?: string
  ): ResonanceControllerResult<ResonanceListResponse>;
  getReportStatus(
    input: unknown,
    occurredAt?: string
  ): ResonanceControllerResult<ResonanceReportResponse>;
}

export interface CreateResonanceControllerOptions {
  useCases: ResonanceUseCases;
  now?: () => string;
}

function toListQuery(
  request: ResonanceListRequest
): import("../ports/resonance-repository.js").ResonanceListQuery {
  return {
    ...(request.page !== undefined ? { page: request.page } : {}),
    ...(request.pageSize !== undefined ? { pageSize: request.pageSize } : {})
  };
}

function toPageInfo(
  request: ResonanceListRequest,
  totalItems: number
): ResonanceListResponse["data"]["pageInfo"] {
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
  if (error instanceof ResonanceInputNotFoundError) {
    return createErrorEnvelope(
      "resonance.input_not_found",
      error.message,
      timestamp,
      "recoverable",
      { inputId: error.inputId }
    );
  }

  if (error instanceof ResonanceRetrievalTimeoutError) {
    return createErrorEnvelope(
      "runtime.provider_timeout",
      error.message,
      timestamp,
      "recoverable"
    );
  }

  if (error instanceof ResonanceRetrievalRetryExhaustedError) {
    return createErrorEnvelope(
      "runtime.provider_unavailable",
      error.message,
      timestamp,
      "non_recoverable",
      { operation: error.operation, attempts: error.attempts }
    );
  }

  if (error instanceof ResonanceRuntimeUnavailableError) {
    return createErrorEnvelope(
      "runtime.unavailable",
      error.message,
      timestamp,
      "recoverable"
    );
  }

  if (error instanceof ResonanceComparisonNotFoundError) {
    return createErrorEnvelope(
      "validation.invalid_payload",
      error.message,
      timestamp,
      "recoverable",
      { comparisonId: error.comparisonId }
    );
  }

  return createErrorEnvelope(
    "validation.invalid_payload",
    error instanceof Error ? error.message : "Unknown resonance controller error",
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

export function createResonanceController(
  options: CreateResonanceControllerOptions
): ResonanceController {
  const now = options.now ?? (() => new Date().toISOString());

  return {
    submitInput(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        resonanceInputRequestSchema,
        (payload) => options.useCases.submitInput(payload, occurredAt)
      );
    },
    analyzeInput(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        resonanceAnalyzeRequestSchema,
        (payload) => options.useCases.analyzeInput(payload, occurredAt)
      );
    },
    compare(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        resonanceCompareRequestSchema,
        (payload) => options.useCases.compare(payload, occurredAt)
      );
    },
    getMatches(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        resonanceMatchesRequestSchema,
        (payload) => options.useCases.getMatches(payload)
      );
    },
    getDetail(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        resonanceDetailRequestSchema,
        (payload) => options.useCases.getDetail(payload)
      );
    },
    list(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        resonanceListRequestSchema,
        async (payload) => {
          const result = await options.useCases.listComparisons(toListQuery(payload));
          return {
            items: result.items.map((item) => ({
              comparisonId: item.comparisonId,
              inputId: item.inputId,
              ...(item.inputPreview ? { inputPreviewText: item.inputPreview } : {}),
              status: item.status as ResonanceListResponse["data"]["items"][number]["status"],
              createdAt: item.createdAt,
              reportReady: item.reportReady
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
        resonanceReportRequestSchema,
        (payload) => options.useCases.getReportStatus(payload)
      );
    }
  };
}
