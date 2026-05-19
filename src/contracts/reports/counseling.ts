import { z } from "zod";

import { entityIdSchema, isoDateTimeSchema } from "../shared.js";
import {
  reportBaseSchema,
  reportExportMetadataSchema,
  reportHistorySchema,
  reportSourceSchema,
  reportSummarySchema
} from "./shared.js";

export const counselingReportRiskLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "urgent"
]);

export const counselingReportEscalationLevelSchema = z.enum([
  "none",
  "monitor",
  "escalate",
  "urgent"
]);

export const counselingReportStageSchema = z.enum([
  "intake",
  "exploration",
  "reflection",
  "closure"
]);

export const counselingRiskSignalSchema = z.object({
  signalId: entityIdSchema,
  label: z.string().min(1),
  severity: counselingReportRiskLevelSchema,
  description: z.string().min(1),
  relatedSectionId: entityIdSchema.optional(),
  detectedAt: isoDateTimeSchema
});

export const counselingExcerptSchema = z.object({
  excerptId: entityIdSchema,
  speaker: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  notedAt: isoDateTimeSchema
});

export const counselingRecommendationSchema = z.object({
  recommendationId: entityIdSchema,
  title: z.string().min(1),
  rationale: z.string().min(1),
  priority: z.enum(["now", "soon", "later"])
});

export const counselingSectionSchema = z.object({
  sectionId: entityIdSchema,
  title: z.string().min(1),
  stage: counselingReportStageSchema,
  summary: z.string().min(1),
  keyExcerpts: z.array(counselingExcerptSchema),
  recommendations: z.array(counselingRecommendationSchema)
});

export const counselingReportDetailSchema = z.object({
  sessionId: entityIdSchema,
  overview: z.object({
    concernSummary: z.string().min(1),
    riskLevel: counselingReportRiskLevelSchema,
    dominantStage: counselingReportStageSchema,
    escalationLevel: counselingReportEscalationLevelSchema,
    startedAt: isoDateTimeSchema,
    finishedAt: isoDateTimeSchema.optional()
  }),
  sections: z.array(counselingSectionSchema).min(1),
  closingNote: z.string().min(1).optional(),
  riskSignals: z.array(counselingRiskSignalSchema).optional(),
  escalationSummary: z.string().min(1).optional(),
  boundaryNotice: z.string().min(1)
});

export const counselingReportSchema = z.object({
  base: reportBaseSchema.extend({
    reportType: z.literal("counseling")
  }),
  source: reportSourceSchema.extend({
    workflow: z.literal("counseling")
  }),
  summary: reportSummarySchema,
  detail: counselingReportDetailSchema,
  history: reportHistorySchema,
  exportMeta: reportExportMetadataSchema
});

export type CounselingReportRiskLevel = z.infer<typeof counselingReportRiskLevelSchema>;
export type CounselingReportEscalationLevel = z.infer<typeof counselingReportEscalationLevelSchema>;
export type CounselingRiskSignal = z.infer<typeof counselingRiskSignalSchema>;
export type CounselingExcerpt = z.infer<typeof counselingExcerptSchema>;
export type CounselingRecommendation = z.infer<typeof counselingRecommendationSchema>;
export type CounselingSection = z.infer<typeof counselingSectionSchema>;
export type CounselingReportDetail = z.infer<typeof counselingReportDetailSchema>;
export type CounselingReport = z.infer<typeof counselingReportSchema>;
