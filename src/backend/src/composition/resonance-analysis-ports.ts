import {
  createHeuristicResonanceInputAnalysis,
  getResonanceInputExcerpt,
  type ResonanceAnalysisPort,
  type ResonanceInputAnalysis,
  type ResonanceInput
} from "@psyai/resonance";
import { resonanceInputAnalysisSchema } from "@psyai/contracts";
import type { DeepSeekLlmAdapter } from "@psyai/infrastructure";

function buildAnalysisPrompt(input: ResonanceInput): string {
  const content = getResonanceInputExcerpt(input);

  return [
    "Analyze the resonance input and return strict JSON only.",
    "The JSON must contain:",
    "summary, themes, emotions, relationships, conflicts, defenses, imagery, queryTerms, narrativeSignals, confidence, notes.",
    "Use concise Chinese phrases when possible.",
    "Do not include markdown fences or extra explanation.",
    `sourceType: ${input.sourceType}`,
    `content: ${content}`
  ].join("\n");
}

function extractJsonObject(value: string): string | null {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return value.slice(start, end + 1);
  }

  return null;
}

function normalizeAnalysis(
  input: ResonanceInput,
  occurredAt: string,
  analysis: Omit<ResonanceInputAnalysis, "analyzedAt">
): ResonanceInputAnalysis {
  const parsed = resonanceInputAnalysisSchema.parse({
    analyzedAt: occurredAt,
    ...analysis,
    summary: analysis.summary?.trim() || getResonanceInputExcerpt(input).slice(0, 180)
  });

  return {
    analyzedAt: parsed.analyzedAt,
    summary: parsed.summary,
    themes: parsed.themes,
    emotions: parsed.emotions,
    relationships: parsed.relationships,
    conflicts: parsed.conflicts,
    defenses: parsed.defenses,
    imagery: parsed.imagery,
    queryTerms: parsed.queryTerms,
    narrativeSignals: parsed.narrativeSignals,
    confidence: parsed.confidence,
    ...(parsed.notes ? { notes: parsed.notes } : {})
  };
}

function appendFallbackNote(
  analysis: ResonanceInputAnalysis,
  note: string
): ResonanceInputAnalysis {
  const notes = [...(analysis.notes ?? []), note];
  return {
    ...analysis,
    notes
  };
}

export function createHeuristicResonanceAnalysisPort(): ResonanceAnalysisPort {
  return {
    async analyzeInput(input, occurredAt) {
      return createHeuristicResonanceInputAnalysis(input, occurredAt);
    }
  };
}

export function createDeepSeekResonanceAnalysisPort(
  runtime: DeepSeekLlmAdapter
): ResonanceAnalysisPort {
  return {
    async analyzeInput(input, occurredAt) {
      const fallback = createHeuristicResonanceInputAnalysis(input, occurredAt);

      try {
        const output = await runtime.run({
          agentId: "resonance-analysis-deepseek",
          objective:
            "Return a structured resonance-input analysis as strict JSON for downstream retrieval.",
          messages: [
            {
              role: "user",
              content: buildAnalysisPrompt(input)
            }
          ],
          context: {
            workflow: "resonance",
            occurredAt
          }
        });

        const jsonPayload = extractJsonObject(output.finalMessage.content);
        if (!jsonPayload) {
          return appendFallbackNote(
            fallback,
            "AI output did not contain parseable JSON; heuristic fallback used."
          );
        }

        const parsed = JSON.parse(jsonPayload) as Omit<ResonanceInputAnalysis, "analyzedAt">;
        return normalizeAnalysis(input, occurredAt, parsed);
      } catch {
        return appendFallbackNote(
          fallback,
          "AI analysis failed; heuristic fallback used."
        );
      }
    }
  };
}
