export {
  createAnalysisDrivenRetrievalProfile,
  createHeuristicComparisonExplanations
} from "./comparison/resonance-comparison-explanation.js";
export type {
  ResonanceComparisonExplanation,
  ResonanceRetrievalQueryProfile
} from "./comparison/resonance-comparison-explanation.js";

export {
  attachResonanceInputAnalysis,
  createHeuristicResonanceInputAnalysis,
  toResonanceAnalyzeData
} from "./analysis/resonance-input-analysis.js";
export type { ResonanceInputAnalysis } from "./analysis/resonance-input-analysis.js";

export {
  createResonanceInput,
  getResonanceInputExcerpt,
  toResonanceInputData
} from "./input/resonance-input.js";
export type {
  ResonanceInput,
  ResonanceInputSourceType,
  CreateResonanceInputParams
} from "./input/resonance-input.js";

export {
  createResonanceComparison,
  attachResonanceReportInput,
  attachResonanceReportReference
} from "./match/resonance-comparison.js";
export type {
  ResonanceComparison,
  ResonanceMatch,
  CreateResonanceComparisonParams
} from "./match/resonance-comparison.js";

export {
  DEFAULT_RESONANCE_TOP_K,
  DEFAULT_MATCHES_PAGE_SIZE,
  MAX_RESONANCE_THEME_COUNT,
  normalizeTags,
  resolveResonanceTopK
} from "./policy/resonance-policy.js";

export {
  toResonanceCompareData,
  toResonanceMatchesData,
  toResonanceReportStatusData
} from "./projection/resonance-match-projection.js";

export {
  createResonanceRetrievalAdapter,
  DEFAULT_RESONANCE_RETRY_POLICY
} from "./workflow/resonance-retrieval-adapter.js";
export type {
  CreateResonanceRetrievalAdapterOptions,
  ResonanceComparisonWorkflowAdapter,
  ResonanceRetrievalRetryPolicy
} from "./workflow/resonance-retrieval-adapter.js";

export { toResonanceReportInput } from "./reporting/resonance-report-input.js";
export type {
  ResonanceReportInput,
  ResonanceReportFragmentComparison,
  ResonanceReportMatchedCase,
  ResonanceReportThemeInterpretation
} from "./reporting/resonance-report-input.js";

export { createResonanceUseCases } from "./application/resonance-use-cases.js";
export type {
  CreateResonanceUseCasesOptions,
  ResonanceComparisonListItem,
  ResonanceIdGenerator,
  ResonanceInputListItem,
  ResonanceUseCases
} from "./application/resonance-use-cases.js";

export { createResonanceController } from "./controller/resonance-controller.js";
export type {
  CreateResonanceControllerOptions,
  ResonanceController
} from "./controller/resonance-controller.js";

export type {
  ResonanceComparisonListResult,
  ResonanceInputListResult,
  ResonanceListQuery,
  ResonanceRepository
} from "./ports/resonance-repository.js";
export type { ResonanceReportPort } from "./ports/resonance-report-port.js";
export type { ResonanceAnalysisPort } from "./ports/resonance-analysis-port.js";
export type { ResonanceComparisonExplainerPort } from "./ports/resonance-comparison-explainer-port.js";
export type {
  ResonanceRetrievalPort,
  ResonanceRetrievalRerankInput,
  ResonanceRetrievalRerankResult,
  ResonanceRetrievalSearchCandidate,
  ResonanceRetrievalSearchInput
} from "./ports/resonance-retrieval-port.js";

export { InMemoryResonanceRepository } from "./testing/in-memory-resonance-repository.js";
export { FakeResonanceRetrieval } from "./testing/fake-resonance-retrieval.js";
export type { FakeResonanceCaseRecord } from "./testing/fake-resonance-retrieval.js";

export {
  ResonanceComparisonNotFoundError,
  ResonanceInputNotFoundError,
  ResonanceRetrievalRetryExhaustedError,
  ResonanceRetrievalTimeoutError,
  ResonanceRuntimeUnavailableError
} from "./errors.js";
