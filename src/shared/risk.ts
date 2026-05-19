import { z } from "zod";

export const riskLevelValues = [
  "low",
  "moderate",
  "high",
  "urgent"
] as const;

export const riskLevelSchema = z.enum(riskLevelValues);

export type RiskLevel = z.infer<typeof riskLevelSchema>;
