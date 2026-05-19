import type { ResonanceComparison } from "../match/resonance-comparison.js";
import type { ResonanceInput } from "../input/resonance-input.js";
import type {
  ResonanceComparisonListResult,
  ResonanceInputListResult,
  ResonanceListQuery,
  ResonanceRepository
} from "../ports/resonance-repository.js";

export class InMemoryResonanceRepository implements ResonanceRepository {
  readonly inputs = new Map<string, ResonanceInput>();
  readonly comparisons = new Map<string, ResonanceComparison>();

  async saveInput(input: ResonanceInput): Promise<void> {
    this.inputs.set(input.inputId, structuredClone(input));
  }

  async getInputById(inputId: string): Promise<ResonanceInput | null> {
    const input = this.inputs.get(inputId);
    return input ? structuredClone(input) : null;
  }

  async saveComparison(comparison: ResonanceComparison): Promise<void> {
    this.comparisons.set(comparison.comparisonId, structuredClone(comparison));
  }

  async getComparisonById(comparisonId: string): Promise<ResonanceComparison | null> {
    const comparison = this.comparisons.get(comparisonId);
    return comparison ? structuredClone(comparison) : null;
  }

  async listInputs(query?: ResonanceListQuery): Promise<ResonanceInputListResult> {
    const all = [...this.inputs.values()].sort(
      (a, b) => b.receivedAt.localeCompare(a.receivedAt)
    );
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const startIndex = (page - 1) * pageSize;
    const items = all.slice(startIndex, startIndex + pageSize).map((i) => structuredClone(i));

    return { items, totalItems: all.length };
  }

  async listComparisons(query?: ResonanceListQuery): Promise<ResonanceComparisonListResult> {
    const all = [...this.comparisons.values()].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const startIndex = (page - 1) * pageSize;
    const items = all.slice(startIndex, startIndex + pageSize).map((c) => structuredClone(c));

    return { items, totalItems: all.length };
  }

  async getMostRecentInput(): Promise<ResonanceInput | null> {
    const all = [...this.inputs.values()].sort(
      (a, b) => b.receivedAt.localeCompare(a.receivedAt)
    );
    const mostRecent = all[0];
    return mostRecent ? structuredClone(mostRecent) : null;
  }

  async getMostRecentComparison(): Promise<ResonanceComparison | null> {
    const all = [...this.comparisons.values()].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt)
    );
    const mostRecent = all[0];
    return mostRecent ? structuredClone(mostRecent) : null;
  }
}
