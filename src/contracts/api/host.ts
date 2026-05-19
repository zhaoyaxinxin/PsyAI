import { z } from "zod";

import {
  createSuccessEnvelopeSchema,
  entityIdSchema,
  hostBootstrapSummarySchema,
  isoDateTimeSchema
} from "./shared.js";

// ── Host initialization ─────────────────────────────────────────────

export const hostInitRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional()
});

export const hostInitResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    bootstrap: hostBootstrapSummarySchema,
    dataDirectoryReady: z.boolean(),
    providerConfigured: z.boolean(),
    consentCompleted: z.boolean(),
    startupCompletedAt: isoDateTimeSchema.optional()
  })
);

// ── Data directory check ────────────────────────────────────────────

export const dataDirectoryScopeValues = [
  "uploads",
  "snapshots",
  "exports",
  "db",
  "indexes"
] as const;

export const dataDirectoryScopeSchema = z.enum(dataDirectoryScopeValues);

export const dataDirectoryScopeStatusSchema = z.object({
  scope: dataDirectoryScopeSchema,
  path: z.string().min(1),
  exists: z.boolean(),
  writable: z.boolean(),
  estimatedSizeBytes: z.number().int().nonnegative().optional()
});

export const dataDirectoryCheckRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional()
});

export const dataDirectoryCheckResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    rootPath: z.string().min(1),
    scopes: z.array(dataDirectoryScopeStatusSchema),
    allReady: z.boolean(),
    checkedAt: isoDateTimeSchema
  })
);

// ── Provider config CRUD ────────────────────────────────────────────

export const providerConfigSchema = z.object({
  provider: z.string().min(1),
  modelId: z.string().min(1),
  endpoint: z.string(),
  timeoutMs: z.number().int().min(1000),
  maxRetries: z.number().int().min(0).max(10),
  capabilities: z.array(z.string().min(1))
});

export const providerConfigGetRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional()
});

export const providerConfigGetResponseSchema = createSuccessEnvelopeSchema(
  providerConfigSchema
);

export const providerConfigUpdateRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional(),
  provider: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  endpoint: z.string().optional(),
  timeoutMs: z.number().int().min(1000).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  capabilities: z.array(z.string().min(1)).optional()
});

export const providerConfigUpdateResponseSchema = createSuccessEnvelopeSchema(
  providerConfigSchema
);

export const providerTestRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional()
});

export const providerTestResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    success: z.boolean(),
    latencyMs: z.number().int().nonnegative(),
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
    testedAt: isoDateTimeSchema
  })
);

// ── Data cleanup ────────────────────────────────────────────────────

export const cleanupScopeValues = [
  "all",
  "exports",
  "snapshots",
  "indexes",
  "uploads"
] as const;

export const cleanupScopeSchema = z.enum(cleanupScopeValues);

export const cleanupRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional(),
  scope: cleanupScopeSchema.optional(),
  confirm: z.boolean()
});

export const cleanupResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    scope: cleanupScopeSchema,
    pendingItemsBefore: z.number().int().nonnegative(),
    removedItems: z.number().int().nonnegative(),
    freedSpaceEstimate: z.string(),
    completedAt: isoDateTimeSchema,
    partial: z.boolean()
  })
);

// ── Exported types ──────────────────────────────────────────────────

export type HostInitRequest = z.infer<typeof hostInitRequestSchema>;
export type HostInitResponse = z.infer<typeof hostInitResponseSchema>;
export type DataDirectoryScope = z.infer<typeof dataDirectoryScopeSchema>;
export type DataDirectoryScopeStatus = z.infer<typeof dataDirectoryScopeStatusSchema>;
export type DataDirectoryCheckRequest = z.infer<typeof dataDirectoryCheckRequestSchema>;
export type DataDirectoryCheckResponse = z.infer<typeof dataDirectoryCheckResponseSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ProviderConfigGetRequest = z.infer<typeof providerConfigGetRequestSchema>;
export type ProviderConfigGetResponse = z.infer<typeof providerConfigGetResponseSchema>;
export type ProviderConfigUpdateRequest = z.infer<typeof providerConfigUpdateRequestSchema>;
export type ProviderConfigUpdateResponse = z.infer<typeof providerConfigUpdateResponseSchema>;
export type ProviderTestRequest = z.infer<typeof providerTestRequestSchema>;
export type ProviderTestResponse = z.infer<typeof providerTestResponseSchema>;
export type CleanupScope = z.infer<typeof cleanupScopeSchema>;
export type CleanupRequest = z.infer<typeof cleanupRequestSchema>;
export type CleanupResponse = z.infer<typeof cleanupResponseSchema>;
