import { z } from "zod";

import {
  entityIdSchema,
  hostInitializationErrorKindSchema,
  isoDateTimeSchema,
  reportVersionSchema,
  sceneIdSchema,
  workflowKindSchema
} from "../shared.js";

export {
  entityIdSchema,
  hostInitializationErrorKindSchema,
  isoDateTimeSchema,
  sceneIdSchema,
  workflowKindSchema
} from "../shared.js";

export const reportReferenceSchema = z.object({
  reportId: entityIdSchema,
  workflow: workflowKindSchema,
  reportVersion: reportVersionSchema,
  generatedAt: isoDateTimeSchema.optional()
});

export const pageInfoSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  hasNextPage: z.boolean()
});

export const dateRangeFilterSchema = z.object({
  dateFrom: isoDateTimeSchema.optional(),
  dateTo: isoDateTimeSchema.optional()
});

export const hostBootstrapSummarySchema = z.object({
  ready: z.boolean(),
  scene: sceneIdSchema.optional(),
  workflow: workflowKindSchema.optional(),
  hostInitializationError: hostInitializationErrorKindSchema.optional()
});

export const createSuccessEnvelopeSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
) =>
  z.object({
    status: z.literal("ok"),
    timestamp: isoDateTimeSchema,
    data: dataSchema
  });

export type ReportReference = z.infer<typeof reportReferenceSchema>;
export type PageInfo = z.infer<typeof pageInfoSchema>;
export type DateRangeFilter = z.infer<typeof dateRangeFilterSchema>;
export type HostBootstrapSummary = z.infer<typeof hostBootstrapSummarySchema>;
