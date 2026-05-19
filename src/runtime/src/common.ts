export type RuntimeWorkflowKind = "counseling" | "simulation" | "resonance";

export interface RuntimeExecutionContext {
  workflow: RuntimeWorkflowKind;
  occurredAt: string;
  correlationId?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface RuntimeAnnotation {
  label: string;
  value: string;
}

export function isRuntimeWorkflowKind(value: string): value is RuntimeWorkflowKind {
  return value === "counseling" || value === "simulation" || value === "resonance";
}
