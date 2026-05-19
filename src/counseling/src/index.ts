export {
  aggregateEscalationSignals,
  attachCounselingReportInput,
  attachCounselingReportReference,
  createCounselingSession,
  appendCounselingReply,
  finishCounselingSession,
  toCounselingGetData,
  toCounselingReplyData,
  toCounselingStartData
} from "./session/counseling-session.js";
export type {
  CounselingEscalationSummary,
  CounselingSession,
  CounselingReplyMutation,
  CounselingRiskEscalationLevel,
  CounselingRiskSignal,
  CounselingStageSnapshot,
  CounselingStageSnapshotTrigger,
  CreateCounselingSessionParams,
  AppendCounselingReplyParams,
  FinishCounselingSessionParams
} from "./session/counseling-session.js";

export {
  createCounselingWorkflowAdapter,
  DEFAULT_COUNSELING_RETRY_POLICY
} from "./workflow/counseling-workflow-adapter.js";
export type {
  CounselingWorkflowAdapter,
  CounselingRuntimeRetryPolicy,
  CreateCounselingWorkflowAdapterOptions
} from "./workflow/counseling-workflow-adapter.js";

export { createCounselingUseCases } from "./application/counseling-use-cases.js";
export type {
  CounselingSessionListItem,
  CounselingUseCases,
  CounselingIdGenerator,
  CreateCounselingUseCasesOptions
} from "./application/counseling-use-cases.js";

export { createCounselingController } from "./controller/counseling-controller.js";
export type {
  CounselingController,
  CreateCounselingControllerOptions
} from "./controller/counseling-controller.js";

export type {
  CounselingSessionListQuery,
  CounselingSessionListResult,
  CounselingSessionRepository
} from "./ports/counseling-session-repository.js";
export type { CounselingReportPort } from "./ports/counseling-report-port.js";
export type {
  CounselingRuntimePort,
  CounselingRuntimeStartInput,
  CounselingRuntimeStartOutput,
  CounselingRuntimeReplyInput,
  CounselingRuntimeReplyOutput
} from "./ports/counseling-runtime-port.js";
export { toCounselingReportInput } from "./reporting/counseling-report-input.js";
export type {
  CounselingReportExcerpt,
  CounselingReportInput,
  CounselingReportRecommendation,
  CounselingReportRiskSignal,
  CounselingReportSection
} from "./reporting/counseling-report-input.js";

export {
  CounselingRuntimeRetryExhaustedError,
  CounselingRuntimeTimeoutError,
  CounselingRuntimeUnavailableError,
  CounselingSessionNotFoundError,
  CounselingSessionStateError
} from "./errors.js";

export { InMemoryCounselingSessionRepository } from "./testing/in-memory-counseling-session-repository.js";
