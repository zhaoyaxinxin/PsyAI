import { z } from "zod";

import { entityIdSchema, isoDateTimeSchema } from "./shared.js";

export const riskEscalationStatusValues = [
  "none",
  "review_recommended",
  "escalated"
] as const;

export const riskEscalationStatusSchema = z.enum(riskEscalationStatusValues);

export const counselingEscalationResultSchema = z.object({
  escalationStatus: riskEscalationStatusSchema,
  escalatedAt: isoDateTimeSchema.optional(),
  escalatedDuringTurnId: entityIdSchema.optional(),
  reason: z.string().min(1).optional()
});

export type RiskEscalationStatus = z.infer<typeof riskEscalationStatusSchema>;
export type CounselingEscalationResult = z.infer<typeof counselingEscalationResultSchema>;
