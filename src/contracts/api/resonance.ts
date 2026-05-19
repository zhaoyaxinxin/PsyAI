import { z } from "zod";

import {
  createSuccessEnvelopeSchema,
  entityIdSchema,
  hostBootstrapSummarySchema,
  isoDateTimeSchema,
  pageInfoSchema,
  reportReferenceSchema
} from "./shared.js";
import { importResultSchema } from "./import.js";

export const resonanceSourceTypeSchema = z.enum([
  "text",
  "file"
]);

export const resonanceFileReferenceSchema = z.object({
  fileId: entityIdSchema,
  fileName: z.string().min(1),
  mimeType: z.string().min(1)
});

export const resonanceInputRequestSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("text"),
    text: z.string().min(1),
    tags: z.array(z.string().min(1)).max(10).optional()
  }),
  z.object({
    sourceType: z.literal("file"),
    file: resonanceFileReferenceSchema,
    tags: z.array(z.string().min(1)).max(10).optional()
  })
]);

export const resonanceInputResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    inputId: entityIdSchema,
    sourceType: resonanceSourceTypeSchema,
    status: z.literal("accepted"),
    bootstrap: hostBootstrapSummarySchema,
    receivedAt: isoDateTimeSchema,
    previewText: z.string().min(1).optional(),
    file: resonanceFileReferenceSchema.optional(),
    importResult: importResultSchema.optional()
  })
);

export const resonanceCompareRequestSchema = z.object({
  inputId: entityIdSchema,
  candidateSetId: entityIdSchema.optional(),
  topK: z.number().int().min(1).max(20).optional()
});

export const resonanceInputAnalysisSchema = z.object({
  analyzedAt: isoDateTimeSchema,
  summary: z.string().min(1),
  themes: z.array(z.string().min(1)).max(12),
  emotions: z.array(z.string().min(1)).max(12),
  relationships: z.array(z.string().min(1)).max(12),
  conflicts: z.array(z.string().min(1)).max(12),
  defenses: z.array(z.string().min(1)).max(12),
  imagery: z.array(z.string().min(1)).max(12),
  queryTerms: z.array(z.string().min(1)).max(20),
  narrativeSignals: z.array(z.string().min(1)).max(12),
  confidence: z.number().min(0).max(1),
  notes: z.array(z.string().min(1)).max(8).optional()
});

export const resonanceAnalyzeRequestSchema = z.object({
  inputId: entityIdSchema
});

export const resonanceAnalyzeResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    inputId: entityIdSchema,
    analysis: resonanceInputAnalysisSchema
  })
);

export const resonanceCompareResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    comparisonId: entityIdSchema,
    inputId: entityIdSchema,
    status: z.enum(["queued", "completed"]),
    createdAt: isoDateTimeSchema,
    topMatchId: entityIdSchema.optional(),
    reportReady: z.boolean()
  })
);

export const resonanceMatchSchema = z.object({
  matchId: entityIdSchema,
  caseId: entityIdSchema,
  title: z.string().min(1),
  score: z.number().min(0).max(1),
  rationale: z.string().min(1),
  matchedSignals: z.array(z.string().min(1)).max(12).optional(),
  mismatchSignals: z.array(z.string().min(1)).max(12).optional(),
  uncertainty: z.string().min(1).optional(),
  keep: z.boolean().optional(),
  excerpt: z.string().min(1).optional()
});

export const resonanceMatchesRequestSchema = z.object({
  comparisonId: entityIdSchema,
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional()
});

export const resonanceMatchesResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    comparisonId: entityIdSchema,
    items: z.array(resonanceMatchSchema),
    pageInfo: pageInfoSchema
  })
);

export const resonanceReportRequestSchema = z.object({
  comparisonId: entityIdSchema
});

export const resonanceReportResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    comparisonId: entityIdSchema,
    ready: z.boolean(),
    reportReference: reportReferenceSchema.optional()
  })
);

// ---------------------------------------------------------------------------
// finish
// ---------------------------------------------------------------------------

export const resonanceFinishReasonSchema = z.enum([
  "user_completed",
  "user_cancelled"
]);

export const resonanceFinishRequestSchema = z.object({
  comparisonId: entityIdSchema,
  reason: resonanceFinishReasonSchema
});

export const resonanceFinishResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    comparisonId: entityIdSchema,
    status: z.literal("completed"),
    finishedAt: isoDateTimeSchema,
    reportReference: reportReferenceSchema.optional()
  })
);

// ---------------------------------------------------------------------------
// detail
// ---------------------------------------------------------------------------

export const resonanceDetailRequestSchema = z.object({
  comparisonId: entityIdSchema
});

export const resonanceDetailResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    comparisonId: entityIdSchema,
    inputId: entityIdSchema,
    sourceType: resonanceSourceTypeSchema,
    status: z.enum(["queued", "completed"]),
    createdAt: isoDateTimeSchema,
    previewText: z.string().min(1).optional(),
    topMatchId: entityIdSchema.optional(),
    reportReady: z.boolean(),
    reportReference: reportReferenceSchema.optional()
  })
);

// ---------------------------------------------------------------------------
// history / list
// ---------------------------------------------------------------------------

export const resonanceListRequestSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional(),
  status: z.enum(["queued", "completed"]).optional(),
  dateFrom: isoDateTimeSchema.optional(),
  dateTo: isoDateTimeSchema.optional()
});

export const resonanceListItemSchema = z.object({
  comparisonId: entityIdSchema,
  inputId: entityIdSchema,
  inputPreviewText: z.string().min(1).optional(),
  status: z.enum(["queued", "completed"]),
  createdAt: isoDateTimeSchema,
  topMatchTitle: z.string().min(1).optional(),
  reportReady: z.boolean(),
  reportReference: reportReferenceSchema.optional()
});

export const resonanceListResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    items: z.array(resonanceListItemSchema),
    pageInfo: pageInfoSchema
  })
);

export type ResonanceFileReference = z.infer<typeof resonanceFileReferenceSchema>;
export type ResonanceInputRequest = z.infer<typeof resonanceInputRequestSchema>;
export type ResonanceInputResponse = z.infer<typeof resonanceInputResponseSchema>;
export type ResonanceInputAnalysis = z.infer<typeof resonanceInputAnalysisSchema>;
export type ResonanceAnalyzeRequest = z.infer<typeof resonanceAnalyzeRequestSchema>;
export type ResonanceAnalyzeResponse = z.infer<typeof resonanceAnalyzeResponseSchema>;
export type ResonanceCompareRequest = z.infer<typeof resonanceCompareRequestSchema>;
export type ResonanceCompareResponse = z.infer<typeof resonanceCompareResponseSchema>;
export type ResonanceMatch = z.infer<typeof resonanceMatchSchema>;
export type ResonanceMatchesRequest = z.infer<typeof resonanceMatchesRequestSchema>;
export type ResonanceMatchesResponse = z.infer<typeof resonanceMatchesResponseSchema>;
export type ResonanceReportRequest = z.infer<typeof resonanceReportRequestSchema>;
export type ResonanceReportResponse = z.infer<typeof resonanceReportResponseSchema>;
export type ResonanceFinishRequest = z.infer<typeof resonanceFinishRequestSchema>;
export type ResonanceFinishResponse = z.infer<typeof resonanceFinishResponseSchema>;
export type ResonanceDetailRequest = z.infer<typeof resonanceDetailRequestSchema>;
export type ResonanceDetailResponse = z.infer<typeof resonanceDetailResponseSchema>;
export type ResonanceListRequest = z.infer<typeof resonanceListRequestSchema>;
export type ResonanceListItem = z.infer<typeof resonanceListItemSchema>;
export type ResonanceListResponse = z.infer<typeof resonanceListResponseSchema>;
