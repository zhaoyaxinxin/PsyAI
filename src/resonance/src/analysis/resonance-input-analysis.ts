import type { ResonanceAnalyzeResponse } from "@psyai/contracts";

import type { ResonanceInput } from "../input/resonance-input.js";

export interface ResonanceInputAnalysis {
  analyzedAt: string;
  summary: string;
  themes: string[];
  emotions: string[];
  relationships: string[];
  conflicts: string[];
  defenses: string[];
  imagery: string[];
  queryTerms: string[];
  narrativeSignals: string[];
  confidence: number;
  notes?: string[];
}

interface SignalGroup {
  label: string;
  tokens: string[];
}

const CATEGORY_GROUPS: Record<
  "themes" | "emotions" | "relationships" | "conflicts" | "defenses" | "imagery",
  SignalGroup[]
> = {
  themes: [
    { label: "家庭冲突", tokens: ["family", "home", "家庭", "家里", "父母", "亲人"] },
    { label: "工作压力", tokens: ["work", "job", "office", "workplace", "工作", "职场", "老板", "上级"] },
    { label: "关系边界", tokens: ["relationship", "boundary", "关系", "边界", "依恋"] },
    { label: "创伤回响", tokens: ["trauma", "trigger", "panic", "创伤", "惊吓", "失控"] },
    { label: "梦境叙事", tokens: ["dream", "dreaming", "梦", "梦境"] }
  ],
  emotions: [
    { label: "焦虑", tokens: ["anxiety", "anxious", "焦虑", "紧张", "害怕", "慌"] },
    { label: "情绪麻木", tokens: ["numb", "numbing", "numbness", "麻木", "空掉", "没感觉"] },
    { label: "愧疚", tokens: ["guilt", "guilty", "愧疚", "自责"] },
    { label: "悲伤", tokens: ["grief", "loss", "sad", "伤心", "悲伤", "失落"] },
    { label: "压迫感", tokens: ["pressure", "stress", "overload", "压力", "压迫", "喘不过气"] }
  ],
  relationships: [
    { label: "家庭成员", tokens: ["family", "家庭", "父母", "母亲", "父亲", "亲人"] },
    { label: "上级关系", tokens: ["boss", "supervisor", "manager", "老板", "上级", "领导"] },
    { label: "同伴关系", tokens: ["friend", "peer", "朋友", "同事", "同学"] },
    { label: "自我关系", tokens: ["self", "myself", "自己", "自我"] }
  ],
  conflicts: [
    { label: "重复争执", tokens: ["conflict", "conflicts", "argument", "arguments", "冲突", "争执", "争吵", "对抗"] },
    { label: "边界失守", tokens: ["boundary", "control", "控制", "边界", "施压", "要求"] },
    { label: "角色负担", tokens: ["duty", "responsibility", "care", "责任", "照顾", "负担"] }
  ],
  defenses: [
    { label: "退缩", tokens: ["withdrawal", "withdraw", "retreat", "退缩", "撤回", "躲开"] },
    { label: "沉默", tokens: ["silence", "silent", "沉默", "闭嘴", "不说话", "停止回应"] },
    { label: "反刍", tokens: ["rumination", "ruminate", "replay", "反刍", "回放", "复盘"] },
    { label: "过度控制", tokens: ["control", "controlled", "控制", "抓住", "必须"] }
  ],
  imagery: [
    { label: "梦境场景", tokens: ["dream", "梦", "梦境"] },
    { label: "蝴蝶意象", tokens: ["butterfly", "butterflies", "蝴蝶"] },
    { label: "书写意象", tokens: ["write", "writing", "pen", "ink", "写", "笔", "墨水"] },
    { label: "空间压迫", tokens: ["room", "tower", "hallway", "房间", "塔楼", "走廊"] }
  ]
};

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

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
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

function detectSignals(tokens: Set<string>, groups: readonly SignalGroup[]): string[] {
  return groups
    .filter((group) => group.tokens.some((token) => tokens.has(token.toLowerCase())))
    .map((group) => group.label);
}

function buildSummary(input: ResonanceInput): string {
  const sourceText =
    input.rawText ??
    [input.summaryText].filter((value) => value && value.trim().length > 0).join("，");
  return truncateText(collapseWhitespace(sourceText), 180);
}

export function createHeuristicResonanceInputAnalysis(
  input: ResonanceInput,
  analyzedAt: string
): ResonanceInputAnalysis {
  const sourceText = collapseWhitespace(
    [input.rawText, input.summaryText]
      .filter((value): value is string => Boolean(value))
      .join(" ")
  );
  const tokenSet = new Set(tokenize(sourceText));
  const themes = detectSignals(tokenSet, CATEGORY_GROUPS.themes);
  const emotions = detectSignals(tokenSet, CATEGORY_GROUPS.emotions);
  const relationships = detectSignals(tokenSet, CATEGORY_GROUPS.relationships);
  const conflicts = detectSignals(tokenSet, CATEGORY_GROUPS.conflicts);
  const defenses = detectSignals(tokenSet, CATEGORY_GROUPS.defenses);
  const imagery = detectSignals(tokenSet, CATEGORY_GROUPS.imagery);

  const narrativeSignals = uniqueNonEmpty([
    ...themes,
    ...emotions,
    ...relationships,
    ...conflicts,
    ...defenses,
    ...imagery
  ]).slice(0, 8);
  const queryTerms = uniqueNonEmpty([
    ...themes,
    ...emotions,
    ...conflicts,
    ...defenses,
    ...imagery
  ]).slice(0, 8);

  const notes =
    narrativeSignals.length > 0
      ? ["analysis generated by heuristic fallback"]
      : ["analysis generated from limited lexical cues"];

  return {
    analyzedAt,
    summary: buildSummary(input),
    themes,
    emotions,
    relationships,
    conflicts,
    defenses,
    imagery,
    queryTerms,
    narrativeSignals,
    confidence: clampConfidence(0.34 + narrativeSignals.length * 0.08 + input.tags.length * 0.04),
    notes
  };
}

export function attachResonanceInputAnalysis(
  input: ResonanceInput,
  analysis: ResonanceInputAnalysis
): ResonanceInput {
  return {
    ...input,
    analysis: {
      analyzedAt: analysis.analyzedAt,
      summary: collapseWhitespace(analysis.summary),
      themes: uniqueNonEmpty(analysis.themes),
      emotions: uniqueNonEmpty(analysis.emotions),
      relationships: uniqueNonEmpty(analysis.relationships),
      conflicts: uniqueNonEmpty(analysis.conflicts),
      defenses: uniqueNonEmpty(analysis.defenses),
      imagery: uniqueNonEmpty(analysis.imagery),
      queryTerms: uniqueNonEmpty(analysis.queryTerms),
      narrativeSignals: uniqueNonEmpty(analysis.narrativeSignals),
      confidence: clampConfidence(analysis.confidence),
      ...(analysis.notes && analysis.notes.length > 0
        ? { notes: uniqueNonEmpty(analysis.notes) }
        : {})
    }
  };
}

export function toResonanceAnalyzeData(
  inputId: string,
  analysis: ResonanceInputAnalysis
): ResonanceAnalyzeResponse["data"] {
  return {
    inputId,
    analysis: {
      analyzedAt: analysis.analyzedAt,
      summary: collapseWhitespace(analysis.summary),
      themes: uniqueNonEmpty(analysis.themes),
      emotions: uniqueNonEmpty(analysis.emotions),
      relationships: uniqueNonEmpty(analysis.relationships),
      conflicts: uniqueNonEmpty(analysis.conflicts),
      defenses: uniqueNonEmpty(analysis.defenses),
      imagery: uniqueNonEmpty(analysis.imagery),
      queryTerms: uniqueNonEmpty(analysis.queryTerms),
      narrativeSignals: uniqueNonEmpty(analysis.narrativeSignals),
      confidence: clampConfidence(analysis.confidence),
      ...(analysis.notes && analysis.notes.length > 0
        ? { notes: uniqueNonEmpty(analysis.notes) }
        : {})
    }
  };
}
