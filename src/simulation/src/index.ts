export {
  createSimulationPreparation,
  createSimulationRun,
  advanceSimulationRun,
  attachSimulationReportReference,
  finishSimulationRun,
  getCurrentNode,
  toSimulationPrepareData,
  toSimulationFinishData,
  toSimulationNodeData,
  toSimulationRunData,
  toSimulationScenarioData,
  toSimulationAdvanceData
} from "./simulation/simulation-run.js";
export type {
  SimulationActionOption,
  SimulationAgentPersona,
  SimulationAgentProfile,
  SimulationAgentReaction,
  SimulationActorState,
  SimulationBehaviorConfig,
  SimulationBranchDefinition,
  SimulationEnvironmentProfile,
  SimulationEnvironmentReaction,
  SimulationNodeKind,
  SimulationPreparationSnapshot,
  SimulationRun,
  SimulationRunStatus,
  SimulationRouteStage,
  SimulationScenario,
  SimulationScenarioAgentSeed,
  SimulationScenarioActorSeed,
  SimulationScenarioEnvironmentSeed,
  SimulationScenarioNode,
  SimulationTimelineEntry,
  SimulationTurnActorStateChange,
  SimulationTurnOutcome,
  CreateSimulationPreparationParams,
  CreateSimulationRunParams,
  AdvanceSimulationRunParams
} from "./simulation/simulation-run.js";

export {
  getAvailableBranches,
  getScenarioNode,
  getSelectedBranch
} from "./rules/branch-rule-engine.js";

export {
  createSimulationWorkflowAdapter,
  DEFAULT_SIMULATION_RETRY_POLICY
} from "./workflow/simulation-workflow-adapter.js";
export type {
  CreateSimulationWorkflowAdapterOptions,
  SimulationRuntimeRetryPolicy,
  SimulationWorkflowAdapter
} from "./workflow/simulation-workflow-adapter.js";

export { createSimulationUseCases } from "./application/simulation-use-cases.js";
export type {
  CreateSimulationUseCasesOptions,
  SimulationIdGenerator,
  SimulationRunListItem,
  SimulationUseCases
} from "./application/simulation-use-cases.js";

export { toSimulationReportInput } from "./reporting/simulation-report-input.js";
export type {
  SimulationActorStateChange,
  SimulationReportInput,
  SimulationReportKeyNode,
  SimulationReportTimelineItem
} from "./reporting/simulation-report-input.js";

export { createSimulationController } from "./controller/simulation-controller.js";
export type {
  CreateSimulationControllerOptions,
  SimulationController
} from "./controller/simulation-controller.js";

export type {
  SimulationRepository,
  SimulationRunListQuery,
  SimulationRunListResult
} from "./ports/simulation-repository.js";
export type {
  SimulationRuntimePrepareInput,
  SimulationRuntimePrepareOutput,
  SimulationRuntimeAdvanceInput,
  SimulationRuntimeOutput,
  SimulationRuntimePort,
  SimulationRuntimeStartInput
} from "./ports/simulation-runtime-port.js";
export type { SimulationReportPort } from "./ports/simulation-report-port.js";

export {
  SimulationRunNotFoundError,
  SimulationRunStateError,
  SimulationRuntimeRetryExhaustedError,
  SimulationRuntimeTimeoutError,
  SimulationRuntimeUnavailableError,
  SimulationScenarioNotFoundError
} from "./errors.js";

export { InMemorySimulationRepository } from "./testing/in-memory-simulation-repository.js";
