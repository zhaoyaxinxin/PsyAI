import { z } from "zod";

export const reportTypeValues = [
  "counseling",
  "simulation",
  "resonance"
] as const;

export const reportTypeSchema = z.enum(reportTypeValues);
export const reportVersionSchema = z.string().min(1);

export type ReportType = z.infer<typeof reportTypeSchema>;
