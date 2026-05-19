import {
  type AnalysisNormalizer,
  type AnalysisNormalizerInput,
  type NormalizedAnalysis
} from "../normalization/analysis-normalizer.js";

function toFindings(raw: unknown): string[] {
  if (typeof raw === "string") {
    return [raw];
  }

  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }

  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([key, value]) => `${key}: ${String(value)}`);
  }

  return [String(raw)];
}

function toAttributes(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }

  return {
    value: raw
  };
}

export class FakeAnalysisNormalizer
  implements AnalysisNormalizer<unknown, NormalizedAnalysis>
{
  async normalize(input: AnalysisNormalizerInput<unknown>): Promise<NormalizedAnalysis> {
    const findings = toFindings(input.raw);
    const summary = findings[0] ?? `Normalized ${input.workflow} analysis`;

    return {
      workflow: input.workflow,
      schemaId: input.schemaId,
      schemaVersion: input.schemaVersion,
      summary,
      findings,
      attributes: {
        ...toAttributes(input.raw),
        occurredAt: input.occurredAt
      },
      warnings: [],
      confidence: 0.66
    };
  }
}
