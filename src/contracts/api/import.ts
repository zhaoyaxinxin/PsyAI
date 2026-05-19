import { z } from "zod";

import { entityIdSchema, isoDateTimeSchema } from "./shared.js";

export const parseWarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  field: z.string().min(1).optional(),
  line: z.number().int().positive().optional()
});

export const importSuccessSchema = z.object({
  status: z.literal("success"),
  inputId: entityIdSchema,
  parsedAt: isoDateTimeSchema,
  warnings: z.array(parseWarningSchema).optional()
});

export const importFailureSchema = z.object({
  status: z.literal("failure"),
  code: z.string().min(1),
  message: z.string().min(1),
  recoverable: z.boolean()
});

export const importResultSchema = z.discriminatedUnion("status", [
  importSuccessSchema,
  importFailureSchema
]);

export type ParseWarning = z.infer<typeof parseWarningSchema>;
export type ImportSuccess = z.infer<typeof importSuccessSchema>;
export type ImportFailure = z.infer<typeof importFailureSchema>;
export type ImportResult = z.infer<typeof importResultSchema>;
