import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface TokenVectorDocument {
  caseId: string;
  title: string;
  summary: string;
  excerpt?: string;
  themes: string[];
  keywords: string[];
  candidateSetId?: string;
}

export interface TokenVectorSearchResult {
  caseId: string;
  title: string;
  score: number;
  rationale: string;
  sharedThemes: string[];
  inputExcerpt: string;
  caseExcerpt: string;
  interpretation: string;
  excerpt?: string;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function computeTfIdf(
  documents: TokenVectorDocument[]
): {
  idf: Map<string, number>;
  tfIdf: Map<string, Map<string, number>>;
} {
  const N = documents.length;
  const df = new Map<string, number>();

  for (const doc of documents) {
    const tokens = new Set([
      ...tokenize(doc.title),
      ...tokenize(doc.summary),
      ...(doc.excerpt ? tokenize(doc.excerpt) : []),
      ...doc.keywords.map((k) => k.toLowerCase()),
      ...doc.themes.map((t) => t.toLowerCase())
    ]);

    for (const token of tokens) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, count] of df) {
    idf.set(token, Math.log((N + 1) / (count + 1)) + 1);
  }

  const tfIdf = new Map<string, Map<string, number>>();
  for (const doc of documents) {
    const tokens = [
      ...tokenize(doc.title),
      ...tokenize(doc.summary),
      ...(doc.excerpt ? tokenize(doc.excerpt) : [])
    ];

    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    const vec = new Map<string, number>();
    for (const [token, count] of tf) {
      const idfVal = idf.get(token) ?? 1;
      vec.set(token, count * idfVal);
    }

    tfIdf.set(doc.caseId, vec);
  }

  return { idf, tfIdf };
}

function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dot = 0;
  let normA = 0;

  for (const [token, weight] of a) {
    const bWeight = b.get(token) ?? 0;
    dot += weight * bWeight;
    normA += weight * weight;
  }

  let normB = 0;
  for (const weight of b.values()) {
    normB += weight * weight;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface TokenVectorStoreOptions {
  documents?: TokenVectorDocument[];
  indexPath?: string;
}

export class TokenVectorStore {
  readonly #documents = new Map<string, TokenVectorDocument>();
  readonly #indexPath: string | undefined;
  #tfIdf: Map<string, Map<string, number>> | null = null;

  constructor(options: TokenVectorStoreOptions = {}) {
    this.#indexPath = options.indexPath;

    for (const doc of options.documents ?? []) {
      this.#documents.set(doc.caseId, { ...doc });
    }
  }

  get documentCount(): number {
    return this.#documents.size;
  }

  upsertDocument(document: TokenVectorDocument): void {
    this.#documents.set(document.caseId, { ...document });
    this.#tfIdf = null;
  }

  async loadIndex(): Promise<void> {
    if (!this.#indexPath) {
      this.buildIndex();
      return;
    }

    try {
      const raw = await readFile(this.#indexPath, { encoding: "utf8" });
      const data = JSON.parse(raw) as {
        documents: TokenVectorDocument[];
        tfIdf: Array<[string, Array<[string, number]>]>;
      };

      this.#documents.clear();
      for (const doc of data.documents) {
        this.#documents.set(doc.caseId, doc);
      }

      this.#tfIdf = new Map(
        data.tfIdf.map(([key, entries]) => [key, new Map(entries)])
      );
    } catch {
      this.buildIndex();
    }
  }

  async saveIndex(): Promise<void> {
    if (!this.#indexPath) {
      return;
    }

    const index = this.#tfIdf ?? computeTfIdf([...this.#documents.values()]).tfIdf;
    const data = {
      documents: [...this.#documents.values()],
      tfIdf: [...index].map(
        ([key, vec]) => [key, [...vec]] as [string, Array<[string, number]>]
      )
    };

    await mkdir(dirname(this.#indexPath), { recursive: true });
    await writeFile(this.#indexPath, JSON.stringify(data), { encoding: "utf8" });
  }

  buildIndex(): void {
    const { tfIdf } = computeTfIdf([...this.#documents.values()]);
    this.#tfIdf = tfIdf;
  }

  async search(
    queryText: string,
    tags: string[],
    topK: number,
    candidateSetId?: string
  ): Promise<TokenVectorDocument[]> {
    if (!this.#tfIdf) {
      this.buildIndex();
    }

    const tfIdf = this.#tfIdf!;
    const queryTokens = tokenize(queryText);
    const queryVec = new Map<string, number>();

    for (const token of queryTokens) {
      queryVec.set(token, (queryVec.get(token) ?? 0) + 1);
    }

    const candidates = [...this.#documents.values()]
      .filter((doc) =>
        candidateSetId ? doc.candidateSetId === candidateSetId : true
      );

    const scored = candidates.map((doc) => {
      const docVec = tfIdf.get(doc.caseId) ?? new Map();
      return {
        doc,
        score: cosineSimilarity(queryVec, docVec)
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(({ doc }) => ({ ...doc }));
  }

  async rerank(
    queryText: string,
    summaryText: string,
    tags: string[],
    candidates: TokenVectorDocument[],
    topK: number
  ): Promise<TokenVectorSearchResult[]> {
    if (!this.#tfIdf) {
      this.buildIndex();
    }

    const tfIdf = this.#tfIdf!;
    const queryTokens = [
      ...tokenize(queryText),
      ...tokenize(summaryText),
      ...tags.map((t) => t.toLowerCase())
    ];

    const queryVec = new Map<string, number>();
    for (const token of queryTokens) {
      queryVec.set(token, (queryVec.get(token) ?? 0) + 1);
    }

    const results = candidates.map((candidate) => {
      const docVec = tfIdf.get(candidate.caseId) ?? new Map();
      const score = cosineSimilarity(queryVec, docVec);
      const candidateTokens = new Set([
        ...tokenize(candidate.title),
        ...tokenize(candidate.summary),
        ...candidate.keywords.map((k) => k.toLowerCase()),
        ...candidate.themes.map((t) => t.toLowerCase())
      ]);

      const sharedThemes = candidate.themes.filter(
        (theme) =>
          tags.map((t) => t.toLowerCase()).includes(theme.toLowerCase()) ||
          queryTokens.includes(theme.toLowerCase())
      );

      return {
        caseId: candidate.caseId,
        title: candidate.title,
        score: Number(score.toFixed(4)),
        rationale:
          sharedThemes.length > 0
            ? `Cosine similarity ${score.toFixed(3)} with ${sharedThemes.length} shared themes.`
            : `Cosine similarity ${score.toFixed(3)} based on token overlap.`,
        sharedThemes:
          sharedThemes.length > 0 ? sharedThemes : candidate.themes.slice(0, 2),
        inputExcerpt: summaryText,
        caseExcerpt: candidate.excerpt ?? candidate.summary,
        interpretation:
          sharedThemes.length > 0
            ? `The query and "${candidate.title}" share themes: ${sharedThemes.join(", ")}.`
            : `The query and "${candidate.title}" show lexical similarity.`,
        ...(candidate.excerpt ? { excerpt: candidate.excerpt } : {})
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}
