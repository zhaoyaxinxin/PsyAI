import { z } from "zod";

import {
  createSuccessEnvelopeSchema,
  entityIdSchema,
  isoDateTimeSchema,
  reportReferenceSchema,
  workflowKindSchema
} from "./shared.js";

// ── Export format ───────────────────────────────────────────────────

export const exportFormatValues = ["html", "json", "pdf"] as const;
export const exportFormatSchema = z.enum(exportFormatValues);

// ── Export request ──────────────────────────────────────────────────

export const reportExportRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional(),
  reportId: entityIdSchema,
  workflow: workflowKindSchema,
  format: exportFormatSchema
});

// ── Export response ─────────────────────────────────────────────────

export const reportExportResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    reportId: entityIdSchema,
    format: exportFormatSchema,
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    exportedAt: isoDateTimeSchema,
    reference: reportReferenceSchema
  })
);

// ── Batch export request ────────────────────────────────────────────

export const batchExportRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional(),
  reportIds: z.array(
    z.object({
      reportId: entityIdSchema,
      workflow: workflowKindSchema
    })
  ).min(1).max(50),
  format: exportFormatSchema
});

export const batchExportItemSchema = z.object({
  reportId: entityIdSchema,
  fileName: z.string().min(1),
  success: z.boolean(),
  errorCode: z.string().optional()
});

export const batchExportResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    format: exportFormatSchema,
    items: z.array(batchExportItemSchema),
    successCount: z.number().int().nonnegative(),
    failureCount: z.number().int().nonnegative(),
    completedAt: isoDateTimeSchema
  })
);

// ── History pagination (generic wrapper) ────────────────────────────

export const historyRequestSchema = z.object({
  workflow: workflowKindSchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional(),
  dateFrom: isoDateTimeSchema.optional(),
  dateTo: isoDateTimeSchema.optional()
});

export const historyEntrySchema = z.object({
  entryId: entityIdSchema,
  workflow: workflowKindSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  timestamp: isoDateTimeSchema,
  reportReference: reportReferenceSchema.optional(),
  navScene: z.enum(["focus", "route", "report"]).optional(),
  navEntityId: entityIdSchema.optional()
});

export const historyResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    items: z.array(historyEntrySchema),
    pageInfo: z.object({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      totalItems: z.number().int().nonnegative(),
      hasNextPage: z.boolean()
    })
  })
);

// ── Exported types ──────────────────────────────────────────────────

export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type ReportExportRequest = z.infer<typeof reportExportRequestSchema>;
export type ReportExportResponse = z.infer<typeof reportExportResponseSchema>;
export type BatchExportRequest = z.infer<typeof batchExportRequestSchema>;
export type BatchExportItem = z.infer<typeof batchExportItemSchema>;
export type BatchExportResponse = z.infer<typeof batchExportResponseSchema>;
export type HistoryRequest = z.infer<typeof historyRequestSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
