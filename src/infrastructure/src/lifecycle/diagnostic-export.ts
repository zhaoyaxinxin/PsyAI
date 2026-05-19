/**
 * Diagnostic Export — produces a bundled diagnostic package for support / debugging.
 *
 * Self-contained interface. No business rules, no UI logic.
 */

export interface DiagnosticComponentStatus {
  component: string;
  status: "healthy" | "degraded" | "unavailable" | "unknown";
  message?: string;
  checkedAt: string;
}

export interface DiagnosticExportOptions {
  /** Which components to include. Default: all. */
  components?: string[];
  /** Whether to include raw settings (may contain paths — sanitized by default). */
  includeSettings?: boolean;
  /** Output directory for the diagnostic bundle. */
  outputDir: string;
}

export interface DiagnosticExportResult {
  exportId: string;
  createdAt: string;
  fileName: string;
  format: "json";
  componentStatuses: DiagnosticComponentStatus[];
  fileSizeBytes: number;
  checksum: string;
}

export interface DiagnosticCollector {
  /** Collect status for a named component. */
  collectStatus(component: string, occurredAt?: string): Promise<DiagnosticComponentStatus>;

  /** Collect all component statuses. */
  collectAllStatuses(occurredAt?: string): Promise<DiagnosticComponentStatus[]>;
}

export interface DiagnosticExportService {
  /** Export a bundled diagnostic report. */
  exportDiagnostics(options: DiagnosticExportOptions): Promise<DiagnosticExportResult>;

  /** Collect current diagnostic status without exporting to file. */
  collectDiagnostics(occurredAt?: string): Promise<DiagnosticComponentStatus[]>;
}

export const DIAGNOSTIC_COMPONENTS = [
  "provider",
  "storage",
  "retrieval",
  "database",
  "settings",
  "workspace"
] as const;

export type DiagnosticComponent = (typeof DIAGNOSTIC_COMPONENTS)[number];

/** Generate a diagnostic export ID. */
export function createDiagnosticExportId(occurredAt?: string): string {
  const ts = occurredAt ?? new Date().toISOString();
  return `diag-${ts.replace(/[:.]/g, "-")}`;
}
