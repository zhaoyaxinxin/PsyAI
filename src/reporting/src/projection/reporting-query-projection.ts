import type { PageInfo, ReportReference } from "@psyai/contracts";

import type {
  ReportDetailViewModel,
  ReportHistoryViewModel,
  ReportListData,
  ReportRegistryRecord,
  ReportStatusData,
  ReportSummaryItem
} from "../reporting-types.js";

function createPageInfo(
  totalItems: number,
  page: number,
  pageSize: number
): PageInfo {
  return {
    page,
    pageSize,
    totalItems,
    hasNextPage: page * pageSize < totalItems
  };
}

export function toReportReference(record: ReportRegistryRecord): ReportReference {
  return {
    reportId: record.reportId,
    workflow: record.workflow,
    reportVersion: record.reportVersion,
    generatedAt: record.report.base.generatedAt
  };
}

export function toReportSummaryItem(record: ReportRegistryRecord): ReportSummaryItem {
  const item: ReportSummaryItem = {
    reportId: record.reportId,
    workflow: record.workflow,
    sourceEntityId: record.sourceEntityId,
    status: record.status,
    title: record.report.summary.title,
    summary: record.report.summary.summary,
    generatedAt: record.report.base.generatedAt,
    reportVersion: record.reportVersion,
    sanitized: record.report.base.sanitized
  };
  if (record.report.source.sourceLabel) item.sourceLabel = record.report.source.sourceLabel;
  if (record.report.summary.riskLevel) item.riskLevel = record.report.summary.riskLevel;
  return item;
}

export function toReportListData(
  items: ReportRegistryRecord[],
  totalItems: number,
  page: number,
  pageSize: number
): ReportListData {
  return {
    items: items.map(toReportSummaryItem),
    pageInfo: createPageInfo(totalItems, page, pageSize)
  };
}

export function toReportStatusData(record: ReportRegistryRecord): ReportStatusData {
  return {
    reportId: record.reportId,
    workflow: record.workflow,
    status: record.status,
    ready: record.status === "ready",
    reportReference: record.status === "ready" ? toReportReference(record) : null
  };
}

function extractBoundaryNotice(record: ReportRegistryRecord): string | undefined {
  const detail = record.report.detail as Record<string, unknown> | undefined;
  if (detail && typeof detail["boundaryNotice"] === "string") {
    return detail["boundaryNotice"];
  }
  return undefined;
}

function extractExportLabel(record: ReportRegistryRecord): string {
  const meta = record.report.exportMeta;
  return `${meta.format}:${meta.fileName}`;
}

export function toReportDetailViewModel(record: ReportRegistryRecord): ReportDetailViewModel {
  const vm: ReportDetailViewModel = {
    reportId: record.reportId,
    workflow: record.workflow,
    status: record.status,
    sourceEntityId: record.sourceEntityId,
    title: record.report.summary.title,
    summary: record.report.summary.summary,
    highlights: record.report.summary.highlights.map((h) => ({
      label: h.label,
      value: h.value
    })),
    generatedAt: record.report.base.generatedAt,
    reportVersion: record.reportVersion,
    generatedBy: record.report.base.generatedBy,
    sanitized: record.report.base.sanitized,
    exportLabel: extractExportLabel(record),
    historyItems: record.report.history.items.map((item) => ({
      entryId: item.entryId,
      occurredAt: item.occurredAt,
      title: item.title,
      summary: item.summary
    }))
  };
  if (record.report.source.sourceLabel) vm.sourceLabel = record.report.source.sourceLabel;
  if (record.report.base.templateVersion) vm.templateVersion = record.report.base.templateVersion;
  const notice = extractBoundaryNotice(record);
  if (notice) vm.boundaryNotice = notice;
  return vm;
}

export function toReportHistoryViewModel(record: ReportRegistryRecord): ReportHistoryViewModel {
  const vm: ReportHistoryViewModel = {
    reportId: record.reportId,
    workflow: record.workflow,
    status: record.status,
    title: record.report.summary.title,
    summary: record.report.summary.summary,
    generatedAt: record.report.base.generatedAt,
    sanitized: record.report.base.sanitized
  };
  if (record.report.source.sourceLabel) vm.sourceLabel = record.report.source.sourceLabel;
  if (record.report.summary.riskLevel) vm.riskLevel = record.report.summary.riskLevel;
  return vm;
}
