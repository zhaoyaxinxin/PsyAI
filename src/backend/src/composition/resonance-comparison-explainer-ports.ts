import type { DeepSeekLlmAdapter } from "@psyai/infrastructure";
import {
  createHeuristicComparisonExplanations,
  type ResonanceComparisonExplainerPort,
  type ResonanceComparisonExplanation,
  type ResonanceInput
} from "@psyai/resonance";
import type { ResonanceRetrievalRerankResult } from "@psyai/resonance";

function buildCandidatePrompt(
  input: ResonanceInput,
  candidates: ResonanceRetrievalRerankResult[]
): string {
  return [
    "Compare the resonance input against the candidate cases and return strict JSON only.",
    "Return an array named explanations.",
    "Each item must include: caseId, matchedSignals, mismatchSignals, explanation, uncertainty, keep.",
    "Use concise Chinese phrases for signals and explanation.",
    "Keep=true only when the candidate is meaningfully aligned with the input.",
    `inputSummary: ${input.analysis?.summary ?? input.summaryText}`,
    `inputThemes: ${(input.analysis?.themes ?? []).join(", ") || "none"}`,
    `inputSignals: ${(
      input.analysis?.queryTerms ??
      input.tags
    ).join(", ") || "none"}`,
    `candidates: ${JSON.stringify(
      candidates.map((candidate) => ({
        caseId: candidate.caseId,
        title: candidate.title,
        score: candidate.score,
        sharedThemes: candidate.sharedThemes,
        rationale: candidate.rationale,
        interpretation: candidate.interpretation,
        excerpt: candidate.excerpt ?? candidate.caseExcerpt
      }))
    )}`
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

  const listStart = value.indexOf("[");
  const listEnd = value.lastIndexOf("]");
  if (listStart >= 0 && listEnd > listStart) {
    return `{"explanations": ${value.slice(listStart, listEnd + 1)}}`;
  }

  return null;
}

function normalizeExplanations(
  candidates: ResonanceRetrievalRerankResult[],
  parsed: unknown,
  fallback: ResonanceComparisonExplanation[]
): ResonanceComparisonExplanation[] {
  const rawItems =
    typeof parsed === "object" &&
    parsed !== null &&
    "explanations" in parsed &&
    Array.isArray((parsed as { explanations?: unknown[] }).explanations)
      ? (parsed as { explanations: unknown[] }).explanations
      : [];

  const byCaseId = new Map<string, ResonanceComparisonExplanation>();

  for (const [index, item] of rawItems.entries()) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as {
      caseId?: unknown;
      matchedSignals?: unknown;
      mismatchSignals?: unknown;
      explanation?: unknown;
      uncertainty?: unknown;
      keep?: unknown;
    };
    const candidate = candidates.find((entry) => entry.caseId === record.caseId);
    if (!candidate || typeof record.explanation !== "string") {
      continue;
    }

    byCaseId.set(candidate.caseId, {
      caseId: candidate.caseId,
      title: candidate.title,
      score: candidate.score,
      matchedSignals: Array.isArray(record.matchedSignals)
        ? record.matchedSignals.filter((value): value is string => typeof value === "string")
        : fallback[index]?.matchedSignals ?? [],
      mismatchSignals: Array.isArray(record.mismatchSignals)
        ? record.mismatchSignals.filter((value): value is string => typeof value === "string")
        : fallback[index]?.mismatchSignals ?? [],
      explanation: record.explanation.trim(),
      ...(typeof record.uncertainty === "string" && record.uncertainty.trim().length > 0
        ? { uncertainty: record.uncertainty.trim() }
        : {}),
      keep:
        typeof record.keep === "boolean"
          ? record.keep
          : fallback[index]?.keep ?? false,
      sharedThemes: [...candidate.sharedThemes],
      inputExcerpt: candidate.inputExcerpt,
      caseExcerpt: candidate.caseExcerpt,
      ...(candidate.excerpt ? { excerpt: candidate.excerpt } : {})
    });
  }

  return candidates.map((candidate, index) => byCaseId.get(candidate.caseId) ?? fallback[index]!);
}

export function createHeuristicResonanceComparisonExplainerPort(): ResonanceComparisonExplainerPort {
  return {
    async explainCandidates(input, candidates) {
      return createHeuristicComparisonExplanations(input, candidates);
    }
  };
}

export function createDeepSeekResonanceComparisonExplainerPort(
  runtime: DeepSeekLlmAdapter
): ResonanceComparisonExplainerPort {
  return {
    async explainCandidates(input, candidates, occurredAt) {
      const fallback = createHeuristicComparisonExplanations(input, candidates);

      if (candidates.length === 0) {
        return fallback;
      }

      try {
        const output = await runtime.run({
          agentId: "resonance-comparison-deepseek",
          objective:
            "Compare resonance candidates against the structured input and decide which candidates should be kept.",
          messages: [
            {
              role: "user",
              content: buildCandidatePrompt(input, candidates)
            }
          ],
          context: {
            workflow: "resonance",
            occurredAt
          }
        });

        const jsonPayload = extractJsonObject(output.finalMessage.content);
        if (!jsonPayload) {
          return fallback;
        }

        const parsed = JSON.parse(jsonPayload) as unknown;
        return normalizeExplanations(candidates, parsed, fallback);
      } catch {
        return fallback;
      }
    }
  };
}
