import type { ReportExportFormat } from "@psyai/contracts";

import type {
  NormalizedReportListQuery,
  ReportRegistryRecord,
  ReportingWorkflow
} from "../reporting-types.js";

export interface ReportRegistryListResult {
  items: ReportRegistryRecord[];
  totalItems: number;
}

export interface ReportRegistryCounts {
  total: number;
  byWorkflow: Record<ReportingWorkflow, number>;
  byStatus: Record<string, number>;
}

/** Governance actions for maintenance, cleanup, and audit. */
export interface ReportGovernanceActions {
  /** Remove a single report by id. Returns true if deleted, false if not found. */
  delete(reportId: string): Promise<boolean>;

  /** Remove all reports matching optional workflow filter. Returns count removed. */
  deleteByWorkflow(workflow?: ReportingWorkflow): Promise<number>;

  /** Count reports, optionally filtered by workflow or status. */
  count(query?: { workflow?: ReportingWorkflow; status?: string }): Promise<number>;

  /** Full count breakdown by workflow and status. */
  counts(): Promise<ReportRegistryCounts>;

  /** Check whether a report exists. */
  exists(reportId: string): Promise<boolean>;
}

export interface ReportRegistry extends ReportGovernanceActions {
  save(record: ReportRegistryRecord): Promise<void>;
  getById(reportId: string): Promise<ReportRegistryRecord | null>;

  /** Find a report by its source entity (session/run/comparison id). */
  getBySourceEntity(
    workflow: ReportingWorkflow,
    sourceEntityId: string
  ): Promise<ReportRegistryRecord | null>;

  list(query: NormalizedReportListQuery): Promise<ReportRegistryListResult>;
}
