import type { ReportExportFormat } from "@psyai/contracts";

export class ReportNotFoundError extends Error {
  readonly reportId: string;

  constructor(reportId: string) {
    super(`Report not found: ${reportId}`);
    this.name = "ReportNotFoundError";
    this.reportId = reportId;
  }
}

export class ReportExportUnsupportedFormatError extends Error {
  readonly format: ReportExportFormat;

  constructor(format: ReportExportFormat) {
    super(`Report export format is unsupported: ${format}`);
    this.name = "ReportExportUnsupportedFormatError";
    this.format = format;
  }
}
