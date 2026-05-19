import type {
  CounselingReport,
  PageInfo,
  ReportExportFormat,
  ReportExportMetadata,
  ReportReference,
  ResonanceReport,
  SimulationReport
} from "@psyai/contracts";

export type ReportingWorkflow = "simulation" | "resonance" | "counseling";
export type ReportingReport = SimulationReport | ResonanceReport | CounselingReport;
export type ReportingReportStatus = "pending" | "generating" | "ready" | "failed";

export interface ReportRegistryRecord<TReport extends ReportingReport = ReportingReport> {
  reportId: string;
  workflow: ReportingWorkflow;
  sourceEntityId: string;
  status: ReportingReportStatus;
  createdAt: string;
  updatedAt: string;
  reportVersion: string;
  report: TReport;
}

export interface ReportSummaryItem {
  reportId: string;
  workflow: ReportingWorkflow;
  sourceEntityId: string;
  sourceLabel?: string;
  status: ReportingReportStatus;
  title: string;
  summary: string;
  generatedAt: string;
  reportVersion: string;
  riskLevel?: string;
  sanitized: boolean;
}

export interface ReportListData {
  items: ReportSummaryItem[];
  pageInfo: PageInfo;
}

export interface ReportStatusData {
  reportId: string;
  workflow: ReportingWorkflow;
  status: ReportingReportStatus;
  ready: boolean;
  reportReference: ReportReference | null;
}

// ── Report detail view model for UI consumption ─────────────────────

export interface ReportDetailViewModel {
  reportId: string;
  workflow: ReportingWorkflow;
  status: ReportingReportStatus;
  sourceEntityId: string;
  sourceLabel?: string;
  title: string;
  summary: string;
  highlights: Array<{ label: string; value: string }>;
  generatedAt: string;
  reportVersion: string;
  generatedBy: string;
  sanitized: boolean;
  templateVersion?: string;
  boundaryNotice?: string;
  exportLabel: string;
  historyItems: Array<{
    entryId: string;
    occurredAt: string;
    title: string;
    summary: string;
  }>;
}

// ── Report history view model ───────────────────────────────────────

export interface ReportHistoryViewModel {
  reportId: string;
  workflow: ReportingWorkflow;
  status: ReportingReportStatus;
  title: string;
  summary: string;
  generatedAt: string;
  sourceLabel?: string;
  riskLevel?: string;
  sanitized: boolean;
}

export interface ReportExportData {
  reportId: string;
  workflow: ReportingWorkflow;
  format: ReportExportFormat;
  metadata: ReportExportMetadata;
  content: string;
}

export interface ReportListQuery {
  workflow?: ReportingWorkflow;
  status?: ReportingReportStatus;
  page?: number;
  pageSize?: number;
}

export interface NormalizedReportListQuery {
  workflow?: ReportingWorkflow;
  status?: ReportingReportStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "generatedAt" | "title";
  sortDirection?: "asc" | "desc";
  page: number;
  pageSize: number;
}
