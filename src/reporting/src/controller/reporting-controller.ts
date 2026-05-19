import type { ReportExportFormat } from "@psyai/contracts";
import { z } from "zod";

import type { ReportingUseCases } from "../application/reporting-use-cases.js";
import {
  ReportExportUnsupportedFormatError,
  ReportNotFoundError
} from "../errors.js";
import type {
  ReportExportData,
  ReportListData,
  ReportStatusData,
  ReportingReport
} from "../reporting-types.js";

export interface ReportingSuccessEnvelope<TData> {
  status: "ok";
  timestamp: string;
  data: TData;
}

export interface ReportingErrorEnvelope {
  status: "error";
  timestamp: string;
  error: {
    code:
      | "validation.invalid_payload"
      | "report.not_found"
      | "report.export_unsupported_format";
    message: string;
    recoverability: "recoverable";
    details?: Record<string, unknown>;
  };
}

type ReportingControllerResult<TData> = Promise<
  ReportingSuccessEnvelope<TData> | ReportingErrorEnvelope
>;

const reportingWorkflowSchema = z.enum(["simulation", "resonance", "counseling"]);
const reportIdRequestSchema = z.object({
  reportId: z.string().min(1)
});
const reportListRequestSchema = z.object({
  workflow: reportingWorkflowSchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional()
});
const reportExportRequestSchema = reportIdRequestSchema.extend({
  format: z.enum(["json", "markdown", "html", "pdf"])
});

type ReportIdRequest = z.infer<typeof reportIdRequestSchema>;
type ReportListRequest = z.infer<typeof reportListRequestSchema>;
type ReportExportRequest = z.infer<typeof reportExportRequestSchema>;

type ValidationIssue = {
  path: Array<string | number>;
  message: string;
};

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

export interface ReportingController {
  getReport(
    input: unknown,
    occurredAt?: string
  ): ReportingControllerResult<ReportingReport>;
  listReports(
    input: unknown,
    occurredAt?: string
  ): ReportingControllerResult<ReportListData>;
  getReportStatus(
    input: unknown,
    occurredAt?: string
  ): ReportingControllerResult<ReportStatusData>;
  exportReport(
    input: unknown,
    occurredAt?: string
  ): ReportingControllerResult<ReportExportData>;
}

export interface CreateReportingControllerOptions {
  useCases: ReportingUseCases;
  now?: () => string;
}

function createErrorEnvelope(
  code: ReportingErrorEnvelope["error"]["code"],
  message: string,
  timestamp: string,
  details?: Record<string, unknown>
): ReportingErrorEnvelope {
  return {
    status: "error",
    timestamp,
    error: {
      code,
      message,
      recoverability: "recoverable",
      ...(details ? { details } : {})
    }
  };
}

function createValidationErrorEnvelope(
  issues: ValidationIssue[],
  timestamp: string
): ReportingErrorEnvelope {
  return createErrorEnvelope(
    "validation.invalid_payload",
    "Request payload failed validation",
    timestamp,
    {
      issues: issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    }
  );
}

function mapError(
  error: unknown,
  timestamp: string
): ReportingErrorEnvelope {
  if (error instanceof ReportNotFoundError) {
    return createErrorEnvelope(
      "report.not_found",
      error.message,
      timestamp,
      { reportId: error.reportId }
    );
  }

  if (error instanceof ReportExportUnsupportedFormatError) {
    return createErrorEnvelope(
      "report.export_unsupported_format",
      error.message,
      timestamp,
      { format: error.format }
    );
  }

  return createErrorEnvelope(
    "validation.invalid_payload",
    error instanceof Error ? error.message : "Unknown reporting controller error",
    timestamp
  );
}

async function runControllerAction<TPayload, TData>(
  input: unknown,
  occurredAt: string,
  schema: SafeParseSchema<TPayload>,
  action: (payload: TPayload) => Promise<TData>
): Promise<ReportingSuccessEnvelope<TData> | ReportingErrorEnvelope> {
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
    };
  } catch (error) {
    return mapError(error, occurredAt);
  }
}

export function createReportingController(
  options: CreateReportingControllerOptions
): ReportingController {
  const now = options.now ?? (() => new Date().toISOString());

  return {
    getReport(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        reportIdRequestSchema,
        (payload: ReportIdRequest) => options.useCases.getReport(payload.reportId)
      );
    },

    listReports(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        reportListRequestSchema,
        (payload: ReportListRequest) =>
          options.useCases.listReports({
            ...(payload.workflow ? { workflow: payload.workflow } : {}),
            ...(payload.page ? { page: payload.page } : {}),
            ...(payload.pageSize ? { pageSize: payload.pageSize } : {})
          })
      );
    },

    getReportStatus(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        reportIdRequestSchema,
        (payload: ReportIdRequest) => options.useCases.getReportStatus(payload.reportId)
      );
    },

    exportReport(input, occurredAt = now()) {
      return runControllerAction(
        input,
        occurredAt,
        reportExportRequestSchema,
        (payload: ReportExportRequest) =>
          options.useCases.exportReport({
            reportId: payload.reportId,
            format: payload.format as ReportExportFormat,
            occurredAt
          })
      );
    }
  };
}
