export type {
  RuntimeFailureKind,
  RuntimeFailure
} from "./runtime-failure.js";
export { isRetryableFailure, createRuntimeFailure, classifyProviderError } from "./runtime-failure.js";

export type {
  RetryPolicy,
  RetryDecision
} from "./retry-policy.js";
export {
  computeRetryDecision,
  DEFAULT_RETRY_POLICY
} from "./retry-policy.js";

export type { TimeoutContext } from "./timeout-context.js";
export {
  createTimeoutContext,
  isTimedOut,
  remainingMs
} from "./timeout-context.js";

export type {
  RiskLevel,
  EscalationLevel,
  RiskSignal,
  RiskRecommendation,
  RiskAnalysisOutput
} from "./risk-analysis.js";

export type {
  ProviderCapability,
  ProviderExtension
} from "./provider-extension.js";
export {
  matchCapability,
  listCapabilityNames
} from "./provider-extension.js";

export type { ProviderSeam } from "./provider-seam.js";

export type {
  StructuredOutputSchema,
  OutputValidationResult
} from "./structured-output.js";
export {
  validateStructuredOutput,
  coerceToRecord,
  validateRawOutput
} from "./structured-output.js";

export type {
  ExecutionGuardOptions,
  GuardedExecutionResult
} from "./execution-guard.js";
export { executeWithGuard } from "./execution-guard.js";
