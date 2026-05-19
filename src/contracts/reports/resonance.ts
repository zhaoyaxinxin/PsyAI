import { z } from "zod";

import { entityIdSchema, isoDateTimeSchema } from "../shared.js";
import {
  reportBaseSchema,
  reportExportMetadataSchema,
  reportHistorySchema,
  reportSourceSchema,
  reportSummarySchema
} from "./shared.js";

export const resonanceReportSourceTypeSchema = z.enum(["text", "file"]);

export const resonanceMatchedCaseSchema = z.object({
  matchId: entityIdSchema,
  caseId: entityIdSchema,
  title: z.string().min(1),
  score: z.number().min(0).max(1),
  rationale: z.string().min(1),
  sharedThemes: z.array(z.string().min(1)).max(8),
  matchedSignals: z.array(z.string().min(1)).max(8),
  mismatchSignals: z.array(z.string().min(1)).max(8),
  whyMatched: z.string().min(1),
  whyNotFullyMatched: z.string().min(1).optional(),
  uncertainty: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional()
});

export const resonanceFragmentComparisonSchema = z.object({
  comparisonId: entityIdSchema,
  inputExcerpt: z.string().min(1),
  caseExcerpt: z.string().min(1),
  interpretation: z.string().min(1),
  matchedSignals: z.array(z.string().min(1)).max(8),
  mismatchSignals: z.array(z.string().min(1)).max(8),
  whyMatched: z.string().min(1),
  whyNotFullyMatched: z.string().min(1).optional(),
  uncertainty: z.string().min(1).optional()
});

export const resonanceThemeInterpretationSchema = z.object({
  themeId: entityIdSchema,
  theme: z.string().min(1),
  explanation: z.string().min(1),
  confidence: z.number().min(0).max(1),
  supportingCaseIds: z.array(entityIdSchema).max(8),
  whyMatched: z.string().min(1),
  whyNotFullyMatched: z.string().min(1).optional(),
  uncertainty: z.string().min(1).optional()
});

export const resonanceReportDetailSchema = z.object({
  comparisonId: entityIdSchema,
  input: z.object({
    inputId: entityIdSchema,
    sourceType: resonanceReportSourceTypeSchema,
    submittedAt: isoDateTimeSchema,
    summary: z.string().min(1),
    tags: z.array(z.string().min(1)).max(10)
  }),
  matchedCases: z.array(resonanceMatchedCaseSchema).min(1),
  fragmentComparisons: z.array(resonanceFragmentComparisonSchema),
  themeInterpretations: z.array(resonanceThemeInterpretationSchema).min(1),
  boundaryNotice: z.string().min(1)
});

export const resonanceReportSchema = z.object({
  base: reportBaseSchema.extend({
    reportType: z.literal("resonance")
  }),
  source: reportSourceSchema.extend({
    workflow: z.literal("resonance")
  }),
  summary: reportSummarySchema,
  detail: resonanceReportDetailSchema,
  history: reportHistorySchema,
  exportMeta: reportExportMetadataSchema
});

export type ResonanceReportSourceType = z.infer<typeof resonanceReportSourceTypeSchema>;
export type ResonanceMatchedCase = z.infer<typeof resonanceMatchedCaseSchema>;
export type ResonanceFragmentComparison = z.infer<typeof resonanceFragmentComparisonSchema>;
export type ResonanceThemeInterpretation = z.infer<typeof resonanceThemeInterpretationSchema>;
export type ResonanceReportDetail = z.infer<typeof resonanceReportDetailSchema>;
export type ResonanceReport = z.infer<typeof resonanceReportSchema>;
