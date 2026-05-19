import type { RuntimeWorkflowKind } from "../common.js";
import type { PromptAssetSelection } from "../prompt/prompt-asset.js";

export interface NormalizedAnalysis {
  workflow: RuntimeWorkflowKind;
  schemaId: string;
  schemaVersion: string;
  summary: string;
  findings: string[];
  attributes: Record<string, unknown>;
  warnings: string[];
  confidence?: number;
}

export interface AnalysisNormalizerInput<TRaw = unknown> {
  workflow: RuntimeWorkflowKind;
  schemaId: string;
  schemaVersion: string;
  raw: TRaw;
  occurredAt: string;
  prompt?: PromptAssetSelection;
}

export interface AnalysisNormalizer<
  TRaw = unknown,
  TOutput extends NormalizedAnalysis = NormalizedAnalysis
> {
  normalize(input: AnalysisNormalizerInput<TRaw>): Promise<TOutput>;
}

export function validateNormalizedAnalysis(analysis: NormalizedAnalysis): string[] {
  const issues: string[] = [];

  if (!analysis.schemaId.trim()) {
    issues.push("schemaId must not be empty");
  }

  if (!analysis.schemaVersion.trim()) {
    issues.push("schemaVersion must not be empty");
  }

  if (!analysis.summary.trim()) {
    issues.push("summary must not be empty");
  }

  if (analysis.confidence !== undefined && (analysis.confidence < 0 || analysis.confidence > 1)) {
    issues.push("confidence must be between 0 and 1");
  }

  return issues;
}
