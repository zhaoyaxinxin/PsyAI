import type {
  ReportRegistry,
  ReportRegistryCounts,
  ReportRegistryListResult
} from "../ports/report-registry.js";
import type {
  NormalizedReportListQuery,
  ReportRegistryRecord,
  ReportingWorkflow
} from "../reporting-types.js";

function cloneRecord(record: ReportRegistryRecord): ReportRegistryRecord {
  return structuredClone(record);
}

export class InMemoryReportRegistry implements ReportRegistry {
  readonly #records = new Map<string, ReportRegistryRecord>();

  async save(record: ReportRegistryRecord): Promise<void> {
    this.#records.set(record.reportId, cloneRecord(record));
  }

  async getById(reportId: string): Promise<ReportRegistryRecord | null> {
    const record = this.#records.get(reportId);
    return record ? cloneRecord(record) : null;
  }

  async getBySourceEntity(
    workflow: ReportingWorkflow,
    sourceEntityId: string
  ): Promise<ReportRegistryRecord | null> {
    for (const record of this.#records.values()) {
      if (record.workflow === workflow && record.sourceEntityId === sourceEntityId) {
        return cloneRecord(record);
      }
    }
    return null;
  }

  async list(query: NormalizedReportListQuery): Promise<ReportRegistryListResult> {
    let filtered = [...this.#records.values()];

    if (query.workflow) {
      filtered = filtered.filter((r) => r.workflow === query.workflow);
    }

    if (query.status) {
      filtered = filtered.filter((r) => r.status === query.status);
    }

    if (query.dateFrom) {
      filtered = filtered.filter((r) => r.report.base.generatedAt >= query.dateFrom!);
    }

    if (query.dateTo) {
      filtered = filtered.filter((r) => r.report.base.generatedAt <= query.dateTo!);
    }

    const sortField = query.sortBy ?? "generatedAt";
    const sortDir = query.sortDirection ?? "desc";

    filtered.sort((left, right) => {
      let cmp = 0;
      if (sortField === "generatedAt") {
        cmp = left.report.base.generatedAt.localeCompare(right.report.base.generatedAt);
      } else if (sortField === "title") {
        cmp = left.report.summary.title.localeCompare(right.report.summary.title);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    const startIndex = (query.page - 1) * query.pageSize;
    const items = filtered.slice(startIndex, startIndex + query.pageSize).map(cloneRecord);

    return { items, totalItems: filtered.length };
  }

  async delete(reportId: string): Promise<boolean> {
    return this.#records.delete(reportId);
  }

  async deleteByWorkflow(workflow?: ReportingWorkflow): Promise<number> {
    let count = 0;
    for (const [id, record] of this.#records) {
      if (!workflow || record.workflow === workflow) {
        this.#records.delete(id);
        count += 1;
      }
    }
    return count;
  }

  async count(query?: { workflow?: ReportingWorkflow; status?: string }): Promise<number> {
    let result = 0;
    for (const record of this.#records.values()) {
      if (query?.workflow && record.workflow !== query.workflow) continue;
      if (query?.status && record.status !== query.status) continue;
      result += 1;
    }
    return result;
  }

  async counts(): Promise<ReportRegistryCounts> {
    const result: ReportRegistryCounts = {
      total: 0,
      byWorkflow: { counseling: 0, simulation: 0, resonance: 0 },
      byStatus: {}
    };

    for (const record of this.#records.values()) {
      result.total += 1;
      result.byWorkflow[record.workflow] += 1;
      result.byStatus[record.status] = (result.byStatus[record.status] ?? 0) + 1;
    }

    return result;
  }

  async exists(reportId: string): Promise<boolean> {
    return this.#records.has(reportId);
  }
}
