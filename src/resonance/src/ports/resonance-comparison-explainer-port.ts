import type { ResonanceInput } from "../input/resonance-input.js";
import type { ResonanceRetrievalRerankResult } from "./resonance-retrieval-port.js";
import type { ResonanceComparisonExplanation } from "../comparison/resonance-comparison-explanation.js";

export interface ResonanceComparisonExplainerPort {
  explainCandidates(
    input: ResonanceInput,
    candidates: ResonanceRetrievalRerankResult[],
    occurredAt: string
  ): Promise<ResonanceComparisonExplanation[]>;
}
