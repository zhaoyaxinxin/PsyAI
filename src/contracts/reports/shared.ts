import { z } from "zod";

import {
  entityIdSchema,
  workflowKindSchema
} from "../shared.js";
import {
  exportFormatSchema,
  isoDateTimeSchema,
  reportTypeSchema,
  reportVersionSchema
} from "@psyai/shared";

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export const reportStatusSchema = z.enum([
  "pending",
  "generating",
  "ready",
  "failed"
]);

export const reportRiskLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "urgent"
]);

// ---------------------------------------------------------------------------
// Export format alias
// ---------------------------------------------------------------------------

export const reportExportFormatSchema = exportFormatSchema;

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

export const reportSourceSchema = z.object({
  workflow: workflowKindSchema,
  sourceEntityId: entityIdSchema,
  sourceLabel: z.string().min(1).optional()
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export const reportSummaryHighlightSchema = z.object({
  highlightId: entityIdSchema,
  label: z.string().min(1),
  value: z.string().min(1)
});

export const reportSummarySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  highlights: z.array(reportSummaryHighlightSchema),
  riskLevel: reportRiskLevelSchema.optional(),
  categories: z.array(z.string().min(1)).max(5).optional(),
  generatedAtLabel: z.string().min(1).optional()
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export const reportHistoryEntrySchema = z.object({
  entryId: entityIdSchema,
  occurredAt: isoDateTimeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  relatedEntityId: entityIdSchema.optional()
});

export const reportHistorySchema = z.object({
  items: z.array(reportHistoryEntrySchema)
});

// ---------------------------------------------------------------------------
// Export metadata (P1: extended with formatVersion / templateVersion)
// ---------------------------------------------------------------------------

export const reportExportMetadataSchema = z.object({
  format: reportExportFormatSchema,
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  exportedAt: isoDateTimeSchema,
  generatorVersion: z.string().min(1),
  templateVersion: z.string().min(1),
  formatVersion: z.string().min(1),
  sanitized: z.boolean(),
  exportedBy: z.string().min(1),
  consistencyToken: z.string().min(1).optional()
});

// ---------------------------------------------------------------------------
// Visualization metadata (P1: extension slots, no rendering params)
// ---------------------------------------------------------------------------

export const reportVisualizationKindValues = [
  "timeline",
  "chart",
  "graph",
  "heatmap",
  "starChart",
  "comparison",
  "summaryCard"
] as const;

export const reportVisualizationKindSchema = z.enum(
  reportVisualizationKindValues
);

export const reportVisualizationMetaSchema = z.object({
  kind: reportVisualizationKindSchema,
  label: z.string().min(1),
  enabled: z.boolean(),
  priority: z.number().int().min(0).max(100),
  description: z.string().min(1).optional()
});

// ---------------------------------------------------------------------------
// Safety notice (common boundary disclaimer included in every report)
// ---------------------------------------------------------------------------

export const reportSafetyNoticeSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1)
});

// ---------------------------------------------------------------------------
// Base report shell
// ---------------------------------------------------------------------------

export const reportBaseSchema = z.object({
  reportId: entityIdSchema,
  reportType: reportTypeSchema,
  status: reportStatusSchema,
  generatedAt: isoDateTimeSchema,
  reportVersion: reportVersionSchema,
  generatedBy: z.string().min(1),
  sanitized: z.boolean(),
  reviewedAt: isoDateTimeSchema.optional(),
  visualizations: z.array(reportVisualizationMetaSchema).optional(),
  templateVersion: z.string().min(1).optional()
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportRiskLevel = z.infer<typeof reportRiskLevelSchema>;
export type ReportExportFormat = z.infer<typeof reportExportFormatSchema>;
export type ReportSource = z.infer<typeof reportSourceSchema>;
export type ReportSummaryHighlight = z.infer<typeof reportSummaryHighlightSchema>;
export type ReportSummary = z.infer<typeof reportSummarySchema>;
export type ReportHistoryEntry = z.infer<typeof reportHistoryEntrySchema>;
export type ReportHistory = z.infer<typeof reportHistorySchema>;
export type ReportSafetyNotice = z.infer<typeof reportSafetyNoticeSchema>;
export type ReportExportMetadata = z.infer<typeof reportExportMetadataSchema>;
export type ReportVisualizationKind = z.infer<typeof reportVisualizationKindSchema>;
export type ReportVisualizationMeta = z.infer<typeof reportVisualizationMetaSchema>;
export type ReportBase = z.infer<typeof reportBaseSchema>;
