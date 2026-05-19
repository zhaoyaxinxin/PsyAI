import type {
  ResonanceAnalyzeResponse,
  ResonanceCompareRequest,
  ResonanceCompareResponse,
  ResonanceInputRequest,
  ResonanceInputResponse,
  ResonanceMatchesResponse,
  ResonanceReportResponse
} from "@psyai/contracts";

import type { ResonanceApiClient } from "../api/transport.js";
import {
  createEmptyRequestState,
  createErrorRequestState,
  createIdleRequestState,
  createLoadingRequestState,
  createReadyRequestState,
  createStoreContainer,
  type RequestState,
  type StoreContainer
} from "./store-core.js";
import { mapResonanceMatchesToView, type ResonanceMatchListViewModel } from "../widgets/resonance-adapter.js";

export type ResonanceWorkflowPhase =
  | "idle"
  | "extracting-signals"
  | "retrieving-cases"
  | "generating-report"
  | "ready"
  | "no-similar-cases"
  | "analysis-failed";

export interface ResonanceWorkflowState {
  phase: ResonanceWorkflowPhase;
  headline: string;
  detail: string | null;
}

export interface ResonanceStoreState {
  input: ResonanceInputResponse["data"] | null;
  analysis: ResonanceAnalyzeResponse["data"] | null;
  comparison: ResonanceCompareResponse["data"] | null;
  matches: ResonanceMatchesResponse["data"] | null;
  reportStatus: ResonanceReportResponse["data"] | null;
  matchListView: ResonanceMatchListViewModel | null;
  workflow: ResonanceWorkflowState;
  request: RequestState;
}

export interface ResonanceStore {
  getState(): ResonanceStoreState;
  subscribe: StoreContainer<ResonanceStoreState>["subscribe"];
  submitInput(request: ResonanceInputRequest, occurredAt?: string): Promise<ResonanceStoreState>;
  analyzeInput(inputId: string, occurredAt?: string): Promise<ResonanceStoreState>;
  compare(request: ResonanceCompareRequest, occurredAt?: string): Promise<ResonanceStoreState>;
  loadMatches(comparisonId: string, occurredAt?: string): Promise<ResonanceStoreState>;
  loadReportStatus(comparisonId: string, occurredAt?: string): Promise<ResonanceStoreState>;
  reset(occurredAt?: string): ResonanceStoreState;
}

function buildMatchListView(
  input: ResonanceInputResponse["data"] | null,
  comparison: ResonanceCompareResponse["data"] | null,
  matches: ResonanceMatchesResponse["data"] | null
): ResonanceMatchListViewModel | null {
  if (!input || !comparison || !matches) {
    return null;
  }

  return mapResonanceMatchesToView(input, comparison, matches);
}

function createWorkflowState(
  phase: ResonanceWorkflowPhase,
  detail?: string | null
): ResonanceWorkflowState {
  switch (phase) {
    case "extracting-signals":
      return {
        phase,
        headline: "正在提取线索",
        detail: detail ?? "AI 正在整理你的叙述，提取主题、关系和冲突线索。"
      };
    case "retrieving-cases":
      return {
        phase,
        headline: "正在检索案例",
        detail: detail ?? "系统正在用结构化分析结果检索本地知识库。"
      };
    case "generating-report":
      return {
        phase,
        headline: "正在生成报告",
        detail: detail ?? "已找到候选案例，正在汇总比较理由和报告内容。"
      };
    case "ready":
      return {
        phase,
        headline: "共振结果已就绪",
        detail: detail ?? "案例比较理由和报告都可以继续查看。"
      };
    case "no-similar-cases":
      return {
        phase,
        headline: "未找到足够相似案例",
        detail: detail ?? "这次输入没有形成可保留的高质量案例匹配。"
      };
    case "analysis-failed":
      return {
        phase,
        headline: "分析失败",
        detail: detail ?? "这次输入在线索提取阶段失败，请重试或改写文本。"
      };
    case "idle":
    default:
      return {
        phase: "idle",
        headline: "等待输入",
        detail: detail ?? "输入一段经历，系统会先理解文本，再检索案例并生成报告。"
      };
  }
}

export function createResonanceStore(client: ResonanceApiClient): ResonanceStore {
  const store = createStoreContainer<ResonanceStoreState>({
    input: null,
    analysis: null,
    comparison: null,
    matches: null,
    reportStatus: null,
    matchListView: null,
    workflow: createWorkflowState("idle"),
    request: createIdleRequestState()
  });

  async function runWithState<TValue>(
    occurredAt: string,
    action: () => Promise<TValue>,
    onSuccess: (value: TValue) => ResonanceStoreState,
    onError?: (message: string) => ResonanceStoreState
  ): Promise<ResonanceStoreState> {
    store.setState((current) => ({
      ...current,
      request: createLoadingRequestState(occurredAt)
    }));

    try {
      const value = await action();
      return store.setState(onSuccess(value));
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown resonance store error";
      return store.setState(
        onError
          ? onError(message)
          : (current) => ({
              ...current,
              request: createErrorRequestState(occurredAt, message)
            })
      );
    }
  }

  return {
    getState() {
      return store.getState();
    },
    subscribe: store.subscribe,
    submitInput(request, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        () => client.submitInput(request),
        (response) => ({
          input: response.data,
          analysis: null,
          comparison: null,
          matches: null,
          reportStatus: null,
          matchListView: null,
          workflow: createWorkflowState("idle", "输入已接收，等待开始分析。"),
          request: createReadyRequestState(occurredAt)
        })
      );
    },
    analyzeInput(inputId, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        async () => {
          store.setState((current) => ({
            ...current,
            workflow: createWorkflowState("extracting-signals")
          }));
          return client.analyzeInput({ inputId });
        },
        (response) => {
          const current = store.getState();
          return {
            ...current,
            analysis: response.data,
            workflow: createWorkflowState("retrieving-cases", response.data.analysis.summary),
            request: createReadyRequestState(occurredAt)
          };
        },
        (message) => {
          const current = store.getState();
          return {
            ...current,
            workflow: createWorkflowState("analysis-failed", message),
            request: createErrorRequestState(occurredAt, message)
          };
        }
      );
    },
    compare(request, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        async () => {
          store.setState((current) => ({
            ...current,
            workflow: createWorkflowState("retrieving-cases")
          }));
          return client.compare(request);
        },
        (response) => {
          const current = store.getState();
          return {
            ...current,
            comparison: response.data,
            matchListView: buildMatchListView(current.input, response.data, current.matches),
            workflow: createWorkflowState(
              response.data.topMatchId ? "generating-report" : "no-similar-cases"
            ),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    loadMatches(comparisonId, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        async () => {
          store.setState((current) => ({
            ...current,
            workflow: createWorkflowState("retrieving-cases")
          }));
          return client.getMatches({ comparisonId });
        },
        (response) => {
          const current = store.getState();
          const nextMatchListView = buildMatchListView(current.input, current.comparison, response.data);
          const hasMatches = response.data.items.length > 0;
          return {
            ...current,
            matches: response.data,
            matchListView: nextMatchListView,
            workflow: createWorkflowState(hasMatches ? "generating-report" : "no-similar-cases"),
            request: hasMatches
              ? createReadyRequestState(occurredAt)
              : createEmptyRequestState(occurredAt, "未找到足够相似案例，请补充更多上下文后重试。")
          };
        }
      );
    },
    loadReportStatus(comparisonId, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        async () => {
          store.setState((current) => ({
            ...current,
            workflow: createWorkflowState("generating-report")
          }));
          return client.getReportStatus({ comparisonId });
        },
        (response) => {
          const current = store.getState();
          const hasMatches = (current.matches?.items.length ?? 0) > 0;
          return {
            ...current,
            reportStatus: response.data,
            workflow: createWorkflowState(
              hasMatches && response.data.ready ? "ready" : hasMatches ? "generating-report" : "no-similar-cases"
            ),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    reset(occurredAt = "1970-01-01T00:00:00+00:00") {
      return store.setState({
        input: null,
        analysis: null,
        comparison: null,
        matches: null,
        reportStatus: null,
        matchListView: null,
        workflow: createWorkflowState("idle"),
        request: createReadyRequestState(occurredAt)
      });
    }
  };
}
