import type { AgentRuntime } from "../agent/agent-runtime.js";
import type { AnalysisNormalizer } from "../normalization/analysis-normalizer.js";
import { renderPromptTemplate, type PromptAssetLoader, type PromptAssetSelection } from "../prompt/prompt-asset.js";
import type {
  ResonanceSearchCandidate,
  ResonanceWorkflowRerankInput,
  ResonanceWorkflowRerankOutput,
  ResonanceWorkflowRuntime,
  ResonanceWorkflowSearchInput,
  ResonanceWorkflowSearchOutput
} from "../workflow/resonance-runtime.js";

const RESONANCE_SEARCH_PROMPT: PromptAssetSelection = {
  packId: "resonance-core",
  version: "v1",
  promptKey: "search"
};

const RESONANCE_RERANK_PROMPT: PromptAssetSelection = {
  packId: "resonance-core",
  version: "v1",
  promptKey: "rerank"
};

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

function scoreCandidate(
  candidate: ResonanceSearchCandidate,
  queryTerms: string[],
  tags: string[]
): number {
  const keywordMatches = candidate.keywords.filter((keyword) =>
    queryTerms.includes(normalizeTerm(keyword))
  ).length;
  const tagMatches = candidate.themes.filter((theme) =>
    tags.includes(normalizeTerm(theme))
  ).length;

  return keywordMatches * 2 + tagMatches;
}

export interface CreateFakeResonanceWorkflowOptions {
  agentRuntime: AgentRuntime;
  promptLoader: PromptAssetLoader;
  normalizer: AnalysisNormalizer;
  catalog: ResonanceSearchCandidate[];
}

export class FakeResonanceWorkflow implements ResonanceWorkflowRuntime {
  readonly #agentRuntime: AgentRuntime;
  readonly #promptLoader: PromptAssetLoader;
  readonly #normalizer: AnalysisNormalizer;
  readonly #catalog: ResonanceSearchCandidate[];

  constructor(options: CreateFakeResonanceWorkflowOptions) {
    this.#agentRuntime = options.agentRuntime;
    this.#promptLoader = options.promptLoader;
    this.#normalizer = options.normalizer;
    this.#catalog = options.catalog.map((item) => structuredClone(item));
  }

  async search(input: ResonanceWorkflowSearchInput): Promise<ResonanceWorkflowSearchOutput> {
    const prompt = await this.#promptLoader.loadPromptTemplate(RESONANCE_SEARCH_PROMPT);
    const systemMessage = renderPromptTemplate(prompt, {
      queryText: input.queryText,
      tags: input.tags.join(", ") || "none"
    });
    const agentResult = await this.#agentRuntime.run({
      agentId: "fake-resonance-search",
      objective: "Search comparable resonance cases.",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: input.queryText
        }
      ],
      context: {
        workflow: "resonance",
        occurredAt: new Date().toISOString()
      },
      prompt: RESONANCE_SEARCH_PROMPT
    });

    const queryTerms = input.queryText
      .split(/[\s,.;:!?]+/)
      .map(normalizeTerm)
      .filter(Boolean);
    const normalizedTags = input.tags.map(normalizeTerm);
    const filteredCatalog = input.candidateSetId
      ? this.#catalog.filter((candidate) => candidate.candidateSetId === input.candidateSetId)
      : this.#catalog;
    const candidates = filteredCatalog
      .map((candidate) => ({
        candidate,
        score: scoreCandidate(candidate, queryTerms, normalizedTags)
      }))
      .filter((item) => item.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.candidate.caseId.localeCompare(right.candidate.caseId)
      )
      .slice(0, input.topK)
      .map((item) => structuredClone(item.candidate));

    return {
      candidates,
      transcript: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "assistant",
          content: agentResult.finalMessage.content
        }
      ],
      prompt: RESONANCE_SEARCH_PROMPT
    };
  }

  async rerank(input: ResonanceWorkflowRerankInput): Promise<ResonanceWorkflowRerankOutput> {
    const prompt = await this.#promptLoader.loadPromptTemplate(RESONANCE_RERANK_PROMPT);
    const inputPreview = input.input.previewText ?? input.input.text ?? input.input.fileName ?? "unknown";
    const systemMessage = renderPromptTemplate(prompt, {
      candidateCount: input.candidates.length,
      inputPreview
    });
    const agentResult = await this.#agentRuntime.run({
      agentId: "fake-resonance-rerank",
      objective: "Rank resonance candidates.",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: inputPreview
        }
      ],
      context: {
        workflow: "resonance",
        occurredAt: new Date().toISOString()
      },
      prompt: RESONANCE_RERANK_PROMPT
    });

    const normalizedTags = input.input.tags.map(normalizeTerm);
    const results = input.candidates
      .map((candidate, index) => {
        const sharedThemes = candidate.themes.filter((theme) =>
          normalizedTags.includes(normalizeTerm(theme))
        );

        return {
          caseId: candidate.caseId,
          title: candidate.title,
          score: Number((1 - index * 0.1 + sharedThemes.length * 0.05).toFixed(2)),
          rationale: `Matched ${sharedThemes.length} shared themes against the input.`,
          sharedThemes,
          inputExcerpt: inputPreview,
          caseExcerpt: candidate.excerpt ?? candidate.summary,
          interpretation:
            sharedThemes.length > 0 ? "strong thematic overlap" : "adjacent narrative overlap",
          ...(candidate.excerpt ? { excerpt: candidate.excerpt } : {})
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, input.topK);

    const analysis = await this.#normalizer.normalize({
      workflow: "resonance",
      schemaId: "resonance.rerank",
      schemaVersion: "v1",
      occurredAt: new Date().toISOString(),
      prompt: RESONANCE_RERANK_PROMPT,
      raw: {
        topCaseId: results[0]?.caseId ?? null,
        resultCount: results.length,
        assistantSignal: agentResult.finalMessage.content
      }
    });

    return {
      results,
      analysis,
      transcript: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "assistant",
          content: agentResult.finalMessage.content
        }
      ],
      prompt: RESONANCE_RERANK_PROMPT
    };
  }
}

export function createFakeResonanceWorkflow(
  options: CreateFakeResonanceWorkflowOptions
): ResonanceWorkflowRuntime {
  return new FakeResonanceWorkflow(options);
}
