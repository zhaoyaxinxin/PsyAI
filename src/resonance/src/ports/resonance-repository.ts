import type { ResonanceComparison } from "../match/resonance-comparison.js";
import type { ResonanceInput } from "../input/resonance-input.js";

export interface ResonanceInputListResult {
  items: ResonanceInput[];
  totalItems: number;
}

export interface ResonanceComparisonListResult {
  items: ResonanceComparison[];
  totalItems: number;
}

export interface ResonanceListQuery {
  page?: number;
  pageSize?: number;
}

export interface ResonanceRepository {
  saveInput(input: ResonanceInput): Promise<void>;
  getInputById(inputId: string): Promise<ResonanceInput | null>;
  saveComparison(comparison: ResonanceComparison): Promise<void>;
  getComparisonById(comparisonId: string): Promise<ResonanceComparison | null>;

  /** List inputs ordered by receivedAt descending. */
  listInputs(query?: ResonanceListQuery): Promise<ResonanceInputListResult>;

  /** List comparisons ordered by createdAt descending. */
  listComparisons(query?: ResonanceListQuery): Promise<ResonanceComparisonListResult>;

  /** Return the most recently submitted input for resumption. */
  getMostRecentInput(): Promise<ResonanceInput | null>;

  /** Return the most recent comparison, or null. */
  getMostRecentComparison(): Promise<ResonanceComparison | null>;
}
