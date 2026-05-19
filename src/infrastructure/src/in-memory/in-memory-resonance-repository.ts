import type {
  ResonanceComparisonLike,
  ResonanceInputLike
} from "../compatibility.js";
import { cloneValue } from "../common/clone.js";

export class InMemoryResonanceRepository<
  TInput extends ResonanceInputLike = ResonanceInputLike,
  TComparison extends ResonanceComparisonLike = ResonanceComparisonLike
> {
  readonly #inputs = new Map<string, TInput>();
  readonly #comparisons = new Map<string, TComparison>();

  async saveInput(input: TInput): Promise<void> {
    this.#inputs.set(input.inputId, cloneValue(input));
  }

  async getInputById(inputId: string): Promise<TInput | null> {
    const input = this.#inputs.get(inputId);
    return input ? cloneValue(input) : null;
  }

  async saveComparison(comparison: TComparison): Promise<void> {
    this.#comparisons.set(comparison.comparisonId, cloneValue(comparison));
  }

  async getComparisonById(comparisonId: string): Promise<TComparison | null> {
    const comparison = this.#comparisons.get(comparisonId);
    return comparison ? cloneValue(comparison) : null;
  }
}
