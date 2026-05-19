import type { ResonanceReportSourceType } from "@psyai/contracts";

import { MAX_RESONANCE_THEME_COUNT } from "../policy/resonance-policy.js";
import type { ResonanceInput } from "../input/resonance-input.js";
import type { ResonanceComparison, ResonanceMatch } from "../match/resonance-comparison.js";

export interface ResonanceReportMatchedCase {
  matchId: string;
  caseId: string;
  title: string;
  score: number;
  rationale: string;
  sharedThemes: string[];
  matchedSignals: string[];
  mismatchSignals: string[];
  whyMatched: string;
  whyNotFullyMatched?: string;
  uncertainty?: string;
  excerpt?: string;
}

export interface ResonanceReportFragmentComparison {
  comparisonId: string;
  inputExcerpt: string;
  caseExcerpt: string;
  interpretation: string;
  matchedSignals: string[];
  mismatchSignals: string[];
  whyMatched: string;
  whyNotFullyMatched?: string;
  uncertainty?: string;
}

export interface ResonanceReportThemeInterpretation {
  themeId: string;
  theme: string;
  explanation: string;
  confidence: number;
  supportingCaseIds: string[];
  whyMatched: string;
  whyNotFullyMatched?: string;
  uncertainty?: string;
}

export interface ResonanceReportInput {
  comparisonId: string;
  title: string;
  summary: string;
  input: {
    inputId: string;
    sourceType: ResonanceReportSourceType;
    submittedAt: string;
    summary: string;
    tags: string[];
  };
  matchedCases: ResonanceReportMatchedCase[];
  fragmentComparisons: ResonanceReportFragmentComparison[];
  themeInterpretations: ResonanceReportThemeInterpretation[];
}

interface SignalBucket {
  signal: string;
  scores: number[];
  titles: string[];
  caseIds: string[];
  mismatchSignals: string[];
  uncertainties: string[];
}

function sanitizeResonanceText(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/gu, "$1")
    .replace(/__(.*?)__/gu, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/gu, "$1")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [
    ...new Set(
      values.map((value) => sanitizeResonanceText(value)).filter((value) => value.length > 0)
    )
  ];
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, Number(score.toFixed(4))));
}

function getPrimaryMatchedSignals(match: ResonanceMatch): string[] {
  return uniqueNonEmpty(match.matchedSignals).slice(0, 4);
}

function getPrimaryMismatchSignals(match: ResonanceMatch): string[] {
  return uniqueNonEmpty(match.mismatchSignals).slice(0, 4);
}

function buildWhyMatched(match: ResonanceMatch): string {
  const rationale = sanitizeResonanceText(match.rationale);
  if (rationale.length > 0) {
    return rationale;
  }

  const matchedSignals = getPrimaryMatchedSignals(match);
  if (matchedSignals.length > 0) {
    return `该案例与输入在 ${matchedSignals.join("、")} 等线索上形成了稳定呼应。`;
  }

  return "该案例与输入之间存在可识别的相似叙事线索。";
}

function buildWhyNotFullyMatched(match: ResonanceMatch): string | undefined {
  const mismatchSignals = getPrimaryMismatchSignals(match);
  if (mismatchSignals.length === 0) {
    return undefined;
  }

  return `但 ${mismatchSignals.join("、")} 等线索没有被该案例完整覆盖。`;
}

function buildUncertainty(match: ResonanceMatch): string | undefined {
  const uncertainty = sanitizeResonanceText(match.uncertainty ?? "");
  if (uncertainty.length > 0) {
    return uncertainty;
  }

  const whyNotFullyMatched = buildWhyNotFullyMatched(match);
  if (whyNotFullyMatched) {
    return `当前匹配仍保留差异，${whyNotFullyMatched}`;
  }

  return undefined;
}

function buildFragmentInterpretation(match: ResonanceMatch): string {
  const parts = [buildWhyMatched(match)];
  const whyNotFullyMatched = buildWhyNotFullyMatched(match);
  const uncertainty = sanitizeResonanceText(match.uncertainty ?? "");

  if (whyNotFullyMatched) {
    parts.push(whyNotFullyMatched);
  }

  if (uncertainty.length > 0) {
    parts.push(`不确定性：${uncertainty}`);
  }

  return parts.join(" ");
}

function createMatchedCases(matches: readonly ResonanceMatch[]): ResonanceReportMatchedCase[] {
  const seen = new Set<string>();

  return matches
    .filter((match) => {
      const dedupeKey = `${sanitizeResonanceText(match.caseId)}::${sanitizeResonanceText(match.title)}`;
      if (seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    })
    .map((match, index) => {
      const whyMatched = buildWhyMatched(match);
      const whyNotFullyMatched = buildWhyNotFullyMatched(match);
      const uncertainty = buildUncertainty(match);
      const excerpt = sanitizeResonanceText(match.excerpt ?? match.caseExcerpt ?? "");

      return {
        matchId: match.matchId,
        caseId: match.caseId,
        title: sanitizeResonanceText(match.title) || `相似案例 ${String(index + 1).padStart(2, "0")}`,
        score: clampScore(match.score),
        rationale: whyMatched,
        sharedThemes: uniqueNonEmpty(match.sharedThemes),
        matchedSignals: getPrimaryMatchedSignals(match),
        mismatchSignals: getPrimaryMismatchSignals(match),
        whyMatched,
        ...(whyNotFullyMatched ? { whyNotFullyMatched } : {}),
        ...(uncertainty ? { uncertainty } : {}),
        ...(excerpt.length > 0 ? { excerpt } : {})
      };
    });
}

function createFragmentComparisons(
  comparisonId: string,
  matches: readonly ResonanceMatch[]
): ResonanceReportFragmentComparison[] {
  const seen = new Set<string>();

  return matches
    .filter((match) => sanitizeResonanceText(match.caseExcerpt).length > 0)
    .filter((match) => {
      const dedupeKey = `${sanitizeResonanceText(match.inputExcerpt)}::${sanitizeResonanceText(match.caseExcerpt)}`;
      if (seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    })
    .map((match, index) => {
      const whyMatched = buildWhyMatched(match);
      const whyNotFullyMatched = buildWhyNotFullyMatched(match);
      const uncertainty = buildUncertainty(match);

      return {
        comparisonId: `fragment-${comparisonId}-${String(index + 1).padStart(3, "0")}`,
        inputExcerpt: sanitizeResonanceText(match.inputExcerpt),
        caseExcerpt: sanitizeResonanceText(match.caseExcerpt),
        interpretation: buildFragmentInterpretation(match),
        matchedSignals: getPrimaryMatchedSignals(match),
        mismatchSignals: getPrimaryMismatchSignals(match),
        whyMatched,
        ...(whyNotFullyMatched ? { whyNotFullyMatched } : {}),
        ...(uncertainty ? { uncertainty } : {})
      };
    });
}

function createSignalBuckets(matches: readonly ResonanceMatch[]): SignalBucket[] {
  const buckets = new Map<string, SignalBucket>();

  for (const match of matches) {
    const matchedSignals = getPrimaryMatchedSignals(match);
    const mismatchSignals = getPrimaryMismatchSignals(match);
    const uncertainty = buildUncertainty(match);

    for (const signal of matchedSignals) {
      const key = signal.trim();
      if (key.length === 0) {
        continue;
      }

      const bucket = buckets.get(key) ?? {
        signal: key,
        scores: [],
        titles: [],
        caseIds: [],
        mismatchSignals: [],
        uncertainties: []
      };

      bucket.scores.push(match.score);
      bucket.titles.push(sanitizeResonanceText(match.title));
      bucket.caseIds.push(match.caseId);
      bucket.mismatchSignals.push(...mismatchSignals);
      if (uncertainty) {
        bucket.uncertainties.push(uncertainty);
      }

      buckets.set(key, bucket);
    }
  }

  return [...buckets.values()];
}

function buildThemeExplanation(bucket: SignalBucket): string {
  const titles = uniqueNonEmpty(bucket.titles).slice(0, 2).map((title) => `《${title}》`);
  const mismatchSignals = uniqueNonEmpty(bucket.mismatchSignals).slice(0, 2);

  const supportText =
    titles.length > 0
      ? `${titles.join("、")} 都在 ${bucket.signal} 这一线索上与输入形成呼应。`
      : `${bucket.signal} 这一线索在最终保留的案例中反复出现。`;

  if (mismatchSignals.length === 0) {
    return supportText;
  }

  return `${supportText} 但 ${mismatchSignals.join("、")} 仍未被这些案例完全覆盖。`;
}

function buildThemeUncertainty(bucket: SignalBucket): string | undefined {
  const uncertainties = uniqueNonEmpty(bucket.uncertainties).slice(0, 2);
  if (uncertainties.length === 0) {
    return undefined;
  }

  return uncertainties.join(" ");
}

function createThemeInterpretations(
  comparisonId: string,
  matches: readonly ResonanceMatch[]
): ResonanceReportThemeInterpretation[] {
  return createSignalBuckets(matches)
    .sort((left, right) => {
      const leftAverage = left.scores.reduce((sum, score) => sum + score, 0) / left.scores.length;
      const rightAverage = right.scores.reduce((sum, score) => sum + score, 0) / right.scores.length;

      if (rightAverage !== leftAverage) {
        return rightAverage - leftAverage;
      }

      return right.caseIds.length - left.caseIds.length;
    })
    .slice(0, MAX_RESONANCE_THEME_COUNT)
    .map((bucket, index) => {
      const whyNotFullyMatchedSignals = uniqueNonEmpty(bucket.mismatchSignals).slice(0, 2);
      const whyMatched = `${bucket.signal} 是最终保留案例里反复出现的核心匹配线索。`;
      const whyNotFullyMatched =
        whyNotFullyMatchedSignals.length > 0
          ? `但 ${whyNotFullyMatchedSignals.join("、")} 仍没有被这些案例完全解释。`
          : undefined;
      const uncertainty = buildThemeUncertainty(bucket);

      return {
        themeId: `theme-${comparisonId}-${String(index + 1).padStart(3, "0")}`,
        theme: bucket.signal,
        explanation: buildThemeExplanation(bucket),
        confidence: clampScore(
          bucket.scores.reduce((sum, score) => sum + score, 0) / bucket.scores.length
        ),
        supportingCaseIds: uniqueNonEmpty(bucket.caseIds),
        whyMatched,
        ...(whyNotFullyMatched ? { whyNotFullyMatched } : {}),
        ...(uncertainty ? { uncertainty } : {})
      };
    });
}

function buildReportTitle(input: ResonanceInput): string {
  return input.sourceType === "file" ? "同频共振报告：上传材料比对" : "同频共振报告：文本叙事比对";
}

function buildReportSummary(input: ResonanceInput, topMatch: ResonanceMatch | undefined): string {
  if (!topMatch) {
    return "本次输入尚未形成稳定的高相似案例，报告保留为待继续比对状态。";
  }

  const matchedSignals = getPrimaryMatchedSignals(topMatch).slice(0, 3);
  const mismatchSignals = getPrimaryMismatchSignals(topMatch).slice(0, 2);
  const signalText = matchedSignals.length > 0 ? matchedSignals.join("、") : "情绪体验与关系线索";
  const mismatchText = mismatchSignals.length > 0 ? `，但 ${mismatchSignals.join("、")} 仍未被完全覆盖` : "";

  return `本次比对将当前${input.sourceType === "file" ? "上传材料" : "文本叙事"}与《${sanitizeResonanceText(topMatch.title)}》识别为最接近案例，主要依据是 ${signalText}${mismatchText}。`;
}

export function toResonanceReportInput(
  input: ResonanceInput,
  comparison: ResonanceComparison
): ResonanceReportInput {
  return {
    comparisonId: comparison.comparisonId,
    title: buildReportTitle(input),
    summary: buildReportSummary(input, comparison.matches[0]),
    input: {
      inputId: input.inputId,
      sourceType: input.sourceType,
      submittedAt: input.receivedAt,
      summary: sanitizeResonanceText(input.summaryText),
      tags: uniqueNonEmpty(input.tags)
    },
    matchedCases: createMatchedCases(comparison.matches),
    fragmentComparisons: createFragmentComparisons(comparison.comparisonId, comparison.matches),
    themeInterpretations: createThemeInterpretations(comparison.comparisonId, comparison.matches)
  };
}
