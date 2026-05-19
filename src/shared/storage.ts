import { z } from "zod";

export const dataDirectoryValues = [
  "uploads",
  "snapshots",
  "exports",
  "db",
  "indexes"
] as const;

export const storageScopeValues = [
  "uploads",
  "snapshots",
  "exports"
] as const;

export const dataDirectorySchema = z.enum(dataDirectoryValues);
export const storageScopeSchema = z.enum(storageScopeValues);

export type DataDirectory = z.infer<typeof dataDirectorySchema>;
export type StorageScope = z.infer<typeof storageScopeSchema>;
