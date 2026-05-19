import type {
  NormalizedReportListQueryLike,
  ReportRegistryListResultLike,
  ReportRegistryRecordLike
} from "../compatibility.js";
import { cloneValue } from "../common/clone.js";

export class InMemoryReportRegistry<TReport = unknown> {
  readonly #records = new Map<string, ReportRegistryRecordLike<TReport>>();

  async save(record: ReportRegistryRecordLike<TReport>): Promise<void> {
    this.#records.set(record.reportId, cloneValue(record));
  }

  async getById(reportId: string): Promise<ReportRegistryRecordLike<TReport> | null> {
    const record = this.#records.get(reportId);
    return record ? cloneValue(record) : null;
  }

  async list(
    query: NormalizedReportListQueryLike
  ): Promise<ReportRegistryListResultLike<TReport>> {
    const filtered = [...this.#records.values()]
      .filter((record) => (query.workflow ? record.workflow === query.workflow : true))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    const startIndex = (query.page - 1) * query.pageSize;
    const items = filtered
      .slice(startIndex, startIndex + query.pageSize)
      .map((record) => cloneValue(record));

    return {
      items,
      totalItems: filtered.length
    };
  }
}
