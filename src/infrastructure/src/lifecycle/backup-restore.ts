/**
 * Backup & Restore — infrastructure-level interfaces.
 *
 * Real implementations delegate to LocalFileStorage + SqliteDatabase.
 * This module defines the contracts only — no business rules.
 */

export interface BackupManifestEntry {
  scope: "db" | "uploads" | "snapshots" | "exports" | "indexes" | "config";
  path: string;
  sizeBytes: number;
  checksum: string;
  included: boolean;
}

export interface BackupManifest {
  backupId: string;
  createdAt: string;
  version: string;
  entries: BackupManifestEntry[];
  totalSizeBytes: number;
  totalEntries: number;
}

export interface BackupOptions {
  /** Which scopes to include. Default: all. */
  scopes?: BackupManifestEntry["scope"][];
  /** Target directory for the backup. */
  targetDir: string;
  /** Optional label for the backup. */
  label?: string;
}

export interface RestoreOptions {
  backupId: string;
  /** Which scopes to restore. Default: all. */
  scopes?: BackupManifestEntry["scope"][];
  /** Overwrite existing files. Default: false. */
  overwrite?: boolean;
  /** Dry-run: validate without writing. */
  dryRun?: boolean;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  restoredEntries: number;
  skippedEntries: number;
  failedEntries: number;
  errors: string[];
}

export interface BackupRestoreService {
  /** Create a backup and return its manifest. */
  createBackup(options: BackupOptions): Promise<BackupManifest>;

  /** List available backup manifests. */
  listBackups(): Promise<BackupManifest[]>;

  /** Restore from a backup. */
  restoreBackup(options: RestoreOptions): Promise<RestoreResult>;

  /** Validate a backup's integrity without restoring. */
  validateBackup(backupId: string): Promise<{ valid: boolean; errors: string[] }>;

  /** Delete a backup and its files. */
  deleteBackup(backupId: string): Promise<boolean>;
}

/** Generate a unique backup ID from a timestamp. */
export function createBackupId(occurredAt?: string): string {
  const ts = occurredAt ?? new Date().toISOString();
  const safe = ts.replace(/[:.]/g, "-");
  return `backup-${safe}`;
}
