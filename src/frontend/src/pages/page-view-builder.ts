/**
 * Page view model builders: map shell + store state into UI-consumable page view models.
 */
import type { AppBootstrapState } from "@psyai/app-state";
import { SHARED_VERSION, type WorkflowKind } from "@psyai/shared";

import type { SceneCoordinatorState } from "../scenes/scene-coordinator.js";
import type { CounselingStoreState } from "../stores/counseling-store.js";
import type { ReportStoreState } from "../stores/report-store.js";
import type { ResonanceStoreState } from "../stores/resonance-store.js";
import type { SettingsStoreState } from "../stores/settings-store.js";
import type { SimulationStoreState } from "../stores/simulation-store.js";
import type {
  ActionDescriptor,
  CounselingFocusPageViewModel,
  HistoryPageViewModel,
  LandingPageViewModel,
  MenuPageViewModel,
  NavEntry,
  PageViewModel,
  ReportDetailPageViewModel,
  ResonanceFocusPageViewModel,
  RiskConfirmationPageViewModel,
  SettingsPageViewModel,
  SimulationRoutePageViewModel,
  UiStateSlice
} from "./page-view-model.js";

function mapRequestToUiSlice(
  status: string,
  message: string | null,
  lastUpdatedAt: string | null,
  retryAction?: ActionDescriptor
): UiStateSlice {
  const slice: UiStateSlice = {
    status: status as UiStateSlice["status"],
    message,
    lastUpdatedAt
  };
  if (retryAction) {
    slice.retryAction = retryAction;
  }
  return slice;
}

function action(label: string, kind: string, enabled = true, reason?: string): ActionDescriptor {
  const result: ActionDescriptor = { label, kind, enabled };
  if (reason) {
    result.reason = reason;
  }
  return result;
}

function retryAction(status: string): ActionDescriptor | undefined {
  return status === "error" ? action("重试", "retry", true) : undefined;
}

function getWorkflowLabel(workflow: WorkflowKind): string {
  switch (workflow) {
    case "counseling":
      return "心理咨询";
    case "simulation":
      return "情境模拟";
    case "resonance":
      return "同频共振";
  }
}

function getCounselingStageLabel(stage: string | null): string | null {
  if (!stage) {
    return null;
  }

  switch (stage) {
    case "intake":
      return "初始接入";
    case "exploration":
      return "深入澄清";
    case "stabilization":
      return "稳定支持";
    case "closure":
      return "收束整理";
    default:
      return stage;
  }
}

function getEscalationLabel(status: string | null): string | null {
  if (!status) {
    return null;
  }

  switch (status) {
    case "none":
      return "无需升级";
    case "review_recommended":
      return "建议复核";
    case "escalated":
      return "已升级处理";
    case "urgent":
      return "紧急处理";
    default:
      return status;
  }
}

export function buildLandingPage(bootstrapState: AppBootstrapState): LandingPageViewModel {
  const consent = bootstrapState.consent;

  return {
    page: "landing",
    title: "PsyAI",
    subtitle: "A local-first AI mental support tool with core data intended to stay on device.",
    consent: {
      disclaimerAccepted: consent.disclaimerAccepted,
      riskAcknowledged: consent.riskPromptAcknowledged,
      disclaimerLabel: "I have read and understood the safety boundary notice.",
      riskLabel: "I understand this tool does not replace professional mental health care."
    },
    availableWorkflows: [
      {
        workflow: "simulation",
        label: "Simulation Mode",
        description: "Enter the branching mode first, then choose counseling or simulation routes."
      },
      {
        workflow: "resonance",
        label: "Resonance",
        description: "Go straight to resonance input, then compare cases and generate a report."
      }
    ],
    actions: {
      acceptDisclaimer: action("Accept Notice", "accept-disclaimer", !consent.disclaimerAccepted),
      acknowledgeRisk: action("Acknowledge Risk", "acknowledge-risk", consent.disclaimerAccepted && !consent.riskPromptAcknowledged),
      enterCounseling: action("Enter Counseling", "enter-counseling", true),
      enterSimulation: action("Enter Simulation", "enter-simulation", true),
      enterResonance: action("Enter Resonance", "enter-resonance", true)
    }
  };
}

export function buildMenuPage(
  bootstrapState: AppBootstrapState,
  recentItems: Array<{ id: string; label: string; workflow: WorkflowKind; timestamp: string }> = []
): MenuPageViewModel {
  return {
    page: "menu",
    title: "PsyAI",
    greeting: "Choose the path to continue, then move into counseling or simulation.",
    workflows: [
      {
        workflow: "counseling",
        label: "AI Counseling",
        description: "Enter a quieter space for guided dialogue, clarification, and review.",
        iconLabel: "C"
      },
      {
        workflow: "simulation",
        label: "Simulation Route",
        description: "Move through staged scenario nodes and observe how relationships and outcomes change.",
        iconLabel: "S"
      }
    ],
    recentItems: recentItems.map((item) => ({
      id: item.id,
      label: item.label,
      workflow: item.workflow,
      timestamp: item.timestamp,
      nav: navForWorkflow(item.workflow, item.id),
      reportReference: {
        reportId: item.id,
        workflow: item.workflow,
        reportVersion: SHARED_VERSION,
        generatedAt: item.timestamp
      }
    })),
    actions: {
      selectCounseling: action("Enter Counseling", "navigate-focus-counseling"),
      selectSimulation: action("Enter Simulation", "navigate-route-simulation"),
      selectResonance: action("Enter Resonance", "navigate-focus-resonance", false, "Resonance currently opens from the landing page."),
      openHistory: action("Report Archive", "navigate-history"),
      openSettings: action("Settings", "navigate-settings")
    }
  };
}

export function buildCounselingFocusPage(
  counselingState: CounselingStoreState,
  bootstrapState: AppBootstrapState
): CounselingFocusPageViewModel {
  const conversation = counselingState.conversationView;
  const isActive = counselingState.session?.status === "active";

  return {
    page: "counseling-focus",
    title: "心理咨询",
    sessionId: counselingState.session?.sessionId ?? null,
    status: mapRequestToUiSlice(
      counselingState.request.status,
      counselingState.request.errorMessage,
      counselingState.request.lastUpdatedAt,
      retryAction(counselingState.request.status)
    ),
    conversation: {
      messages: (conversation?.messages ?? []).map((msg) => ({
        speaker: msg.speaker ?? "system",
        content: msg.content,
        createdAt: msg.createdAt
      })),
      emptyMessage: "Start with the feeling, relationship, or pressure you most want to sort through right now."
    },
    analysis: {
      stage: getCounselingStageLabel(conversation?.dominantStage ?? null),
      summary: counselingState.session?.latestAnalysis?.summary ?? null,
      riskLevel: conversation?.riskLevel ?? null,
      escalationStatus: getEscalationLabel(conversation?.escalationStatus ?? null),
      escalationReason: conversation?.escalationReason ?? null
    },
    reportReady: counselingState.reportStatus?.ready ?? false,
    actions: {
      sendMessage: action("Send", "send-message", true),
      finishSession: action("结束会话", "finish-session", isActive),
      viewReport: action("查看报告", "navigate-report", counselingState.reportStatus?.ready ?? false),
      acknowledgeRisk: action(
        "查看风险",
        "show-risk-confirmation",
        conversation?.escalationStatus === "escalated" || conversation?.escalationStatus === "review_recommended"
      ),
      startNew: action("新建会话", "start-new", true),
      retry: retryAction(counselingState.request.status)
    }
  };
}

export function buildResonanceFocusPage(
  resonanceState: ResonanceStoreState
): ResonanceFocusPageViewModel {
  const matchView = resonanceState.matchListView;
  const hasMatches = (matchView?.items.length ?? 0) > 0;
  const reportReady = Boolean(
    (resonanceState.reportStatus?.ready ?? matchView?.reportReady ?? false) && hasMatches
  );
  const phase = resonanceState.workflow.phase;
  const status =
    resonanceState.request.status === "error" || phase === "analysis-failed"
      ? mapRequestToUiSlice(
          "error",
          resonanceState.request.errorMessage ?? resonanceState.workflow.detail,
          resonanceState.request.lastUpdatedAt,
          retryAction("error")
        )
      : phase === "extracting-signals" || phase === "retrieving-cases" || phase === "generating-report"
        ? mapRequestToUiSlice(
            "loading",
            resonanceState.workflow.detail,
            resonanceState.request.lastUpdatedAt
          )
        : phase === "no-similar-cases"
          ? mapRequestToUiSlice(
              "empty",
              resonanceState.workflow.detail,
              resonanceState.request.lastUpdatedAt,
              retryAction(resonanceState.request.status)
            )
          : mapRequestToUiSlice(
              hasMatches ? "ready" : "idle",
              resonanceState.workflow.detail,
              resonanceState.request.lastUpdatedAt,
              retryAction(resonanceState.request.status)
            );

  return {
    page: "resonance-focus",
    title: "同频共振",
    inputId: resonanceState.input?.inputId ?? null,
    status,
    processing: {
      phase,
      headline: resonanceState.workflow.headline,
      detail: resonanceState.workflow.detail
    },
    inputForm: {
      sourceType: resonanceState.input?.sourceType ?? "text",
      textPlaceholder: "写下你想比较、理解或寻找共振的经历。",
      helperText: "系统会先做结构化理解，再去本地知识库检索案例并生成比较理由。"
    },
    analysis: {
      summary: resonanceState.analysis?.analysis.summary ?? null,
      confidencePercent:
        resonanceState.analysis?.analysis.confidence !== undefined
          ? Math.round(resonanceState.analysis.analysis.confidence * 100)
          : null
    },
    matches: (matchView?.items ?? []).map((item) => ({
      rank: item.rank,
      title: item.title,
      scorePercent: item.scorePercent,
      rationale: item.rationale,
      whyMatched: item.whyMatched,
      whyNotFullyMatched: item.whyNotFullyMatched,
      uncertainty: item.uncertainty,
      matchedSignals: item.matchedSignals,
      mismatchSignals: item.mismatchSignals,
      excerpt: item.excerpt
    })),
    reportReady,
    actions: {
      submitText: action("提交文本", "submit-text", true),
      viewReport: action("查看报告", "navigate-report", reportReady),
      startNew: action("重新比较", "start-new", true),
      retry: retryAction(status.status)
    }
  };
}

export function buildSimulationRoutePage(
  simulationState: SimulationStoreState
): SimulationRoutePageViewModel {
  const routeView = simulationState.routeView;
  const isRunning = simulationState.run?.status === "running";
  const stage = routeView?.stage ?? "prepare";
  const hasPreparation = Boolean(routeView?.preparation);
  const isBusy =
    simulationState.request.status === "loading" ||
    simulationState.request.status === "streaming";
  const canSelectAction =
    !isBusy && isRunning && stage !== "completed" && (routeView?.actions.length ?? 0) > 0;
  const canFinishRun = !isBusy && isRunning && stage !== "completed";

  return {
    page: "simulation-route",
    title: "情境模拟",
    runId: simulationState.run?.runId ?? null,
    prepareId: routeView?.prepareId ?? simulationState.preparation?.prepareId ?? null,
    stage,
    currentTurnIndex: routeView?.currentTurnIndex ?? 0,
    scenarioTitle: routeView?.scenarioTitle ?? "",
    status: mapRequestToUiSlice(
      simulationState.request.status,
      simulationState.request.errorMessage,
      simulationState.request.lastUpdatedAt,
      retryAction(simulationState.request.status)
    ),
    opening: {
      sceneTitle: routeView?.scenarioOpeningTitle ?? "",
      sceneSummary: routeView?.scenarioOpeningSummary ?? "",
      playerGoal: routeView?.playerGoal ?? ""
    },
    preparation: routeView?.preparation ?? null,
    currentNode: routeView
      ? {
          nodeId: routeView.currentNodeId,
          title: routeView.currentNodeTitle,
          summary: routeView.currentNodeSummary,
          kind: "current"
        }
      : { nodeId: "", title: "", summary: "", kind: "entry" },
    availableActions: (routeView?.actions ?? []).map((option) => ({
      actionId: option.actionId,
      label: option.label,
      intent: option.intent,
      riskHint: option.riskHint,
      disabled: option.disabled || isBusy
    })),
    latestOutcome: routeView?.latestOutcome ?? null,
    routeNodes: (routeView?.nodes ?? []).map((node) => ({
      routeEntryId: node.routeEntryId,
      nodeId: node.nodeId,
      title: node.title,
      kind: node.kind,
      isCurrent: node.isCurrent,
      isVisited: node.isCurrent || (routeView?.nodes.indexOf(node) ?? 0) < (routeView?.nodes.findIndex((n) => n.isCurrent) ?? 0),
      ...(node.impactSummary ? { impactSummary: node.impactSummary } : {})
    })),
    availableBranches: (routeView?.branches ?? []).map((branch) => ({
      branchId: branch.branchId,
      label: branch.label,
      disabled: branch.disabled || isBusy
    })),
    reportReady: simulationState.reportStatus?.ready ?? false,
    actions: {
      prepareRun: action("生成本局准备", "prepare-run", !isBusy && Boolean(simulationState.scenario)),
      startRun: action("开始本局", "start-run", !isBusy && hasPreparation && !simulationState.run),
      selectAction: action("完成本轮行动", "select-action", canSelectAction),
      selectBranch: action("选择分支", "select-branch", canSelectAction || (!isBusy && isRunning && (routeView?.branches.length ?? 0) > 0)),
      finishRun: action("Stop And Report", "finish-run", canFinishRun),
      viewReport: action("查看报告", "navigate-report", !isBusy && (simulationState.reportStatus?.ready ?? false)),
      startNew: action("新的场景", "start-new", !isBusy),
      retry: retryAction(simulationState.request.status)
    }
  };
}

export function buildReportDetailPage(
  reportState: ReportStoreState,
  settingsStoreState?: SettingsStoreState
): ReportDetailPageViewModel {
  const shellView = reportState.shellView;
  const generatedAt = shellView?.generatedAt ?? "";
  const generatedAtLabel = generatedAt ? generatedAt.slice(0, 16).replace("T", " ") : "等待生成";
  const panelCount = shellView?.panels.length ?? 0;

  return {
    page: "report-detail",
    title: shellView?.title ?? "报告详情",
    reportId: shellView?.reportId ?? "",
    workflow: (shellView?.workflow ?? "counseling") as WorkflowKind,
    status: mapRequestToUiSlice(
      reportState.request.status,
      reportState.request.errorMessage,
      reportState.request.lastUpdatedAt,
      retryAction(reportState.request.status)
    ),
    summary: shellView?.summary ?? "",
    generatedAt: shellView?.generatedAt ?? "",
    exportLabel: shellView?.exportLabel ?? "HTML｜report.html",
    exportState: settingsStoreState?.exportSettings.lastExport ?? null,
    highlights: [
      {
        label: "观察面板",
        value: String(panelCount) + " panels"
      },
      {
        label: "生成时间",
        value: generatedAtLabel
      },
      {
        label: "导出格式",
        value: shellView?.exportLabel ?? "HTML｜report.html"
      }
    ],
    panels: (shellView?.panels ?? []).map((panel) => ({
      panelId: panel.panelId,
      heading: panel.heading,
      lines: panel.lines
    })),
    actions: {
      exportReport: action("导出报告", "export-report", shellView !== null),
      backToList: action("全部报告", "navigate-history", true),
      backToWorkflow: action("返回当前流程", "navigate-back", true),
      retry: retryAction(reportState.request.status)
    }
  };
}

export function buildHistoryPage(
  reportState: ReportStoreState,
  filterWorkflow: WorkflowKind | null = null
): HistoryPageViewModel {
  const allItems = reportState.history;
  const filtered = filterWorkflow ? allItems.filter((item) => item.workflow === filterWorkflow) : allItems;

  return {
    page: "history",
    title: "报告历史",
    status: mapRequestToUiSlice(
      allItems.length === 0 ? "empty" : "ready",
      allItems.length === 0 ? "No reports yet. Complete any workflow and the results will appear here." : null,
      reportState.listRequest.lastUpdatedAt
    ),
    filter: {
      workflow: filterWorkflow,
      label: filterWorkflow ? getWorkflowLabel(filterWorkflow) : "全部流程"
    },
    items: filtered.map((item) => ({
      id: item.reportId,
      workflow: item.workflow,
      title: item.title,
      subtitle: item.status === "ready" ? item.generatedAt : "Generating...",
      timestamp: item.generatedAt,
      nav: {
        label: item.title,
        scene: "report",
        workflow: item.workflow,
        reportId: item.reportId
      } as NavEntry,
      reportReference: {
        reportId: item.reportId,
        workflow: item.workflow,
        reportVersion: SHARED_VERSION,
        generatedAt: item.generatedAt
      }
    })),
    actions: {
      filterCounseling: action("心理咨询", "filter-counseling", true),
      filterSimulation: action("情境模拟", "filter-simulation", true),
      filterResonance: action("同频共振", "filter-resonance", true),
      clearFilter: action("全部", "clear-filter", filterWorkflow !== null),
      backToMenu: action("返回菜单", "navigate-menu", true)
    }
  };
}

export function buildSettingsPage(
  bootstrapState: AppBootstrapState,
  settingsStoreState?: SettingsStoreState
): SettingsPageViewModel {
  const appSettings = bootstrapState.settings;
  const providerState = settingsStoreState?.provider;
  const dataDir = settingsStoreState?.dataDirectory;
  const exportState = settingsStoreState?.exportSettings;
  const cleanup = settingsStoreState?.cleanup;

  return {
    page: "settings",
    title: "设置",
    settings: {
      theme: appSettings.theme,
      language: appSettings.language,
      modelVariant: appSettings.modelSelection.modelId
    },
    provider: {
      providerId: providerState?.providerId ?? "local",
      providerVersion: providerState?.providerVersion ?? "v1",
      endpoint: providerState?.endpoint ?? "",
      modelName: providerState?.modelName ?? appSettings.modelSelection.modelId,
      timeoutMs: providerState?.timeoutMs ?? 30000,
      maxRetries: providerState?.maxRetries ?? 3,
      capabilities: providerState?.capabilities ?? [],
      apiKeyConfigured: providerState?.apiKeyConfigured ?? false,
      apiKeyPreview: providerState?.apiKeyPreview ?? ""
    },
    providerTest: settingsStoreState?.lastProviderTest ?? null,
    dataDirectory: {
      rootPath: dataDir?.rootPath ?? appSettings.dataRoot,
      scopes: dataDir?.scopes ?? [
        { scope: "Database", path: appSettings.dataRoot + "/db", exists: true },
        { scope: "Uploads", path: appSettings.dataRoot + "/uploads", exists: true },
        { scope: "Exports", path: appSettings.dataRoot + "/exports", exists: false },
        { scope: "Snapshots", path: appSettings.dataRoot + "/snapshots", exists: false },
        {
          scope: "Counseling Knowledge Base",
          path: appSettings.dataRoot + "/knowledge-counseling",
          exists: false
        },
        {
          scope: "Resonance Knowledge Base",
          path: appSettings.dataRoot + "/knowledge-resonance",
          exists: false
        }
      ],
      totalSizeEstimate: dataDir?.totalSizeEstimate ?? "未知"
    },
    exportSettings: {
      availableFormats: exportState?.availableFormats ?? ["html", "json"],
      selectedFormat: exportState?.selectedFormat ?? "html",
      lastExport: exportState?.lastExport ?? null
    },
    cleanup: {
      pendingItems: cleanup?.pendingItems ?? 0,
      estimatedSpace: cleanup?.estimatedSpace ?? "0 MB",
      lastCleanup: cleanup?.lastCleanup ?? null
    },
    actions: {
      updateTheme: action("Theme", "update-theme", true),
      updateLanguage: action("Language", "update-language", true),
      updateProviderEndpoint: action("Endpoint", "update-provider-endpoint", true),
      updateModelName: action("Model", "update-model-name", true),
      saveProviderConfig: action("Save Provider", "save-provider-config", true),
      testProviderConnection: action("Test Connection", "test-provider", true),
      changeDataDirectory: action("Refresh Directory", "change-data-directory", true),
      exportData: action("Export Data", "export-data", true),
      runCleanup: action("Run Cleanup", "run-cleanup", true),
      backToMenu: action("Back To Menu", "navigate-menu", true)
    }
  };
}

export function buildRiskConfirmationPage(
  workflow: WorkflowKind,
  entityId: string,
  riskLevel: string,
  escalationStatus: string,
  signals: string[],
  recommendations: string[],
  boundaryNotice?: string
): RiskConfirmationPageViewModel {
  return {
    page: "risk-confirmation",
    title: "风险确认",
    workflow,
    entityId,
    riskSummary: {
      level: riskLevel,
      escalation: escalationStatus,
      signals,
      recommendations
    },
    boundaryNotice:
      boundaryNotice ?? "This tool does not replace professional mental health care. If you are in crisis, contact local emergency or professional services immediately.",
    actions: {
      confirm: action("我已了解", "confirm-risk", true),
      cancel: action("返回", "cancel-risk", true),
      escalateToHuman: action("寻求人类支持", "escalate-human", escalationStatus === "escalated" || escalationStatus === "urgent")
    }
  };
}

function navForWorkflow(workflow: WorkflowKind, entityId: string): NavEntry {
  switch (workflow) {
    case "counseling":
      return { label: "咨询会话", scene: "focus", workflow, entityId };
    case "simulation":
      return { label: "模拟路线", scene: "route", workflow, entityId };
    case "resonance":
      return { label: "共振比较", scene: "focus", workflow, entityId };
  }
}

export interface PageViewBuilderInput {
  bootstrapState: AppBootstrapState;
  scene: SceneCoordinatorState;
  counselingState: CounselingStoreState;
  simulationState: SimulationStoreState;
  resonanceState: ResonanceStoreState;
  reportState: ReportStoreState;
  settingsStoreState?: SettingsStoreState;
}

export function buildPageViewModel(input: PageViewBuilderInput): PageViewModel {
  const currentRoute = input.scene.current;
  const currentScene = currentRoute.scene;

  switch (currentScene) {
    case "entry":
      return buildLandingPage(input.bootstrapState);
    case "menu":
      return buildMenuPage(input.bootstrapState, getRecentItems(input.reportState));
    case "history":
      return buildHistoryPage(input.reportState, currentRoute.workflow ?? null);
    case "settings":
      return buildSettingsPage(input.bootstrapState, input.settingsStoreState);
    case "focus": {
      const wf = currentRoute.workflow ?? input.bootstrapState.lastActiveWorkflow;
      if (wf === "counseling") {
        return buildCounselingFocusPage(input.counselingState, input.bootstrapState);
      }
      return buildResonanceFocusPage(input.resonanceState);
    }
    case "route":
      return buildSimulationRoutePage(input.simulationState);
    case "report":
      return buildReportDetailPage(input.reportState, input.settingsStoreState);
    case "risk-confirmation": {
      const counselingView = input.counselingState.conversationView;
      return buildRiskConfirmationPage(
        currentRoute.workflow,
        currentRoute.entityId,
        counselingView?.riskLevel ?? "moderate",
        counselingView?.escalationStatus ?? "review_recommended",
        [
          counselingView?.riskLevel
            ? "Current detected risk level: " + counselingView.riskLevel + "."
            : "Please confirm the current risk prompt before continuing."
        ],
        [
          counselingView?.escalationReason ?? "Review the current situation carefully and consider reaching out for human support.",
          "If the situation feels urgent, contact local emergency or professional support services immediately."
        ],
        input.counselingState.session?.latestAnalysis?.summary
      );
    }
    default:
      return buildLandingPage(input.bootstrapState);
  }
}

function getRecentItems(reportState: ReportStoreState): Array<{ id: string; label: string; workflow: WorkflowKind; timestamp: string }> {
  return reportState.history.slice(0, 5).map((item) => ({
    id: item.reportId,
    label: item.title,
    workflow: item.workflow,
    timestamp: item.generatedAt
  }));
}

