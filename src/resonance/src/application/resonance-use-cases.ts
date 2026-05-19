import type {
  ResonanceAnalyzeRequest,
  ResonanceAnalyzeResponse,
  ResonanceCompareRequest,
  ResonanceCompareResponse,
  ResonanceDetailRequest,
  ResonanceDetailResponse,
  ResonanceInputRequest,
  ResonanceInputResponse,
  ResonanceListRequest,
  ResonanceListResponse,
  ResonanceMatchesRequest,
  ResonanceMatchesResponse,
  ResonanceReportRequest,
  ResonanceReportResponse
} from "@psyai/contracts";

import {
  ResonanceComparisonNotFoundError,
  ResonanceInputNotFoundError
} from "../errors.js";
import {
  attachResonanceInputAnalysis,
  createHeuristicResonanceInputAnalysis,
  toResonanceAnalyzeData,
  type ResonanceInputAnalysis
} from "../analysis/resonance-input-analysis.js";
import {
  createResonanceInput,
  toResonanceInputData,
  type ResonanceInput
} from "../input/resonance-input.js";
import {
  attachResonanceReportInput,
  attachResonanceReportReference,
  createResonanceComparison,
  type ResonanceComparison
} from "../match/resonance-comparison.js";
import {
  toResonanceCompareData,
  toResonanceMatchesData,
  toResonanceReportStatusData
} from "../projection/resonance-match-projection.js";
import { resolveResonanceTopK } from "../policy/resonance-policy.js";
import type { ResonanceReportPort } from "../ports/resonance-report-port.js";
import type { ResonanceAnalysisPort } from "../ports/resonance-analysis-port.js";
import type {
  ResonanceListQuery,
  ResonanceRepository
} from "../ports/resonance-repository.js";
import { toResonanceReportInput } from "../reporting/resonance-report-input.js";
import type { ResonanceComparisonWorkflowAdapter } from "../workflow/resonance-retrieval-adapter.js";

export interface ResonanceIdGenerator {
  nextInputId(): string;
  nextComparisonId(): string;
}

export interface ResonanceInputListItem {
  inputId: string;
  sourceType: string;
  previewText: string | null;
  tagCount: number;
  receivedAt: string;
}

export interface ResonanceComparisonListItem {
  comparisonId: string;
  inputId: string;
  inputPreview: string | null;
  status: string;
  matchCount: number;
  topScore: number | null;
  reportReady: boolean;
  createdAt: string;
}

export interface ResonanceUseCases {
  submitInput(
    request: ResonanceInputRequest,
    occurredAt?: string
  ): Promise<ResonanceInputResponse["data"]>;
  analyzeInput(
    request: ResonanceAnalyzeRequest,
    occurredAt?: string
  ): Promise<ResonanceAnalyzeResponse["data"]>;
  compare(
    request: ResonanceCompareRequest,
    occurredAt?: string
  ): Promise<ResonanceCompareResponse["data"]>;
  getMatches(
    request: ResonanceMatchesRequest
  ): Promise<ResonanceMatchesResponse["data"]>;
  getDetail(
    request: ResonanceDetailRequest
  ): Promise<ResonanceDetailResponse["data"]>;
  getReportStatus(
    request: ResonanceReportRequest
  ): Promise<ResonanceReportResponse["data"]>;
  /** List recent inputs. */
  listInputs(query?: ResonanceListQuery): Promise<{
    items: ResonanceInputListItem[];
    totalItems: number;
  }>;
  /** List recent comparisons. */
  listComparisons(query?: ResonanceListQuery): Promise<{
    items: ResonanceComparisonListItem[];
    totalItems: number;
  }>;
  /** Return the most recent input for resumption. */
  getResumableInput(): Promise<ResonanceInputListItem | null>;
  /** Return the most recent comparison for resumption. */
  getResumableComparison(): Promise<ResonanceComparisonListItem | null>;
}

export interface CreateResonanceUseCasesOptions {
  repository: ResonanceRepository;
  workflow: ResonanceComparisonWorkflowAdapter;
  analysisPort?: ResonanceAnalysisPort;
  reportPort?: ResonanceReportPort;
  ids?: ResonanceIdGenerator;
  now?: () => string;
}

function createDefaultIdGenerator(): ResonanceIdGenerator {
  let inputCounter = 0;
  let comparisonCounter = 0;

  return {
    nextInputId() {
      inputCounter += 1;
      return `res-input-${String(inputCounter).padStart(3, "0")}`;
    },
    nextComparisonId() {
      comparisonCounter += 1;
      return `res-compare-${String(comparisonCounter).padStart(3, "0")}`;
    }
  };
}

async function loadInputOrThrow(
  repository: ResonanceRepository,
  inputId: string
): Promise<ResonanceInput> {
  const input = await repository.getInputById(inputId);

  if (input === null) {
    throw new ResonanceInputNotFoundError(inputId);
  }

  return input;
}

async function loadComparisonOrThrow(
  repository: ResonanceRepository,
  comparisonId: string
): Promise<ResonanceComparison> {
  const comparison = await repository.getComparisonById(comparisonId);

  if (comparison === null) {
    throw new ResonanceComparisonNotFoundError(comparisonId);
  }

  return comparison;
}

export function createResonanceUseCases(
  options: CreateResonanceUseCasesOptions
): ResonanceUseCases {
  const ids = options.ids ?? createDefaultIdGenerator();
  const now = options.now ?? (() => new Date().toISOString());
  const analyzeInput = async (
    input: ResonanceInput,
    occurredAt: string
  ): Promise<ResonanceInputAnalysis> =>
    options.analysisPort?.analyzeInput(input, occurredAt) ??
    createHeuristicResonanceInputAnalysis(input, occurredAt);

  return {
    async submitInput(request, occurredAt = now()) {
      const input = createResonanceInput({
        inputId: ids.nextInputId(),
        request,
        occurredAt
      });

      await options.repository.saveInput(input);
      return toResonanceInputData(input);
    },

    async analyzeInput(request, occurredAt = now()) {
      const input = await loadInputOrThrow(options.repository, request.inputId);
      const analysis = await analyzeInput(input, occurredAt);
      const nextInput = attachResonanceInputAnalysis(input, analysis);

      await options.repository.saveInput(nextInput);
      return toResonanceAnalyzeData(nextInput.inputId, nextInput.analysis!);
    },

    async compare(request, occurredAt = now()) {
      let input = await loadInputOrThrow(options.repository, request.inputId);
      if (!input.analysis) {
        const analysis = await analyzeInput(input, occurredAt);
        input = attachResonanceInputAnalysis(input, analysis);
        await options.repository.saveInput(input);
      }
      const comparisonId = ids.nextComparisonId();
      const topK = resolveResonanceTopK(request.topK);
      const matches = await options.workflow.compare(input, {
        comparisonId,
        topK,
        occurredAt,
        ...(request.candidateSetId ? { candidateSetId: request.candidateSetId } : {})
      });

      let comparison = createResonanceComparison({
        comparisonId,
        inputId: input.inputId,
        occurredAt,
        topK,
        matches,
        ...(request.candidateSetId ? { candidateSetId: request.candidateSetId } : {})
      });

      if (comparison.matches.length > 0) {
        const reportInput = toResonanceReportInput(input, comparison);
        comparison = attachResonanceReportInput(comparison, reportInput);

        if (options.reportPort) {
          const reportReference = await options.reportPort.createReportReference({
            input,
            comparison,
            reportInput
          });

          if (reportReference) {
            comparison = attachResonanceReportReference(comparison, reportReference);
          }
        }
      }

      await options.repository.saveComparison(comparison);
      return toResonanceCompareData(comparison);
    },

    async getMatches(request) {
      const comparison = await loadComparisonOrThrow(
        options.repository,
        request.comparisonId
      );

      return toResonanceMatchesData(comparison, request.page, request.pageSize);
    },

    async getDetail(request) {
      const comparison = await loadComparisonOrThrow(
        options.repository,
        request.comparisonId
      );
      const input = await loadInputOrThrow(options.repository, comparison.inputId);

      return {
        comparisonId: comparison.comparisonId,
        inputId: comparison.inputId,
        sourceType: input.sourceType,
        status: comparison.status,
        createdAt: comparison.createdAt,
        ...(input.previewText ? { previewText: input.previewText } : {}),
        ...(comparison.matches[0] ? { topMatchId: comparison.matches[0].matchId } : {}),
        reportReady: Boolean(comparison.reportReference),
        ...(comparison.reportReference ? { reportReference: comparison.reportReference } : {})
      };
    },

    async getReportStatus(request) {
      const comparison = await loadComparisonOrThrow(
        options.repository,
        request.comparisonId
      );

      return toResonanceReportStatusData(comparison);
    },

    async listInputs(query) {
      const result = await options.repository.listInputs(query);
      return {
        items: result.items.map(toInputListItem),
        totalItems: result.totalItems
      };
    },

    async listComparisons(query) {
      const result = await options.repository.listComparisons(query);
      return {
        items: result.items.map(toComparisonListItem),
        totalItems: result.totalItems
      };
    },

    async getResumableInput() {
      const input = await options.repository.getMostRecentInput();
      if (!input) return null;
      return toInputListItem(input);
    },

    async getResumableComparison() {
      const comparison = await options.repository.getMostRecentComparison();
      if (!comparison) return null;
      return toComparisonListItem(comparison);
    }
  };
}

function toInputListItem(input: ResonanceInput): ResonanceInputListItem {
  return {
    inputId: input.inputId,
    sourceType: input.sourceType,
    previewText: input.previewText ?? null,
    tagCount: input.tags.length,
    receivedAt: input.receivedAt
  };
}

function toComparisonListItem(comparison: ResonanceComparison): ResonanceComparisonListItem {
  const topMatch = comparison.matches[0];
  return {
    comparisonId: comparison.comparisonId,
    inputId: comparison.inputId,
    inputPreview: comparison.matches[0]?.inputExcerpt ?? null,
    status: comparison.status,
    matchCount: comparison.matches.length,
    topScore: topMatch?.score ?? null,
    reportReady: Boolean(comparison.reportReference),
    createdAt: comparison.createdAt
  };
}
