import type {
  ReportReference,
  ResonanceCompareResponse
} from "@psyai/contracts";

import type { ResonanceReportInput } from "../reporting/resonance-report-input.js";

export interface ResonanceMatch {
  matchId: string;
  caseId: string;
  title: string;
  score: number;
  rationale: string;
  matchedSignals: string[];
  mismatchSignals: string[];
  sharedThemes: string[];
  inputExcerpt: string;
  caseExcerpt: string;
  interpretation: string;
  keep: boolean;
  uncertainty?: string;
  excerpt?: string;
}

export interface ResonanceComparison {
  comparisonId: string;
  inputId: string;
  status: ResonanceCompareResponse["data"]["status"];
  createdAt: string;
  topK: number;
  matches: ResonanceMatch[];
  candidateSetId?: string;
  reportInput?: ResonanceReportInput;
  reportReference?: ReportReference;
}

export interface CreateResonanceComparisonParams {
  comparisonId: string;
  inputId: string;
  occurredAt: string;
  topK: number;
  matches: ResonanceMatch[];
  candidateSetId?: string;
}

export function createResonanceComparison(
  params: CreateResonanceComparisonParams
): ResonanceComparison {
  return {
    comparisonId: params.comparisonId,
    inputId: params.inputId,
    status: "completed",
    createdAt: params.occurredAt,
    topK: params.topK,
    matches: params.matches,
    ...(params.candidateSetId ? { candidateSetId: params.candidateSetId } : {})
  };
}

export function attachResonanceReportInput(
  comparison: ResonanceComparison,
  reportInput: ResonanceReportInput
): ResonanceComparison {
  return {
    ...comparison,
    reportInput
  };
}

export function attachResonanceReportReference(
  comparison: ResonanceComparison,
  reportReference: ReportReference
): ResonanceComparison {
  return {
    ...comparison,
    reportReference
  };
}
