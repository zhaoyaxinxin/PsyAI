import { z } from "zod";

import { exportFormatSchema } from "./export.js";

const taskIdSchema = z.string().min(1).max(128);

// ── Export task status ──────────────────────────────────────────────

export const exportTaskStatusValues = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled"
] as const;

export const exportTaskStatusSchema = z.enum(exportTaskStatusValues);
export type ExportTaskStatus = z.infer<typeof exportTaskStatusSchema>;

// ── Export task ─────────────────────────────────────────────────────

export const exportTaskSchema = z.object({
  taskId: taskIdSchema,
  reportId: taskIdSchema,
  format: exportFormatSchema,
  status: exportTaskStatusSchema,
  fileName: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  completedAt: z.string().min(1).optional()
});

export type ExportTask = z.infer<typeof exportTaskSchema>;

// ── Batch export task ───────────────────────────────────────────────

export const batchExportTaskSchema = exportTaskSchema.extend({
  reportIds: z.array(taskIdSchema).min(1).max(50),
  successCount: z.number().int().nonnegative().optional(),
  failureCount: z.number().int().nonnegative().optional(),
  itemStatuses: z
    .array(
      z.object({
        reportId: taskIdSchema,
        success: z.boolean(),
        fileName: z.string().min(1).optional(),
        errorMessage: z.string().optional()
      })
    )
    .optional()
});

export type BatchExportTask = z.infer<typeof batchExportTaskSchema>;
