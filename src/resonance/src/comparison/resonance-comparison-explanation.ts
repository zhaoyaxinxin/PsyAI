import type { ResonanceRetrievalRerankResult } from "../ports/resonance-retrieval-port.js";
import type { ResonanceInput } from "../input/resonance-input.js";

export interface ResonanceComparisonExplanation {
  caseId: string;
  title: string;
  score: number;
  matchedSignals: string[];
  mismatchSignals: string[];
  explanation: string;
  uncertainty?: string;
  keep: boolean;
  sharedThemes: string[];
  inputExcerpt: string;
  caseExcerpt: string;
  excerpt?: string;
}

export interface ResonanceRetrievalQueryProfile {
  queryText: string;
  tags: string[];
}

const DEFAULT_KEEP_SCORE_THRESHOLD = 0.46;
const HIGH_CONFIDENCE_SCORE_THRESHOLD = 0.72;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [
    ...new Set(
      values.map((value) => collapseWhitespace(value)).filter((value) => value.length > 0)
    )
  ];
}

function tokenize(value: string): string[] {
  const segments = value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

  const expanded: string[] = [];

  for (const segment of segments) {
    expanded.push(segment);

    if (/^[\p{Script=Han}]+$/u.test(segment) && segment.length <= 24) {
      const maxSize = Math.min(4, segment.length);
      for (let size = 2; size <= maxSize; size += 1) {
        for (let index = 0; index <= segment.length - size; index += 1) {
          expanded.push(segment.slice(index, index + size));
        }
      }
    }
  }

  return uniqueNonEmpty(expanded);
}

function buildAnalysisSignals(input: ResonanceInput): string[] {
  const analysis = input.analysis;
  if (!analysis) {
    return uniqueNonEmpty([...input.tags, input.summaryText]);
  }

  return uniqueNonEmpty([
    ...analysis.themes,
    ...analysis.emotions,
    ...analysis.relationships,
    ...analysis.conflicts,
    ...analysis.defenses,
    ...analysis.imagery,
    ...analysis.queryTerms,
    ...analysis.narrativeSignals
  ]);
}

function matchAnalysisSignals(
  analysisSignals: readonly string[],
  candidate: ResonanceRetrievalRerankResult
): string[] {
  const candidateTokens = new Set(
    uniqueNonEmpty([
      ...candidate.sharedThemes,
      ...tokenize(candidate.title),
      ...tokenize(candidate.caseExcerpt),
      ...tokenize(candidate.excerpt ?? ""),
      ...tokenize(candidate.rationale),
      ...tokenize(candidate.interpretation)
    ])
  );

  return uniqueNonEmpty(
    analysisSignals.filter((signal) => {
      const signalTokens = uniqueNonEmpty(tokenize(signal));
      if (signalTokens.length === 0) {
        return false;
      }

      const overlapCount = signalTokens.filter((token) => candidateTokens.has(token)).length;
      const minimumRequiredMatches =
        signalTokens.length === 1 ? 1 : Math.min(2, signalTokens.length);

      return overlapCount >= minimumRequiredMatches || candidateTokens.has(signal.toLowerCase());
    })
  );
}

function explainMatchedSignals(matchedSignals: readonly string[]): string {
  if (matchedSignals.length === 0) {
    return "当前候选与输入之间只有弱语义接近，尚未形成稳定的共振线索。";
  }

  return `该案例与输入在 ${matchedSignals.slice(0, 3).join("、")} 等线索上最接近。`;
}

function explainUncertainty(mismatchSignals: readonly string[]): string | undefined {
  if (mismatchSignals.length === 0) {
    return undefined;
  }

  return `仍有 ${mismatchSignals.slice(0, 2).join("、")} 等线索没有被该案例充分覆盖。`;
}

function shouldKeepExplanation(
  score: number,
  matchedSignals: readonly string[],
  mismatchSignals: readonly string[],
  sharedThemes: readonly string[]
): boolean {
  if (matchedSignals.length === 0) {
    return false;
  }

  if (score < DEFAULT_KEEP_SCORE_THRESHOLD) {
    return false;
  }

  if (sharedThemes.length === 0 && score < HIGH_CONFIDENCE_SCORE_THRESHOLD) {
    return false;
  }

  if (matchedSignals.length < 2) {
    return false;
  }

  if (mismatchSignals.length > matchedSignals.length + 1 && score < 0.68) {
    return false;
  }

  return true;
}

export function createAnalysisDrivenRetrievalProfile(
  input: ResonanceInput
): ResonanceRetrievalQueryProfile {
  const analysis = input.analysis;

  if (!analysis) {
    return {
      queryText: input.queryText,
      tags: [...input.tags]
    };
  }

  return {
    queryText: uniqueNonEmpty([
      analysis.summary,
      ...analysis.themes,
      ...analysis.queryTerms,
      ...analysis.emotions,
      ...analysis.conflicts,
      ...analysis.defenses
    ]).join(" "),
    tags: uniqueNonEmpty([
      ...analysis.themes,
      ...analysis.queryTerms,
      ...analysis.emotions,
      ...analysis.conflicts,
      ...analysis.defenses
    ]).slice(0, 12)
  };
}

export function createHeuristicComparisonExplanations(
  input: ResonanceInput,
  candidates: readonly ResonanceRetrievalRerankResult[]
): ResonanceComparisonExplanation[] {
  const analysisSignals = buildAnalysisSignals(input);

  return candidates.map((candidate) => {
    const matchedSignals = uniqueNonEmpty([
      ...candidate.sharedThemes,
      ...matchAnalysisSignals(analysisSignals, candidate)
    ]).slice(0, 6);
    const mismatchSignals = analysisSignals
      .filter((signal) => !matchedSignals.includes(signal))
      .slice(0, 4);
    const uncertainty = explainUncertainty(mismatchSignals);
    const keep = shouldKeepExplanation(
      candidate.score,
      matchedSignals,
      mismatchSignals,
      candidate.sharedThemes
    );

    return {
      caseId: candidate.caseId,
      title: candidate.title,
      score: candidate.score,
      matchedSignals,
      mismatchSignals,
      explanation: explainMatchedSignals(matchedSignals),
      ...(uncertainty ? { uncertainty } : {}),
      keep,
      sharedThemes: [...candidate.sharedThemes],
      inputExcerpt: candidate.inputExcerpt,
      caseExcerpt: candidate.caseExcerpt,
      ...(candidate.excerpt ? { excerpt: candidate.excerpt } : {})
    };
  });
}
