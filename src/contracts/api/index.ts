export {
  createSuccessEnvelopeSchema,
  dateRangeFilterSchema,
  entityIdSchema,
  hostBootstrapSummarySchema,
  hostInitializationErrorKindSchema,
  isoDateTimeSchema,
  pageInfoSchema,
  reportReferenceSchema,
  sceneIdSchema,
  workflowKindSchema,
  type HostBootstrapSummary,
  type PageInfo,
  type ReportReference
} from "./shared.js";

export {
  apiErrorSchema,
  errorCodeSchema,
  errorEnvelopeSchema,
  healthCheckSchema,
  recoverabilitySchema,
  type ApiError,
  type ErrorCode,
  type ErrorEnvelope,
  type Recoverability
} from "./errors.js";

export {
  riskEscalationStatusSchema,
  counselingEscalationResultSchema,
  type RiskEscalationStatus,
  type CounselingEscalationResult
} from "./escalation.js";

export {
  parseWarningSchema,
  importSuccessSchema,
  importFailureSchema,
  importResultSchema,
  type ParseWarning,
  type ImportSuccess,
  type ImportFailure,
  type ImportResult
} from "./import.js";

export * from "./counseling.js";
export * from "./simulation.js";
export * from "./resonance.js";
export * from "./host.js";
export * from "./risk.js";
export * from "./export.js";
export * from "./health.js";

// ---------------------------------------------------------------------------
// Stable aliases for future unified naming migration
// Mapping: detail -> get (counseling), detail -> node (simulation)
// ---------------------------------------------------------------------------

export {
  counselingGetRequestSchema as counselingDetailRequestSchema,
  counselingGetResponseSchema as counselingDetailResponseSchema,
  type CounselingGetRequest as CounselingDetailRequest,
  type CounselingGetResponse as CounselingDetailResponse
} from "./counseling.js";

export {
  simulationNodeRequestSchema as simulationDetailRequestSchema,
  simulationNodeResponseSchema as simulationDetailResponseSchema,
  type SimulationNodeRequest as SimulationDetailRequest,
  type SimulationNodeResponse as SimulationDetailResponse
} from "./simulation.js";
