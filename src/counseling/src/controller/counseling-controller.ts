import {
  counselingFinishRequestSchema,
  counselingGetRequestSchema,
  counselingListRequestSchema,
  counselingListResponseSchema,
  counselingReportRequestSchema,
  counselingReplyRequestSchema,
  counselingStartRequestSchema,
  type CounselingFinishResponse,
  type CounselingGetResponse,
  type CounselingListRequest,
  type CounselingListResponse,
  type CounselingReportResponse,
  type CounselingReplyResponse,
  type CounselingStartResponse,
  type ErrorEnvelope
} from "@psyai/contracts";

import {
  CounselingRuntimeRetryExhaustedError,
  CounselingRuntimeTimeoutError,
  CounselingRuntimeUnavailableError,
  CounselingSessionNotFoundError,
  CounselingSessionStateError
} from "../errors.js";
import type { CounselingUseCases } from "../application/counseling-use-cases.js";

type CounselingControllerResult<TSuccess> = Promise<TSuccess | ErrorEnvelope>;

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

export interface CounselingController {
  start(input: unknown, occurredAt?: string): CounselingControllerResult<CounselingStartResponse>;
  reply(input: unknown, occurredAt?: string): CounselingControllerResult<CounselingReplyResponse>;
  finish(input: unknown, occurredAt?: string): CounselingControllerResult<CounselingFinishResponse>;
  get(input: unknown, occurredAt?: string): CounselingControllerResult<CounselingGetResponse>;
  list(input: unknown, occurredAt?: string): CounselingControllerResult<CounselingListResponse>;
  getReportStatus(
    input: unknown,
    occurredAt?: string
  ): CounselingControllerResult<CounselingReportResponse>;
}

export interface CreateCounselingControllerOptions {
  useCases: CounselingUseCases;
  now?: () => string;
}

function toListQuery(
  request: CounselingListRequest
): import("../ports/counseling-session-repository.js").CounselingSessionListQuery {
  return {
    ...(request.status ? { status: request.status } : {}),
    ...(request.page !== undefined ? { page: request.page } : {}),
    ...(request.pageSize !== undefined ? { pageSize: request.pageSize } : {})
  };
}

function toPageInfo(
  request: CounselingListRequest,
  totalItems: number
): CounselingListResponse["data"]["pageInfo"] {
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

function mapError(error: unknown, timestamp: string): ErrorEnvelope {
  if (error instanceof CounselingSessionNotFoundError) {
    return createErrorEnvelope(
      "counseling.session_not_found",
      error.message,
      timestamp,
      "recoverable",
      { sessionId: error.sessionId }
    );
  }

  if (error instanceof CounselingRuntimeTimeoutError) {
    return createErrorEnvelope(
      "runtime.provider_timeout",
      error.message,
      timestamp,
      "recoverable"
    );
  }

  if (error instanceof CounselingRuntimeRetryExhaustedError) {
    return createErrorEnvelope(
      "runtime.provider_unavailable",
      error.message,
      timestamp,
      "non_recoverable",
      { operation: error.operation, attempts: error.attempts }
    );
  }

  if (error instanceof CounselingRuntimeUnavailableError) {
    return createErrorEnvelope(
      "runtime.unavailable",
      error.message,
      timestamp,
      "recoverable"
    );
  }

  if (error instanceof CounselingSessionStateError) {
    return createErrorEnvelope(
      "validation.invalid_payload",
      error.message,
      timestamp,
      "recoverable"
    );
  }

  return createErrorEnvelope(
    "validation.invalid_payload",
    error instanceof Error ? error.message : "Unknown counseling controller error",
    timestamp,
    "recoverable"
  );
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

export function createCounselingController(
  options: CreateCounselingControllerOptions
): CounselingController {
  const now = options.now ?? (() => new Date().toISOString());

  return {
    start(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        counselingStartRequestSchema,
        (payload) => options.useCases.startSession(payload, occurredAt)
      );
    },
    reply(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        counselingReplyRequestSchema,
        (payload) => options.useCases.replyToSession(payload, occurredAt)
      );
    },
    finish(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        counselingFinishRequestSchema,
        (payload) => options.useCases.finishSession(payload, occurredAt)
      );
    },
    get(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        counselingGetRequestSchema,
        (payload) => options.useCases.getSession(payload)
      );
    },
    list(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        counselingListRequestSchema,
        async (payload) => {
          const result = await options.useCases.listSessions(toListQuery(payload));
          return {
            items: result.items.map((item) => ({
              sessionId: item.sessionId,
              status: item.status as CounselingListResponse["data"]["items"][number]["status"],
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              ...(item.riskLevel ? { riskLevel: item.riskLevel as CounselingListResponse["data"]["items"][number]["riskLevel"] } : {}),
              turnCount: item.turnCount
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
        counselingReportRequestSchema,
        (payload) => options.useCases.getReportStatus(payload)
      );
    }
  };
}
