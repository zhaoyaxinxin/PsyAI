import { z } from "zod";

export const hostInitializationErrorKindValues = [
  "settings_load_failed",
  "workspace_root_unavailable",
  "data_directory_unavailable",
  "export_directory_unavailable"
] as const;

export const hostInitializationErrorKindSchema = z.enum(
  hostInitializationErrorKindValues
);

export type HostInitializationErrorKind = z.infer<
  typeof hostInitializationErrorKindSchema
>;
