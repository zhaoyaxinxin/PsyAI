import type {
  ResonanceInputLike,
  ResonanceRetrievalPortLike,
  ResonanceRetrievalRerankInputLike,
  ResonanceRetrievalRerankResultLike,
  ResonanceRetrievalSearchCandidateLike,
  ResonanceRetrievalSearchInputLike
} from "../compatibility.js";
import { cloneValue } from "../common/clone.js";

export interface PlaceholderVectorDocument extends ResonanceRetrievalSearchCandidateLike {}

interface CandidateTokenProfile {
  titleTokens: string[];
  themeTokens: string[];
  keywordTokens: string[];
  supportTokens: string[];
  exactTagTokens: string[];
}

const SEMANTIC_TOKEN_GROUPS = [
  ["family", "families", "家庭", "家里", "家人", "亲属"],
  ["work", "workplace", "job", "office", "工作", "职场", "上班", "上级"],
  ["conflict", "conflicts", "argument", "arguments", "争执", "冲突", "争吵", "对峙"],
  ["withdrawal", "withdraw", "withdrawn", "retreat", "silence", "silent", "退缩", "沉默", "闭嘴"],
  ["numb", "numbing", "numbness", "麻木", "情绪麻木", "情绪封闭"],
  ["anxiety", "anxious", "焦虑", "紧绷"],
  ["pressure", "stress", "overload", "压力", "高压", "负荷过重"],
  ["rumination", "ruminate", "replay", "反刍", "回放", "复盘"],
  ["relationship", "relationships", "relation", "关系", "边界", "依恋"],
  ["trauma", "创伤"],
  ["guilt", "愧疚"],
  ["caregiving", "care", "照护", "照料"],
  ["hospital", "医院", "病房"]
] as const;

const semanticAliasMap = createSemanticAliasMap(SEMANTIC_TOKEN_GROUPS);

function createSemanticAliasMap(
  groups: readonly (readonly string[])[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const group of groups) {
    const normalizedGroup = [...new Set(group.map((token) => token.toLowerCase().trim()))];
    for (const token of normalizedGroup) {
      map.set(token, normalizedGroup);
    }
  }

  return map;
}

function expandSemanticAliases(tokens: readonly string[]): string[] {
  const expanded = new Set<string>();

  for (const token of tokens) {
    const normalized = token.toLowerCase().trim();
    if (!normalized) {
      continue;
    }

    expanded.add(normalized);
    for (const alias of semanticAliasMap.get(normalized) ?? []) {
      expanded.add(alias);
    }
  }

  return [...expanded];
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

  return [...new Set(expandSemanticAliases(expanded))].filter((token) => token.length > 1);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function candidateTokenProfile(
  candidate: ResonanceRetrievalSearchCandidateLike
): CandidateTokenProfile {
  return {
    titleTokens: uniqueStrings(tokenize(candidate.title)),
    themeTokens: uniqueStrings(candidate.themes.flatMap((theme) => tokenize(theme))),
    keywordTokens: uniqueStrings(candidate.keywords.flatMap((keyword) => tokenize(keyword))),
    exactTagTokens: uniqueStrings(
      expandSemanticAliases([
        ...candidate.themes.flatMap((theme) => [theme.toLowerCase().trim(), ...tokenize(theme)]),
        ...candidate.keywords.flatMap((keyword) => [keyword.toLowerCase().trim(), ...tokenize(keyword)])
      ])
    ),
    supportTokens: uniqueStrings([
      ...tokenize(candidate.summary),
      ...tokenize(candidate.excerpt ?? "")
    ])
  };
}

function overlapFromTokens(queryTokens: readonly string[], tokens: readonly string[]): string[] {
  const tokenSet = new Set(tokens);
  return uniqueStrings(queryTokens.filter((token) => tokenSet.has(token)));
}

function exactTagOverlap(inputTags: readonly string[], tokens: readonly string[]): string[] {
  const tokenSet = new Set(expandSemanticAliases(tokens));
  return uniqueStrings(
    inputTags
      .map((tag) => tag.toLowerCase().trim())
      .filter((tag) => expandSemanticAliases([tag]).some((alias) => tokenSet.has(alias)))
  );
}

function overlapTokens(
  queryTokens: readonly string[],
  candidate: ResonanceRetrievalSearchCandidateLike
): string[] {
  const profile = candidateTokenProfile(candidate);
  return uniqueStrings([
    ...overlapFromTokens(queryTokens, profile.titleTokens),
    ...overlapFromTokens(queryTokens, profile.themeTokens),
    ...overlapFromTokens(queryTokens, profile.keywordTokens)
  ]);
}

function deriveSharedThemes(
  input: ResonanceInputLike,
  candidate: ResonanceRetrievalSearchCandidateLike,
  overlap: readonly string[]
): string[] {
  const tagSet = new Set(input.tags.map((tag) => tag.toLowerCase()));

  const sharedThemes = candidate.themes.filter((theme) => {
    const themeKey = theme.toLowerCase();
    return (
      tagSet.has(themeKey) ||
      overlap.includes(themeKey) ||
      tokenize(themeKey).some((token) => overlap.includes(token))
    );
  });

  return sharedThemes.slice(0, 8);
}

function buildRationale(overlap: readonly string[], sharedThemes: readonly string[]): string {
  if (sharedThemes.length > 0) {
    return `该案例与当前输入在${sharedThemes.slice(0, 2).join("、")}等主题上更接近。`;
  }

  if (overlap.length > 0) {
    return `该案例与当前输入在${overlap.slice(0, 3).join("、")}等关键词上存在重合。`;
  }

  return "该案例与当前输入保留了有限但可解释的共振线索。";
}

function buildInterpretation(
  candidate: ResonanceRetrievalSearchCandidateLike,
  sharedThemes: readonly string[]
): string {
  if (sharedThemes.length > 0) {
    return `当前叙述与“${candidate.title}”都指向${sharedThemes[0]}这一核心线索。`;
  }

  return `当前叙述与“${candidate.title}”呈现出相近的情绪和关系模式。`;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function computeCandidateScore(inputTokenCount: number, components: {
  tagOverlap: number;
  themeOverlap: number;
  keywordOverlap: number;
  titleOverlap: number;
  supportOverlap: number;
  sharedThemes: number;
}): number {
  const rawScore =
    components.tagOverlap * 3 +
    components.themeOverlap * 4 +
    components.keywordOverlap * 2 +
    components.titleOverlap * 1.5 +
    components.supportOverlap * 1 +
    components.sharedThemes * 3.5;
  const normalizedDenominator = Math.max(8, inputTokenCount * 2.2);
  return clampScore(rawScore / normalizedDenominator);
}

export class PlaceholderVectorStore implements ResonanceRetrievalPortLike {
  readonly #documents = new Map<string, PlaceholderVectorDocument>();

  constructor(documents: readonly PlaceholderVectorDocument[] = []) {
    this.replaceDocuments(documents);
  }

  replaceDocuments(documents: readonly PlaceholderVectorDocument[]): void {
    this.#documents.clear();
    for (const document of documents) {
      this.#documents.set(document.caseId, cloneValue(document));
    }
  }

  upsertDocument(document: PlaceholderVectorDocument): void {
    this.#documents.set(document.caseId, cloneValue(document));
  }

  clear(): void {
    this.#documents.clear();
  }

  async search(
    input: ResonanceRetrievalSearchInputLike
  ): Promise<ResonanceRetrievalSearchCandidateLike[]> {
    const normalizedTags = input.tags.map((tag) => tag.toLowerCase().trim());
    const queryTokens = uniqueStrings([
      ...tokenize(input.queryText),
      ...normalizedTags
    ]);
    const minimumOverlapCount = input.queryText.trim().length > 40 || input.tags.length >= 3 ? 2 : 1;

    return [...this.#documents.values()]
      .filter((document) =>
        input.candidateSetId ? document.candidateSetId === input.candidateSetId : true
      )
      .map((document) => {
        const profile = candidateTokenProfile(document);
        const themeOverlap = overlapFromTokens(queryTokens, profile.themeTokens);
        const keywordOverlap = overlapFromTokens(queryTokens, profile.keywordTokens);
        const titleOverlap = overlapFromTokens(queryTokens, profile.titleTokens);
        const tagOverlap = exactTagOverlap(normalizedTags, profile.exactTagTokens);

        return {
          document,
          overlap: uniqueStrings([...themeOverlap, ...keywordOverlap, ...titleOverlap]),
          themeOverlap,
          keywordOverlap,
          titleOverlap,
          tagOverlap
        };
      })
      .filter(({ overlap, tagOverlap, themeOverlap, keywordOverlap }) =>
        overlap.length >= minimumOverlapCount ||
        tagOverlap.length > 0 ||
        themeOverlap.length > 0 ||
        keywordOverlap.length > 0
      )
      .sort((left, right) => {
        if (right.tagOverlap.length !== left.tagOverlap.length) {
          return right.tagOverlap.length - left.tagOverlap.length;
        }

        if (right.themeOverlap.length !== left.themeOverlap.length) {
          return right.themeOverlap.length - left.themeOverlap.length;
        }

        if (right.keywordOverlap.length !== left.keywordOverlap.length) {
          return right.keywordOverlap.length - left.keywordOverlap.length;
        }

        if (right.titleOverlap.length !== left.titleOverlap.length) {
          return right.titleOverlap.length - left.titleOverlap.length;
        }

        return right.document.title.length - left.document.title.length;
      })
      .slice(0, Math.max(input.topK * 2, input.topK))
      .map(({ document }) => cloneValue(document));
  }

  async rerank(
    input: ResonanceRetrievalRerankInputLike
  ): Promise<ResonanceRetrievalRerankResultLike[]> {
    const normalizedTags = input.input.tags.map((tag) => tag.toLowerCase().trim());
    const inputTokens = uniqueStrings([
      ...tokenize(input.input.queryText),
      ...normalizedTags
    ]);

    return input.candidates
      .map((candidate) => {
        const profile = candidateTokenProfile(candidate);
        const themeOverlap = overlapFromTokens(inputTokens, profile.themeTokens);
        const keywordOverlap = overlapFromTokens(inputTokens, profile.keywordTokens);
        const titleOverlap = overlapFromTokens(inputTokens, profile.titleTokens);
        const supportOverlap = overlapFromTokens(inputTokens, profile.supportTokens);
        const tagOverlap = exactTagOverlap(normalizedTags, profile.exactTagTokens);
        const overlap = uniqueStrings([
          ...themeOverlap,
          ...keywordOverlap,
          ...titleOverlap,
          ...supportOverlap
        ]);
        const sharedThemes = deriveSharedThemes(input.input, candidate, overlap);
        const score = computeCandidateScore(inputTokens.length, {
          tagOverlap: tagOverlap.length,
          themeOverlap: themeOverlap.length,
          keywordOverlap: keywordOverlap.length,
          titleOverlap: titleOverlap.length,
          supportOverlap: supportOverlap.length,
          sharedThemes: sharedThemes.length
        });

        return {
          caseId: candidate.caseId,
          title: candidate.title,
          score,
          rationale: buildRationale(overlap, sharedThemes),
          sharedThemes,
          inputExcerpt: input.input.rawText ?? input.input.summaryText,
          caseExcerpt: candidate.excerpt ?? candidate.summary,
          interpretation: buildInterpretation(candidate, sharedThemes),
          ...(candidate.excerpt ? { excerpt: candidate.excerpt } : {})
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, input.topK);
  }
}
