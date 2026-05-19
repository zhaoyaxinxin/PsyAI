import { z } from "zod";

// ── Diagnostic level ────────────────────────────────────────────────

export const diagnosticLevelValues = [
  "info",
  "warn",
  "error",
  "fatal"
] as const;

export const diagnosticLevelSchema = z.enum(diagnosticLevelValues);
export type DiagnosticLevel = z.infer<typeof diagnosticLevelSchema>;

// ── Component status ────────────────────────────────────────────────

export const componentStatusValues = [
  "healthy",
  "degraded",
  "unavailable",
  "unknown"
] as const;

export const componentStatusSchema = z.enum(componentStatusValues);
export type ComponentStatus = z.infer<typeof componentStatusSchema>;

// ── Diagnostic event ────────────────────────────────────────────────

export const diagnosticEventSchema = z.object({
  level: diagnosticLevelSchema,
  source: z.string().min(1),
  message: z.string().min(1),
  occurredAt: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  traceId: z.string().min(1).optional()
});

export type DiagnosticEvent = z.infer<typeof diagnosticEventSchema>;

// ── System snapshot (lightweight health summary) ────────────────────

export const componentHealthSchema = z.object({
  component: z.string().min(1),
  status: componentStatusSchema,
  lastCheckedAt: z.string().min(1).optional(),
  message: z.string().optional()
});

export type ComponentHealth = z.infer<typeof componentHealthSchema>;

export const systemSnapshotSchema = z.object({
  overall: componentStatusSchema,
  components: z.array(componentHealthSchema),
  checkedAt: z.string().min(1),
  uptimeSeconds: z.number().int().nonnegative().optional(),
  version: z.string().min(1)
});

export type SystemSnapshot = z.infer<typeof systemSnapshotSchema>;
