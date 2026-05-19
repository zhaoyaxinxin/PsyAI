import type { RuntimeWorkflowKind } from "../common.js";

export type RiskLevel = "low" | "moderate" | "high" | "urgent";
export type EscalationLevel = "none" | "monitor" | "escalate" | "urgent";

export interface RiskSignal {
  signalId: string;
  riskLevel: RiskLevel;
  escalationLevel: EscalationLevel;
  reason: string;
  detectedAt: string;
  boundaryNotice?: string;
}

export interface RiskRecommendation {
  recommendationId: string;
  title: string;
  rationale: string;
  priority: "now" | "soon" | "later";
}

export interface RiskAnalysisOutput {
  workflow: RuntimeWorkflowKind;
  schemaId: string;
  schemaVersion: string;
  riskLevel: RiskLevel;
  escalationLevel: EscalationLevel;
  signals: RiskSignal[];
  recommendations: RiskRecommendation[];
  summary: string;
  occurredAt: string;
  confidence?: number;
}
