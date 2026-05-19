import type { ReportExportFormat, ReportReference } from "@psyai/contracts";
import type { CounselingReportInput } from "@psyai/counseling";
import type { ResonanceReportInput } from "@psyai/resonance";
import type { SimulationReportInput } from "@psyai/simulation";

import { buildCounselingReport } from "../builders/counseling-report-builder.js";
import { buildResonanceReport } from "../builders/resonance-report-builder.js";
import { buildSimulationReport } from "../builders/simulation-report-builder.js";
import { ReportNotFoundError } from "../errors.js";
import { createReportExport } from "../export/report-exporter.js";
import type { ReportRegistry } from "../ports/report-registry.js";
import { toReportListData, toReportReference, toReportStatusData } from "../projection/reporting-query-projection.js";
import type {
  NormalizedReportListQuery,
  ReportExportData,
  ReportListData,
  ReportListQuery,
  ReportStatusData,
  ReportingReport,
  ReportingWorkflow
} from "../reporting-types.js";

export interface ReportingIdGenerator {
  nextReportId(workflow: ReportingWorkflow): string;
}

export interface ReportingUseCases {
  createSimulationReport(input: {
    reportInput: SimulationReportInput;
    occurredAt?: string;
  }): Promise<ReportReference>;
  createResonanceReport(input: {
    reportInput: ResonanceReportInput;
    occurredAt?: string;
  }): Promise<ReportReference>;
  createCounselingReport(input: {
    reportInput: CounselingReportInput;
    occurredAt?: string;
  }): Promise<ReportReference>;
  getReport(reportId: string): Promise<ReportingReport>;
  listReports(query: ReportListQuery): Promise<ReportListData>;
  getReportStatus(reportId: string): Promise<ReportStatusData>;
  exportReport(input: {
    reportId: string;
    format: ReportExportFormat;
    occurredAt?: string;
  }): Promise<ReportExportData>;
}

export interface CreateReportingUseCasesOptions {
  registry: ReportRegistry;
  ids?: ReportingIdGenerator;
  now?: () => string;
  reportVersion?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function createDefaultIdGenerator(): ReportingIdGenerator {
  const counters = new Map<ReportingWorkflow, number>();

  return {
    nextReportId(workflow) {
      const nextValue = (counters.get(workflow) ?? 0) + 1;
      counters.set(workflow, nextValue);
      return `rpt-${workflow}-${String(nextValue).padStart(3, "0")}`;
    }
  };
}

async function loadRecordOrThrow(
  registry: ReportRegistry,
  reportId: string
) {
  const record = await registry.getById(reportId);

  if (record === null) {
    throw new ReportNotFoundError(reportId);
  }

  return record;
}

function normalizeListQuery(
  query: ReportListQuery
): NormalizedReportListQuery {
  const normalized: NormalizedReportListQuery = {
    page: query.page ?? DEFAULT_PAGE,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE
  };

  if (query.workflow) normalized.workflow = query.workflow;
  if (query.status) normalized.status = query.status;

  return normalized;
}

export function createReportingUseCases(
  options: CreateReportingUseCasesOptions
): ReportingUseCases {
  const ids = options.ids ?? createDefaultIdGenerator();
  const now = options.now ?? (() => new Date().toISOString());
  const reportVersion = options.reportVersion ?? "v1";

  return {
    async createSimulationReport({ reportInput, occurredAt = now() }) {
      const report = buildSimulationReport({
        reportId: ids.nextReportId("simulation"),
        reportInput,
        generatedAt: occurredAt,
        reportVersion
      });
      const record = {
        reportId: report.base.reportId,
        workflow: "simulation" as const,
        sourceEntityId: report.detail.runId,
        status: "ready" as const,
        createdAt: occurredAt,
        updatedAt: occurredAt,
        reportVersion,
        report
      };

      await options.registry.save(record);
      return toReportReference(record);
    },

    async createResonanceReport({ reportInput, occurredAt = now() }) {
      const report = buildResonanceReport({
        reportId: ids.nextReportId("resonance"),
        reportInput,
        generatedAt: occurredAt,
        reportVersion
      });
      const record = {
        reportId: report.base.reportId,
        workflow: "resonance" as const,
        sourceEntityId: report.detail.comparisonId,
        status: "ready" as const,
        createdAt: occurredAt,
        updatedAt: occurredAt,
        reportVersion,
        report
      };

      await options.registry.save(record);
      return toReportReference(record);
    },

    async createCounselingReport({ reportInput, occurredAt = now() }) {
      const report = buildCounselingReport({
        reportId: ids.nextReportId("counseling"),
        reportInput,
        generatedAt: occurredAt,
        reportVersion
      });
      const record = {
        reportId: report.base.reportId,
        workflow: "counseling" as const,
        sourceEntityId: report.detail.sessionId,
        status: "ready" as const,
        createdAt: occurredAt,
        updatedAt: occurredAt,
        reportVersion,
        report
      };

      await options.registry.save(record);
      return toReportReference(record);
    },

    async getReport(reportId) {
      const record = await loadRecordOrThrow(options.registry, reportId);
      return record.report;
    },

    async listReports(query) {
      const normalized = normalizeListQuery(query);
      const result = await options.registry.list(normalized);
      return toReportListData(
        result.items,
        result.totalItems,
        normalized.page,
        normalized.pageSize
      );
    },

    async getReportStatus(reportId) {
      const record = await loadRecordOrThrow(options.registry, reportId);
      return toReportStatusData(record);
    },

    async exportReport({ reportId, format, occurredAt = now() }) {
      const record = await loadRecordOrThrow(options.registry, reportId);
      return createReportExport(record.report, format, occurredAt);
    }
  };
}
