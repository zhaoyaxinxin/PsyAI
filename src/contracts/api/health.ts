import { z } from "zod";

import {
  createSuccessEnvelopeSchema,
  entityIdSchema,
  isoDateTimeSchema
} from "./shared.js";

// ── Component status ────────────────────────────────────────────────

export const componentStatusSchema = z.enum([
  "healthy",
  "degraded",
  "unavailable",
  "unknown"
]);

// ── Provider status ─────────────────────────────────────────────────

export const providerStatusSchema = z.object({
  status: componentStatusSchema,
  provider: z.string().min(1),
  modelId: z.string().min(1),
  lastTestedAt: isoDateTimeSchema.optional(),
  lastTestLatencyMs: z.number().int().nonnegative().optional(),
  lastError: z.string().optional()
});

// ── Storage status ──────────────────────────────────────────────────

export const storageStatusSchema = z.object({
  status: componentStatusSchema,
  rootPath: z.string().min(1),
  scopesReady: z.boolean(),
  totalEstimatedBytes: z.number().int().nonnegative().optional(),
  lastCheckedAt: isoDateTimeSchema.optional()
});

// ── Retrieval status ────────────────────────────────────────────────

export const retrievalStatusSchema = z.object({
  status: componentStatusSchema,
  indexCount: z.number().int().nonnegative(),
  documentCount: z.number().int().nonnegative(),
  lastIndexedAt: isoDateTimeSchema.optional()
});

// ── System health request ───────────────────────────────────────────

export const systemHealthRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional(),
  includeDetails: z.boolean().optional()
});

// ── System health response ──────────────────────────────────────────

export const systemHealthResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    overall: componentStatusSchema,
    provider: providerStatusSchema.optional(),
    storage: storageStatusSchema.optional(),
    retrieval: retrievalStatusSchema.optional(),
    checkedAt: isoDateTimeSchema
  })
);

// ── System status request (lighter than health) ─────────────────────

export const systemStatusRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional()
});

export const systemStatusResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    overall: componentStatusSchema,
    uptimeSeconds: z.number().int().nonnegative(),
    activeWorkflows: z.number().int().nonnegative(),
    totalReports: z.number().int().nonnegative(),
    version: z.string().min(1),
    checkedAt: isoDateTimeSchema
  })
);

// ── Workflow status summary ─────────────────────────────────────────

export const workflowStatusRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional()
});

export const workflowStatusItemSchema = z.object({
  workflow: z.enum(["counseling", "simulation", "resonance"]),
  activeCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  totalReportCount: z.number().int().nonnegative()
});

export const workflowStatusResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    items: z.array(workflowStatusItemSchema),
    checkedAt: isoDateTimeSchema
  })
);

// ── Exported types ──────────────────────────────────────────────────

export type ComponentStatus = z.infer<typeof componentStatusSchema>;
export type ProviderStatus = z.infer<typeof providerStatusSchema>;
export type StorageStatus = z.infer<typeof storageStatusSchema>;
export type RetrievalStatus = z.infer<typeof retrievalStatusSchema>;
export type SystemHealthRequest = z.infer<typeof systemHealthRequestSchema>;
export type SystemHealthResponse = z.infer<typeof systemHealthResponseSchema>;
export type SystemStatusRequest = z.infer<typeof systemStatusRequestSchema>;
export type SystemStatusResponse = z.infer<typeof systemStatusResponseSchema>;
export type WorkflowStatusRequest = z.infer<typeof workflowStatusRequestSchema>;
export type WorkflowStatusItem = z.infer<typeof workflowStatusItemSchema>;
export type WorkflowStatusResponse = z.infer<typeof workflowStatusResponseSchema>;
