import type {
  PageInfo,
  ResonanceCompareResponse,
  ResonanceMatchesResponse,
  ResonanceReportResponse
} from "@psyai/contracts";

import { DEFAULT_MATCHES_PAGE_SIZE } from "../policy/resonance-policy.js";
import type { ResonanceComparison, ResonanceMatch } from "../match/resonance-comparison.js";

function toProjectedMatch(match: ResonanceMatch): ResonanceMatchesResponse["data"]["items"][number] {
  return {
    matchId: match.matchId,
    caseId: match.caseId,
    title: match.title,
    score: match.score,
    rationale: match.rationale,
    ...(match.matchedSignals.length > 0 ? { matchedSignals: match.matchedSignals } : {}),
    ...(match.mismatchSignals.length > 0 ? { mismatchSignals: match.mismatchSignals } : {}),
    ...(match.uncertainty ? { uncertainty: match.uncertainty } : {}),
    keep: match.keep,
    ...(match.excerpt ? { excerpt: match.excerpt } : {})
  };
}

function createPageInfo(
  totalItems: number,
  page: number,
  pageSize: number
): PageInfo {
  return {
    page,
    pageSize,
    totalItems,
    hasNextPage: page * pageSize < totalItems
  };
}

export function toResonanceCompareData(
  comparison: ResonanceComparison
): ResonanceCompareResponse["data"] {
  const topMatch = comparison.matches[0];

  return {
    comparisonId: comparison.comparisonId,
    inputId: comparison.inputId,
    status: comparison.status,
    createdAt: comparison.createdAt,
    ...(topMatch ? { topMatchId: topMatch.matchId } : {}),
    reportReady: Boolean(comparison.reportReference)
  };
}

export function toResonanceMatchesData(
  comparison: ResonanceComparison,
  page?: number,
  pageSize?: number
): ResonanceMatchesResponse["data"] {
  const resolvedPage = page ?? 1;
  const resolvedPageSize =
    pageSize ??
    (comparison.matches.length > 0
      ? comparison.matches.length
      : DEFAULT_MATCHES_PAGE_SIZE);
  const startIndex = (resolvedPage - 1) * resolvedPageSize;
  const items = comparison.matches
    .slice(startIndex, startIndex + resolvedPageSize)
    .map(toProjectedMatch);

  return {
    comparisonId: comparison.comparisonId,
    items,
    pageInfo: createPageInfo(comparison.matches.length, resolvedPage, resolvedPageSize)
  };
}

export function toResonanceReportStatusData(
  comparison: ResonanceComparison
): ResonanceReportResponse["data"] {
  return {
    comparisonId: comparison.comparisonId,
    ready: Boolean(comparison.reportReference),
    ...(comparison.reportReference
      ? { reportReference: comparison.reportReference }
      : {})
  };
}
