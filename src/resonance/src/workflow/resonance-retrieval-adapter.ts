import {
  ResonanceRetrievalRetryExhaustedError,
  ResonanceRetrievalTimeoutError,
  ResonanceRuntimeUnavailableError
} from "../errors.js";
import { getResonanceInputExcerpt, type ResonanceInput } from "../input/resonance-input.js";
import type { ResonanceMatch } from "../match/resonance-comparison.js";
import {
  createAnalysisDrivenRetrievalProfile,
  createHeuristicComparisonExplanations
} from "../comparison/resonance-comparison-explanation.js";
import type { ResonanceComparisonExplainerPort } from "../ports/resonance-comparison-explainer-port.js";
import type {
  ResonanceRetrievalPort,
  ResonanceRetrievalRerankResult
} from "../ports/resonance-retrieval-port.js";

// ── Retry / timeout configuration ───────────────────────────────────

export interface ResonanceRetrievalRetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export const DEFAULT_RESONANCE_RETRY_POLICY: ResonanceRetrievalRetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  timeoutMs: 30000
};

// ── Adapter ─────────────────────────────────────────────────────────

export interface ResonanceComparisonWorkflowAdapter {
  compare(
    input: ResonanceInput,
    options: {
      comparisonId: string;
      topK: number;
      candidateSetId?: string;
      occurredAt: string;
    }
  ): Promise<ResonanceMatch[]>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyRetrievalError(error: unknown, operation: string): Error {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out") || error.name === "TimeoutError") {
      return new ResonanceRetrievalTimeoutError(
        `Resonance retrieval timeout during ${operation}: ${error.message}`
      );
    }
  }
  return new ResonanceRuntimeUnavailableError(
    error instanceof Error
      ? `Resonance retrieval failed during ${operation}: ${error.message}`
      : `Resonance retrieval failed during ${operation}`
  );
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: ResonanceRetrievalRetryPolicy,
  operation: string
): Promise<T> {
  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= policy.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = classifyRetrievalError(error, operation);

      if (attempt >= policy.maxRetries) {
        throw new ResonanceRetrievalRetryExhaustedError(
          operation,
          policy.maxRetries + 1,
          lastError.message
        );
      }

      if (lastError instanceof ResonanceRetrievalTimeoutError) {
        throw lastError;
      }

      const computedDelay = Math.min(
        policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt),
        policy.maxDelayMs
      );

      await delay(computedDelay);
      attempt += 1;
    }
  }

  throw lastError ?? new ResonanceRuntimeUnavailableError(`Resonance retrieval exhausted during ${operation}`);
}

function toResonanceMatch(
  comparisonId: string,
  ranked: {
    caseId: string;
    title: string;
    score: number;
    explanation: string;
    matchedSignals: string[];
    mismatchSignals: string[];
    sharedThemes: string[];
    inputExcerpt: string;
    caseExcerpt: string;
    keep: boolean;
    uncertainty?: string;
    excerpt?: string;
  },
  index: number
): ResonanceMatch {
  return {
    matchId: `match-${comparisonId}-${String(index + 1).padStart(3, "0")}`,
    caseId: ranked.caseId,
    title: ranked.title,
    score: ranked.score,
    rationale: ranked.explanation,
    matchedSignals: [...ranked.matchedSignals],
    mismatchSignals: [...ranked.mismatchSignals],
    sharedThemes: [...ranked.sharedThemes],
    inputExcerpt: ranked.inputExcerpt,
    caseExcerpt: ranked.caseExcerpt,
    interpretation: ranked.explanation,
    keep: ranked.keep,
    ...(ranked.uncertainty ? { uncertainty: ranked.uncertainty } : {}),
    ...(ranked.excerpt ? { excerpt: ranked.excerpt } : {})
  };
}

export interface CreateResonanceRetrievalAdapterOptions {
  retrieval: ResonanceRetrievalPort;
  explainer?: ResonanceComparisonExplainerPort;
  retryPolicy?: ResonanceRetrievalRetryPolicy;
}

export function createResonanceRetrievalAdapter(
  retrievalOrOptions: ResonanceRetrievalPort | CreateResonanceRetrievalAdapterOptions
): ResonanceComparisonWorkflowAdapter {
  const retrieval: ResonanceRetrievalPort =
    "retrieval" in retrievalOrOptions ? retrievalOrOptions.retrieval : retrievalOrOptions;
  const explainer: ResonanceComparisonExplainerPort | undefined =
    "retrieval" in retrievalOrOptions ? retrievalOrOptions.explainer : undefined;
  const retryPolicy: ResonanceRetrievalRetryPolicy =
    "retryPolicy" in retrievalOrOptions && retrievalOrOptions.retryPolicy
      ? retrievalOrOptions.retryPolicy
      : DEFAULT_RESONANCE_RETRY_POLICY;

  return {
    async compare(input, options) {
      return executeWithRetry(
        async () => {
          const retrievalProfile = createAnalysisDrivenRetrievalProfile(input);
          const candidateLimit = Math.max(options.topK * 2, options.topK);
          const candidates = await retrieval.search({
            queryText: retrievalProfile.queryText || getResonanceInputExcerpt(input),
            tags: [...retrievalProfile.tags],
            topK: candidateLimit,
            ...(options.candidateSetId ? { candidateSetId: options.candidateSetId } : {})
          });

          if (candidates.length === 0) {
            return [];
          }

          const retrievalInput: ResonanceInput = {
            ...input,
            queryText: retrievalProfile.queryText || getResonanceInputExcerpt(input),
            tags: [...retrievalProfile.tags]
          };

          const ranked = await retrieval.rerank({
            input: {
              ...retrievalInput,
              queryText: retrievalInput.queryText || getResonanceInputExcerpt(input)
            },
            candidates,
            topK: candidateLimit
          });

          const explained =
            (await explainer?.explainCandidates(retrievalInput, ranked, options.occurredAt)) ??
            createHeuristicComparisonExplanations(retrievalInput, ranked);

          return explained
            .filter((result) => result.keep)
            .sort((left, right) => right.score - left.score)
            .slice(0, options.topK)
            .map((result, index) => toResonanceMatch(options.comparisonId, result, index));
        },
        retryPolicy,
        "compare"
      );
    }
  };
}
