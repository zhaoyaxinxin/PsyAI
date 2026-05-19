import type { AgentMessage } from "../agent/agent-runtime.js";
import type { NormalizedAnalysis } from "../normalization/analysis-normalizer.js";
import type { PromptAssetSelection } from "../prompt/prompt-asset.js";

export interface ResonanceWorkflowInput {
  sourceType: "text" | "file";
  text?: string;
  fileName?: string;
  previewText?: string;
  tags: string[];
}

export interface ResonanceSearchCandidate {
  caseId: string;
  title: string;
  summary: string;
  excerpt?: string;
  themes: string[];
  keywords: string[];
  candidateSetId?: string;
}

export interface ResonanceWorkflowSearchInput {
  queryText: string;
  tags: string[];
  topK: number;
  candidateSetId?: string;
}

export interface ResonanceWorkflowRerankInput {
  input: ResonanceWorkflowInput;
  candidates: ResonanceSearchCandidate[];
  topK: number;
}

export interface ResonanceWorkflowRerankResult {
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

export interface ResonanceWorkflowSearchOutput {
  candidates: ResonanceSearchCandidate[];
  transcript: AgentMessage[];
  prompt: PromptAssetSelection;
}

export interface ResonanceWorkflowRerankOutput {
  results: ResonanceWorkflowRerankResult[];
  analysis: NormalizedAnalysis;
  transcript: AgentMessage[];
  prompt: PromptAssetSelection;
}

export interface ResonanceWorkflowRuntime {
  search(input: ResonanceWorkflowSearchInput): Promise<ResonanceWorkflowSearchOutput>;
  rerank(input: ResonanceWorkflowRerankInput): Promise<ResonanceWorkflowRerankOutput>;
}
