import type { AgentMessage } from "../agent/agent-runtime.js";
import type { NormalizedAnalysis } from "../normalization/analysis-normalizer.js";
import type { PromptAssetSelection } from "../prompt/prompt-asset.js";

export type CounselingWorkflowTurnRole = "user" | "assistant";

export interface CounselingWorkflowTurn {
  role: CounselingWorkflowTurnRole;
  message: string;
  occurredAt: string;
}

export interface CounselingWorkflowStartInput {
  openingMessage: string;
  userContext: string[];
  occurredAt: string;
}

export interface CounselingWorkflowReplyInput {
  message: string;
  history: CounselingWorkflowTurn[];
  latestAnalysis?: NormalizedAnalysis;
  occurredAt: string;
}

export interface CounselingWorkflowOutput {
  analysis: NormalizedAnalysis;
  assistantMessage?: string;
  transcript: AgentMessage[];
  prompt: PromptAssetSelection;
}

export interface CounselingWorkflowRuntime {
  start(input: CounselingWorkflowStartInput): Promise<CounselingWorkflowOutput>;
  reply(input: CounselingWorkflowReplyInput): Promise<CounselingWorkflowOutput>;
}
