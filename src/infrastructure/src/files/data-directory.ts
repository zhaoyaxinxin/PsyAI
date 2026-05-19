import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const DATA_DIRECTORY_SCOPES = [
  "uploads",
  "snapshots",
  "exports",
  "db",
  "indexes",
  "knowledge-counseling",
  "knowledge-resonance"
] as const;

export type DataDirectoryScope = (typeof DATA_DIRECTORY_SCOPES)[number];

export interface DataDirectoryLayout {
  root: string;
  scopes: Record<DataDirectoryScope, string>;
}

export async function createDataDirectoryLayout(
  rootDirectory: string
): Promise<DataDirectoryLayout> {
  const scopes = {} as Record<DataDirectoryScope, string>;

  for (const scope of DATA_DIRECTORY_SCOPES) {
    const scopePath = join(rootDirectory, scope);
    await mkdir(scopePath, { recursive: true });
    scopes[scope] = scopePath;
  }

  return {
    root: rootDirectory,
    scopes
  };
}
