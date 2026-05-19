import { z } from "zod";

export const exportFormatValues = [
  "html",
  "markdown",
  "pdf",
  "json"
] as const;

export const exportFormatSchema = z.enum(exportFormatValues);

export type ExportFormat = z.infer<typeof exportFormatSchema>;
