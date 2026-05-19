import type {
  ReportExportFormat,
  ReportExportMetadata,
  ReportHistory,
  ReportSource,
  ReportSummary
} from "@psyai/contracts";

import type { ReportingWorkflow } from "../reporting-types.js";

export interface CreateReportBaseOptions {
  reportId: string;
  workflow: ReportingWorkflow;
  title: string;
  summary: string;
  sourceEntityId: string;
  generatedAt: string;
  reportVersion: string;
}

function createExportMetadata(
  reportId: string,
  workflow: ReportingWorkflow,
  generatedAt: string,
  reportVersion: string,
  format: ReportExportFormat = "json"
): ReportExportMetadata {
  const extensionByFormat: Record<ReportExportFormat, string> = {
    json: "json",
    markdown: "md",
    html: "html",
    pdf: "pdf"
  };
  const mimeTypeByFormat: Record<ReportExportFormat, string> = {
    json: "application/json",
    markdown: "text/markdown",
    html: "text/html",
    pdf: "application/pdf"
  };

  return {
    format,
    fileName: `${workflow}-${reportId}.${extensionByFormat[format]}`,
    mimeType: mimeTypeByFormat[format],
    exportedAt: generatedAt,
    generatorVersion: reportVersion,
    templateVersion: "v1",
    formatVersion: "v1",
    sanitized: true,
    exportedBy: "psyai-reporting"
  };
}

export function createReportBase(
  options: CreateReportBaseOptions
): {
  base: {
    reportId: string;
    reportType: ReportingWorkflow;
    status: "ready";
    generatedAt: string;
    reportVersion: string;
    generatedBy: string;
    sanitized: boolean;
  };
  source: ReportSource;
  summary: ReportSummary;
  history: ReportHistory;
  exportMeta: ReportExportMetadata;
} {
  const source: ReportSource = {
    workflow: options.workflow,
    sourceEntityId: options.sourceEntityId
  };

  return {
    base: {
      reportId: options.reportId,
      reportType: options.workflow,
      status: "ready",
      generatedAt: options.generatedAt,
      reportVersion: options.reportVersion,
      generatedBy: "reporting-package-v1",
      sanitized: true
    },
    source,
    summary: {
      title: options.title,
      summary: options.summary,
      highlights: []
    },
    history: {
      items: []
    },
    exportMeta: createExportMetadata(
      options.reportId,
      options.workflow,
      options.generatedAt,
      options.reportVersion
    )
  };
}
