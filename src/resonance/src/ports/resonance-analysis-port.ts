import type { ResonanceInputAnalysis } from "../analysis/resonance-input-analysis.js";
import type { ResonanceInput } from "../input/resonance-input.js";

export interface ResonanceAnalysisPort {
  analyzeInput(input: ResonanceInput, occurredAt: string): Promise<ResonanceInputAnalysis>;
}
