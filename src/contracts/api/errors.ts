import { z } from "zod";

import { createSuccessEnvelopeSchema, entityIdSchema, isoDateTimeSchema } from "./shared.js";

export const errorCodeSchema = z.enum([
  // ── Validation ──────────────────────────────────────────────
  "validation.invalid_payload",

  // ── Business entity not-found ───────────────────────────────
  "counseling.session_not_found",
  "simulation.run_not_found",
  "simulation.scenario_not_found",
  "resonance.input_not_found",
  "resonance.comparison_not_found",
  "report.not_found",
  "report.not_ready",

  // ── Runtime / provider failures ─────────────────────────────
  "runtime.unavailable",
  "runtime.provider_timeout",
  "runtime.provider_unavailable",
  "runtime.provider_rate_limited",
  "runtime.provider_bad_request",
  "runtime.provider_fatal",
  "runtime.structured_output_invalid",
  "runtime.prompt_pack_not_found",
  "runtime.prompt_template_not_found",

  // ── Retrieval failures ──────────────────────────────────────
  "retrieval.vector_store_unavailable",
  "retrieval.index_corrupted",
  "retrieval.no_candidates_found",
  "retrieval.embedding_failed",

  // ── Persistence failures ────────────────────────────────────
  "persistence.query_failed",
  "persistence.migration_needed",
  "persistence.connection_lost",

  // ── Host initialization ─────────────────────────────────────
  "host.settings_load_failed",
  "host.workspace_root_unavailable",
  "host.data_directory_unavailable",
  "host.export_directory_unavailable",
  "host.provider_config_missing",
  "host.consent_not_completed",
  "host.startup_incomplete",

  // ── Security ────────────────────────────────────────────────
  "security.risk_confirmation_required",
  "security.risk_escalation_blocked",

  // ── Storage ─────────────────────────────────────────────────
  "storage.data_directory_access_denied",
  "storage.data_directory_not_found",
  "storage.data_directory_corrupted",

  // ── Export ──────────────────────────────────────────────────
  "export.format_unsupported",
  "export.directory_unavailable",
  "export.failed",

  // ── Cleanup ─────────────────────────────────────────────────
  "cleanup.failed",
  "cleanup.partial"
]);

export const recoverabilitySchema = z.enum([
  "recoverable",
  "non_recoverable"
]);

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1),
  recoverability: recoverabilitySchema,
  details: z.record(z.unknown()).optional(),
  traceId: entityIdSchema.optional()
});

export const errorEnvelopeSchema = z.object({
  status: z.literal("error"),
  timestamp: isoDateTimeSchema,
  error: apiErrorSchema
});

export const healthCheckSchema = createSuccessEnvelopeSchema(
  z.object({
    service: z.literal("contracts-api"),
    ready: z.boolean()
  })
);

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type Recoverability = z.infer<typeof recoverabilitySchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
