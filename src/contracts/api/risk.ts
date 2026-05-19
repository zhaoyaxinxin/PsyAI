import { z } from "zod";

import {
  createSuccessEnvelopeSchema,
  entityIdSchema,
  isoDateTimeSchema,
  workflowKindSchema
} from "./shared.js";

// ── Risk confirmation action ────────────────────────────────────────

export const riskConfirmationActionSchema = z.enum([
  "acknowledge",
  "confirm",
  "escalate"
]);

// ── Risk confirmation request ───────────────────────────────────────

export const riskConfirmationRequestSchema = z.object({
  clientRequestId: entityIdSchema.optional(),
  workflow: workflowKindSchema,
  entityId: entityIdSchema,
  action: riskConfirmationActionSchema,
  occurredAt: isoDateTimeSchema
});

// ── Risk confirmation response ──────────────────────────────────────

export const riskConfirmationResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    workflow: workflowKindSchema,
    entityId: entityIdSchema,
    action: riskConfirmationActionSchema,
    confirmed: z.boolean(),
    boundaryNotice: z.string().min(1),
    escalationResources: z
      .array(
        z.object({
          label: z.string().min(1),
          description: z.string().min(1),
          contact: z.string().optional()
        })
      )
      .optional(),
    confirmedAt: isoDateTimeSchema
  })
);

// ── Risk status query ───────────────────────────────────────────────

export const riskStatusRequestSchema = z.object({
  workflow: workflowKindSchema,
  entityId: entityIdSchema
});

export const riskStatusResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    workflow: workflowKindSchema,
    entityId: entityIdSchema,
    riskLevel: z.enum(["low", "moderate", "high", "urgent"]),
    escalationStatus: z.enum(["none", "review_recommended", "escalated"]),
    confirmationRequired: z.boolean(),
    lastConfirmedAt: isoDateTimeSchema.optional(),
    signals: z
      .array(
        z.object({
          signalId: z.string().min(1),
          reason: z.string().min(1)
        })
      )
      .optional()
  })
);

// ── Exported types ──────────────────────────────────────────────────

export type RiskConfirmationAction = z.infer<typeof riskConfirmationActionSchema>;
export type RiskConfirmationRequest = z.infer<typeof riskConfirmationRequestSchema>;
export type RiskConfirmationResponse = z.infer<typeof riskConfirmationResponseSchema>;
export type RiskStatusRequest = z.infer<typeof riskStatusRequestSchema>;
export type RiskStatusResponse = z.infer<typeof riskStatusResponseSchema>;
