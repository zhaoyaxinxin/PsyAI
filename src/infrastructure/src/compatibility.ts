export interface CounselingSessionLike {
  sessionId: string;
}

export interface SimulationRunLike {
  runId: string;
}

export interface SimulationScenarioLike {
  scenarioId: string;
}

export interface ResonanceInputLike {
  inputId: string;
  queryText: string;
  summaryText: string;
  rawText?: string;
  tags: string[];
}

export interface ResonanceComparisonLike {
  comparisonId: string;
}

export type ReportingWorkflowLike = "simulation" | "resonance";

export interface ReportRegistryRecordLike<TReport = unknown> {
  reportId: string;
  workflow: ReportingWorkflowLike;
  sourceEntityId: string;
  status: "ready";
  createdAt: string;
  updatedAt: string;
  reportVersion: string;
  report: TReport;
}

export interface NormalizedReportListQueryLike {
  workflow?: ReportingWorkflowLike;
  page: number;
  pageSize: number;
}

export interface ReportRegistryListResultLike<TReport = unknown> {
  items: ReportRegistryRecordLike<TReport>[];
  totalItems: number;
}

export interface AppModelSelectionLike {
  provider: string;
  modelId: string;
}

export interface AppSettingsLike {
  theme: string;
  language: string;
  workspaceRoot: string;
  exportDirectory: string;
  modelSelection: AppModelSelectionLike;
}

export interface AppSettingsPatchLike
  extends Partial<Omit<AppSettingsLike, "modelSelection">> {
  modelSelection?: Partial<AppModelSelectionLike>;
}

export interface AppSettingsStoreLike<TSettings extends AppSettingsLike = AppSettingsLike> {
  load(): Promise<TSettings>;
  save(next: TSettings): Promise<TSettings>;
  patch(patch: AppSettingsPatchLike): Promise<TSettings>;
  reset(): Promise<TSettings>;
}

export type RuntimeWorkflowKindLike = "counseling" | "simulation" | "resonance";

export interface RuntimeExecutionContextLike {
  workflow: RuntimeWorkflowKindLike;
  occurredAt: string;
  correlationId?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface RuntimeAnnotationLike {
  label: string;
  value: string;
}

export type AgentMessageRoleLike = "system" | "user" | "assistant" | "tool";

export interface AgentMessageLike {
  role: AgentMessageRoleLike;
  content: string;
  name?: string;
}

export interface AgentToolDefinitionLike {
  name: string;
  description: string;
}

export interface AgentToolCallLike {
  toolName: string;
  inputSummary: string;
}

export interface AgentUsageLike {
  inputUnits: number;
  outputUnits: number;
}

export interface PromptAssetSelectionLike {
  packId: string;
  version: string;
  promptKey: string;
}

export interface AgentRunInputLike {
  agentId: string;
  objective: string;
  messages: AgentMessageLike[];
  context: RuntimeExecutionContextLike;
  prompt?: PromptAssetSelectionLike;
  tools?: AgentToolDefinitionLike[];
}

export interface AgentParticipantLike {
  agentId: string;
  role: string;
  objective: string;
}

export interface MultiAgentRunInputLike {
  swarmId: string;
  objective: string;
  participants: AgentParticipantLike[];
  messages: AgentMessageLike[];
  context: RuntimeExecutionContextLike;
  sharedPrompt?: PromptAssetSelectionLike;
}

export interface AgentEnvironmentSnapshotLike {
  scene: string;
  observedSignals: string[];
  availableActions: string[];
}

export interface EnvironmentAgentRunInputLike {
  agentId: string;
  objective: string;
  environment: AgentEnvironmentSnapshotLike;
  messages: AgentMessageLike[];
  context: RuntimeExecutionContextLike;
  prompt?: PromptAssetSelectionLike;
}

export interface AgentRunOutputLike {
  finalMessage: AgentMessageLike;
  toolCalls: AgentToolCallLike[];
  annotations: RuntimeAnnotationLike[];
  usage: AgentUsageLike;
  rawOutput: unknown;
}

export interface MultiAgentRunOutputLike {
  coordinatorMessage: AgentMessageLike;
  participantMessages: AgentMessageLike[];
  annotations: RuntimeAnnotationLike[];
  usage: AgentUsageLike;
  rawOutput: unknown;
}

export interface EnvironmentAgentRunOutputLike {
  finalMessage: AgentMessageLike;
  chosenAction: string;
  annotations: RuntimeAnnotationLike[];
  usage: AgentUsageLike;
  rawOutput: unknown;
}

export interface AgentRuntimeLike {
  run(input: AgentRunInputLike): Promise<AgentRunOutputLike>;
  runMultiAgent(input: MultiAgentRunInputLike): Promise<MultiAgentRunOutputLike>;
  runInEnvironment(input: EnvironmentAgentRunInputLike): Promise<EnvironmentAgentRunOutputLike>;
}

export interface ResonanceRetrievalSearchCandidateLike {
  caseId: string;
  title: string;
  summary: string;
  excerpt?: string;
  themes: string[];
  keywords: string[];
  candidateSetId?: string;
}

export interface ResonanceRetrievalSearchInputLike {
  queryText: string;
  tags: string[];
  topK: number;
  candidateSetId?: string;
}

export interface ResonanceRetrievalRerankInputLike<
  TInput extends ResonanceInputLike = ResonanceInputLike
> {
  input: TInput;
  candidates: ResonanceRetrievalSearchCandidateLike[];
  topK: number;
}

export interface ResonanceRetrievalRerankResultLike {
  caseId: string;
  title: string;
  score: number;
  rationale: string;
  sharedThemes: string[];
  inputExcerpt: string;
  caseExcerpt: string;
  interpretation: string;
  excerpt?: string;
}

export interface ResonanceRetrievalPortLike {
  search(
    input: ResonanceRetrievalSearchInputLike
  ): Promise<ResonanceRetrievalSearchCandidateLike[]>;
  rerank(
    input: ResonanceRetrievalRerankInputLike
  ): Promise<ResonanceRetrievalRerankResultLike[]>;
}
