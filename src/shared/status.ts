import { z } from "zod";

export const lifecycleStatusValues = [
  "active",
  "finished"
] as const;

export const processingStatusValues = [
  "pending",
  "running",
  "paused",
  "completed"
] as const;

export const lifecycleStatusSchema = z.enum(lifecycleStatusValues);
export const processingStatusSchema = z.enum(processingStatusValues);

export type LifecycleStatus = z.infer<typeof lifecycleStatusSchema>;
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
