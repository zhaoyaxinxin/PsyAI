import { z } from "zod";

// ── Provider config schema (shared validation for app-state / contracts / infra) ──

export const providerEndpointSchema = z.string().min(1);
export const providerModelIdSchema = z.string().min(1);
export const providerTimeoutMsSchema = z.number().int().min(1000).max(300000);
export const providerMaxRetriesSchema = z.number().int().min(0).max(10);
export const providerCapabilitySchema = z.string().min(1);

export const providerConfigSchema = z.object({
  provider: z.string().min(1),
  modelId: providerModelIdSchema,
  endpoint: z.string(),
  timeoutMs: providerTimeoutMsSchema,
  maxRetries: providerMaxRetriesSchema,
  capabilities: z.array(providerCapabilitySchema)
});

export type ProviderConfig = z.infer<typeof providerConfigSchema>;

// ── Provider test result ────────────────────────────────────────────

export const providerTestResultSchema = z.object({
  success: z.boolean(),
  latencyMs: z.number().int().nonnegative(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  testedAt: z.string().min(1)
});

export type ProviderTestResult = z.infer<typeof providerTestResultSchema>;

// ── Provider health record ──────────────────────────────────────────

export const providerHealthRecordSchema = z.object({
  provider: z.string().min(1),
  modelId: providerModelIdSchema,
  lastTestedAt: z.string().min(1).optional(),
  lastTestLatencyMs: z.number().int().nonnegative().optional(),
  consecutiveFailures: z.number().int().nonnegative().optional(),
  status: z.enum(["healthy", "degraded", "unavailable", "unknown"]).optional()
});

export type ProviderHealthRecord = z.infer<typeof providerHealthRecordSchema>;
