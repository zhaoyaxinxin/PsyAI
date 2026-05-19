import type {
  ResonanceCompareResponse,
  ResonanceInputResponse,
  ResonanceMatchesResponse
} from "@psyai/contracts";

export interface ResonanceMatchItemViewModel {
  matchId: string;
  title: string;
  scorePercent: number;
  rationale: string;
  whyMatched: string;
  whyNotFullyMatched: string | null;
  uncertainty: string | null;
  matchedSignals: string[];
  mismatchSignals: string[];
  excerpt: string | null;
  rank: number;
}

export interface ResonanceMatchListViewModel {
  inputId: string;
  comparisonId: string;
  status: string;
  reportReady: boolean;
  inputPreview: string | null;
  items: ResonanceMatchItemViewModel[];
}

function sanitizeResonanceTitle(title: string, rank: number): string {
  const cleaned = title.replace(/\*\*/g, "").trim();
  if (!cleaned) {
    return `相似案例 ${String(rank).padStart(2, "0")}`;
  }

  return cleaned;
}

function sanitizeResonanceText(value: string | null | undefined, fallback: string): string {
  const cleaned = value?.replace(/\*\*/g, "").trim();
  if (!cleaned) {
    return fallback;
  }

  return cleaned;
}

function buildWhyNotFullyMatched(item: ResonanceMatchesResponse["data"]["items"][number]): string | null {
  if (item.mismatchSignals && item.mismatchSignals.length > 0) {
    return `但 ${item.mismatchSignals.join("、")} 等线索仍未被完整覆盖。`;
  }

  return null;
}

export function mapResonanceMatchesToView(
  input: ResonanceInputResponse["data"],
  comparison: ResonanceCompareResponse["data"],
  matches: ResonanceMatchesResponse["data"]
): ResonanceMatchListViewModel {
  return {
    inputId: input.inputId,
    comparisonId: comparison.comparisonId,
    status: comparison.status,
    reportReady: comparison.reportReady,
    inputPreview: input.previewText ?? null,
    items: matches.items.map((item, index) => ({
      matchId: item.matchId,
      title: sanitizeResonanceTitle(item.title, index + 1),
      scorePercent: Math.round(item.score * 100),
      rationale: sanitizeResonanceText(
        item.rationale,
        "该案例与当前输入在情绪体验、关系张力或叙事线索上更接近。"
      ),
      whyMatched: sanitizeResonanceText(
        item.rationale,
        "该案例与当前输入在情绪体验、关系张力或叙事线索上更接近。"
      ),
      whyNotFullyMatched: buildWhyNotFullyMatched(item),
      uncertainty: sanitizeResonanceText(item.uncertainty ?? null, ""),
      matchedSignals: [...(item.matchedSignals ?? [])],
      mismatchSignals: [...(item.mismatchSignals ?? [])],
      excerpt: sanitizeResonanceText(
        item.excerpt ?? null,
        "本地知识库已找到一条可供共振参考的相似案例材料。"
      ),
      rank: index + 1
    }))
  };
}
