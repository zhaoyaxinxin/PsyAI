import type { AgentMessage } from "../agent/agent-runtime.js";
import type { NormalizedAnalysis } from "../normalization/analysis-normalizer.js";
import type { PromptAssetSelection } from "../prompt/prompt-asset.js";

export interface SimulationActorState {
  actorId: string;
  actorName: string;
  currentState: string;
  tags?: string[];
}

export interface SimulationWorkflowStartInput {
  scenarioId: string;
  scenarioTitle: string;
  currentNodeId: string;
  currentNodeTitle: string;
  currentNodeSummary: string;
  occurredAt: string;
  operatorNote?: string;
  actorStates: SimulationActorState[];
}

export interface SimulationWorkflowAdvanceInput {
  scenarioId: string;
  runId: string;
  previousNodeId: string;
  previousNodeTitle: string;
  nextNodeId: string;
  nextNodeTitle: string;
  selectedBranchId: string;
  selectedBranchLabel: string;
  occurredAt: string;
  rationale?: string;
  actorStates: SimulationActorState[];
}

export interface SimulationWorkflowOutput {
  actorStates: SimulationActorState[];
  observation?: string;
  analysis?: NormalizedAnalysis;
  transcript: AgentMessage[];
  prompt: PromptAssetSelection;
}

export interface SimulationWorkflowRuntime {
  start(input: SimulationWorkflowStartInput): Promise<SimulationWorkflowOutput>;
  advance(input: SimulationWorkflowAdvanceInput): Promise<SimulationWorkflowOutput>;
}
