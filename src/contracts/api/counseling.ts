import { z } from "zod";

import {
  createSuccessEnvelopeSchema,
  dateRangeFilterSchema,
  entityIdSchema,
  hostBootstrapSummarySchema,
  isoDateTimeSchema,
  pageInfoSchema,
  reportReferenceSchema
} from "./shared.js";
import { counselingEscalationResultSchema } from "./escalation.js";

export const counselingSessionStatusSchema = z.enum([
  "active",
  "finished"
]);

export const counselingRoleSchema = z.enum([
  "user",
  "assistant",
  "system"
]);

export const counselingStageSchema = z.enum([
  "intake",
  "exploration",
  "reflection",
  "closure"
]);

export const counselingRiskLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "urgent"
]);

export const counselingTurnSchema = z.object({
  turnId: entityIdSchema,
  role: counselingRoleSchema,
  content: z.string().min(1),
  createdAt: isoDateTimeSchema
});

export const counselingAnalysisSchema = z.object({
  stage: counselingStageSchema,
  summary: z.string().min(1),
  riskLevel: counselingRiskLevelSchema,
  escalationResult: counselingEscalationResultSchema.optional()
});

export const counselingStartRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional(),
  openingMessage: z.string().min(1),
  userContext: z.array(z.string().min(1)).max(10).optional()
});

export const counselingSessionSnapshotSchema = z.object({
  sessionId: entityIdSchema,
  status: counselingSessionStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  latestAnalysis: counselingAnalysisSchema.optional(),
  reportReference: reportReferenceSchema.optional()
});

export const counselingStartResponseSchema = createSuccessEnvelopeSchema(
  counselingSessionSnapshotSchema.extend({
    bootstrap: hostBootstrapSummarySchema,
    turns: z.array(counselingTurnSchema).min(1)
  })
);

export const counselingReplyRequestSchema = z.object({
  sessionId: entityIdSchema,
  message: z.string().min(1)
});

export const counselingReplyResponseSchema = createSuccessEnvelopeSchema(
  counselingSessionSnapshotSchema.extend({
    reply: counselingTurnSchema
  })
);

export const counselingFinishReasonSchema = z.enum([
  "user_completed",
  "user_cancelled",
  "handoff_requested",
  "forced_termination"
]);

export const counselingFinishRequestSchema = z.object({
  sessionId: entityIdSchema,
  reason: counselingFinishReasonSchema
});

export const counselingFinishResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    sessionId: entityIdSchema,
    status: z.literal("finished"),
    finishedAt: isoDateTimeSchema,
    reportReference: reportReferenceSchema.optional()
  })
);

export const counselingGetRequestSchema = z.object({
  sessionId: entityIdSchema
});

export const counselingGetResponseSchema = createSuccessEnvelopeSchema(
  counselingSessionSnapshotSchema.extend({
    turns: z.array(counselingTurnSchema)
  })
);

export const counselingReportRequestSchema = z.object({
  sessionId: entityIdSchema
});

export const counselingReportResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    sessionId: entityIdSchema,
    ready: z.boolean(),
    reportReference: reportReferenceSchema.optional()
  })
);

// ---------------------------------------------------------------------------
// history / list
// ---------------------------------------------------------------------------

export const counselingListRequestSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional(),
  status: counselingSessionStatusSchema.optional(),
  dateFrom: isoDateTimeSchema.optional(),
  dateTo: isoDateTimeSchema.optional()
});

export const counselingListItemSchema = z.object({
  sessionId: entityIdSchema,
  status: counselingSessionStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  latestStage: counselingStageSchema.optional(),
  riskLevel: counselingRiskLevelSchema.optional(),
  turnCount: z.number().int().nonnegative(),
  reportReference: reportReferenceSchema.optional()
});

export const counselingListResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    items: z.array(counselingListItemSchema),
    pageInfo: pageInfoSchema
  })
);

export type CounselingSessionStatus = z.infer<typeof counselingSessionStatusSchema>;
export type CounselingTurn = z.infer<typeof counselingTurnSchema>;
export type CounselingAnalysis = z.infer<typeof counselingAnalysisSchema>;
export type CounselingStartRequest = z.infer<typeof counselingStartRequestSchema>;
export type CounselingStartResponse = z.infer<typeof counselingStartResponseSchema>;
export type CounselingReplyRequest = z.infer<typeof counselingReplyRequestSchema>;
export type CounselingReplyResponse = z.infer<typeof counselingReplyResponseSchema>;
export type CounselingFinishRequest = z.infer<typeof counselingFinishRequestSchema>;
export type CounselingFinishResponse = z.infer<typeof counselingFinishResponseSchema>;
export type CounselingGetRequest = z.infer<typeof counselingGetRequestSchema>;
export type CounselingGetResponse = z.infer<typeof counselingGetResponseSchema>;
export type CounselingReportRequest = z.infer<typeof counselingReportRequestSchema>;
export type CounselingReportResponse = z.infer<typeof counselingReportResponseSchema>;
export type CounselingListRequest = z.infer<typeof counselingListRequestSchema>;
export type CounselingListItem = z.infer<typeof counselingListItemSchema>;
export type CounselingListResponse = z.infer<typeof counselingListResponseSchema>;
