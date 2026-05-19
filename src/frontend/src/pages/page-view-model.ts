/**
 * Page-level view models for real UI consumption.
 *
 * Each type is a flat, self-contained, directly renderable descriptor.
 * Builders in page-view-builder.ts map store state into these view models.
 */
import type { WorkflowKind } from "@psyai/shared";
import type { ReportReference, SimulationRouteStage } from "@psyai/contracts";

// ── Shared primitives ───────────────────────────────────────────────

export interface ActionDescriptor {
  label: string;
  kind: string;
  enabled: boolean;
  reason?: string;
}

export interface NavEntry {
  label: string;
  scene: string;
  workflow?: string;
  entityId?: string;
  reportId?: string;
}

export type UiStatus = "idle" | "loading" | "streaming" | "ready" | "error" | "empty" | "recovering";

export interface UiStateSlice {
  status: UiStatus;
  message: string | null;
  lastUpdatedAt: string | null;
  retryAction?: ActionDescriptor;
}

// ── Landing (entry scene) ───────────────────────────────────────────

export interface LandingPageViewModel {
  page: "landing";
  title: string;
  subtitle: string;
  consent: {
    disclaimerAccepted: boolean;
    riskAcknowledged: boolean;
    disclaimerLabel: string;
    riskLabel: string;
  };
  availableWorkflows: Array<{
    workflow: WorkflowKind;
    label: string;
    description: string;
  }>;
  actions: {
    acceptDisclaimer: ActionDescriptor;
    acknowledgeRisk: ActionDescriptor;
    enterCounseling: ActionDescriptor;
    enterSimulation: ActionDescriptor;
    enterResonance: ActionDescriptor;
  };
}

// ── Menu (menu scene) ───────────────────────────────────────────────

export interface MenuPageViewModel {
  page: "menu";
  title: string;
  greeting: string;
  workflows: Array<{
    workflow: WorkflowKind;
    label: string;
    description: string;
    iconLabel: string;
  }>;
  recentItems: Array<{
    id: string;
    label: string;
    workflow: WorkflowKind;
    timestamp: string;
    nav: NavEntry;
    reportReference: ReportReference;
  }>;
  actions: {
    selectCounseling: ActionDescriptor;
    selectSimulation: ActionDescriptor;
    selectResonance: ActionDescriptor;
    openHistory: ActionDescriptor;
    openSettings: ActionDescriptor;
  };
}

// ── Counseling focus ────────────────────────────────────────────────

export interface CounselingFocusPageViewModel {
  page: "counseling-focus";
  title: string;
  sessionId: string | null;
  status: UiStateSlice;
  conversation: {
    messages: Array<{
      speaker: string;
      content: string;
      createdAt: string;
    }>;
    emptyMessage: string;
  };
  analysis: {
    stage: string | null;
    summary: string | null;
    riskLevel: string | null;
    escalationStatus: string | null;
    escalationReason: string | null;
  };
  reportReady: boolean;
  actions: {
    sendMessage: ActionDescriptor;
    finishSession: ActionDescriptor;
    viewReport: ActionDescriptor;
    acknowledgeRisk: ActionDescriptor;
    startNew: ActionDescriptor;
    retry: ActionDescriptor | undefined;
  };
}

// ── Resonance focus ─────────────────────────────────────────────────

export interface ResonanceFocusPageViewModel {
  page: "resonance-focus";
  title: string;
  inputId: string | null;
  status: UiStateSlice;
  processing: {
    phase:
      | "idle"
      | "extracting-signals"
      | "retrieving-cases"
      | "generating-report"
      | "ready"
      | "no-similar-cases"
      | "analysis-failed";
    headline: string;
    detail: string | null;
  };
  inputForm: {
    sourceType: "text" | "file";
    textPlaceholder: string;
    helperText: string;
  };
  analysis: {
    summary: string | null;
    confidencePercent: number | null;
  };
  matches: Array<{
    rank: number;
    title: string;
    scorePercent: number;
    rationale: string;
    whyMatched: string;
    whyNotFullyMatched: string | null;
    uncertainty: string | null;
    matchedSignals: string[];
    mismatchSignals: string[];
    excerpt: string | null;
  }>;
  reportReady: boolean;
  actions: {
    submitText: ActionDescriptor;
    viewReport: ActionDescriptor;
    startNew: ActionDescriptor;
    retry: ActionDescriptor | undefined;
  };
}

// ── Simulation route ────────────────────────────────────────────────

export interface SimulationRoutePageViewModel {
  page: "simulation-route";
  title: string;
  runId: string | null;
  prepareId: string | null;
  stage: SimulationRouteStage;
  currentTurnIndex: number;
  scenarioTitle: string;
  status: UiStateSlice;
  opening: {
    sceneTitle: string;
    sceneSummary: string;
    playerGoal: string;
  };
  preparation: {
    summary: string;
    player: {
      displayName: string;
      identity: string;
      publicGoal: string;
      currentState: string;
    };
    npcs: Array<{
      displayName: string;
      identity: string;
      publicGoal: string;
      currentState: string;
    }>;
    environment: {
      displayName: string;
      location: string;
      pressureSource: string;
      currentState: string;
    };
    sourceNotes: string[];
  } | null;
  currentNode: {
    nodeId: string;
    title: string;
    summary: string;
    kind: string;
  };
  availableActions: Array<{
    actionId: string;
    label: string;
    intent: string;
    riskHint: string;
    disabled: boolean;
  }>;
  latestOutcome: {
    turnId: string;
    turnIndex: number;
    playerActionLabel: string;
    consequenceSummary: string;
    dialogueLines: string[];
    interactionBeats: string[];
    npcReactions: string[];
    actorChanges: string[];
    environmentSummary: string;
  } | null;
  routeNodes: Array<{
    routeEntryId: string;
    nodeId: string;
    title: string;
    kind: string;
    isCurrent: boolean;
    isVisited: boolean;
    impactSummary?: string;
  }>;
  availableBranches: Array<{
    branchId: string;
    label: string;
    disabled: boolean;
  }>;
  reportReady: boolean;
  actions: {
    prepareRun: ActionDescriptor;
    startRun: ActionDescriptor;
    selectAction: ActionDescriptor;
    selectBranch: ActionDescriptor;
    finishRun: ActionDescriptor;
    viewReport: ActionDescriptor;
    startNew: ActionDescriptor;
    retry: ActionDescriptor | undefined;
  };
}

// ── Report detail ───────────────────────────────────────────────────

export interface ReportDetailPageViewModel {
  page: "report-detail";
  title: string;
  reportId: string;
  workflow: WorkflowKind;
  status: UiStateSlice;
  summary: string;
  generatedAt: string;
  exportLabel: string;
  exportState: { fileName: string; exportedAt: string } | null;
  highlights: Array<{ label: string; value: string }>;
  panels: Array<{
    panelId: string;
    heading: string;
    lines: string[];
  }>;
  actions: {
    exportReport: ActionDescriptor;
    backToList: ActionDescriptor;
    backToWorkflow: ActionDescriptor;
    retry: ActionDescriptor | undefined;
  };
}

// ── History ─────────────────────────────────────────────────────────

export interface HistoryPageViewModel {
  page: "history";
  title: string;
  status: UiStateSlice;
  filter: {
    workflow: WorkflowKind | null;
    label: string;
  };
  items: Array<{
    id: string;
    workflow: WorkflowKind;
    title: string;
    subtitle: string;
    timestamp: string;
    nav: NavEntry;
    reportReference: ReportReference;
  }>;
  actions: {
    filterCounseling: ActionDescriptor;
    filterSimulation: ActionDescriptor;
    filterResonance: ActionDescriptor;
    clearFilter: ActionDescriptor;
    backToMenu: ActionDescriptor;
  };
}

// ── Settings ────────────────────────────────────────────────────────

export interface ProviderConfigViewModel {
  providerId: string;
  providerVersion: string;
  endpoint: string;
  modelName: string;
  timeoutMs: number;
  maxRetries: number;
  capabilities: string[];
  apiKeyConfigured: boolean;
  apiKeyPreview: string;
}

export interface DataDirectoryViewModel {
  rootPath: string;
  scopes: Array<{
    scope: string;
    path: string;
    exists: boolean;
  }>;
  totalSizeEstimate: string;
}

export interface ExportViewModel {
  availableFormats: string[];
  selectedFormat: string;
  lastExport: { fileName: string; exportedAt: string } | null;
}

export interface CleanupViewModel {
  pendingItems: number;
  estimatedSpace: string;
  lastCleanup: string | null;
}

export interface SettingsPageViewModel {
  page: "settings";
  title: string;
  settings: {
    theme: string;
    language: string;
    modelVariant: string;
  };
  provider: ProviderConfigViewModel;
  providerTest: {
    success: boolean;
    latencyMs: number;
    errorMessage: string | null;
  } | null;
  dataDirectory: DataDirectoryViewModel;
  exportSettings: ExportViewModel;
  cleanup: CleanupViewModel;
  actions: {
    updateTheme: ActionDescriptor;
    updateLanguage: ActionDescriptor;
    updateProviderEndpoint: ActionDescriptor;
    updateModelName: ActionDescriptor;
    saveProviderConfig: ActionDescriptor;
    testProviderConnection: ActionDescriptor;
    changeDataDirectory: ActionDescriptor;
    exportData: ActionDescriptor;
    runCleanup: ActionDescriptor;
    backToMenu: ActionDescriptor;
  };
}

// ── Risk confirmation (modal / overlay page) ────────────────────────

export interface RiskConfirmationPageViewModel {
  page: "risk-confirmation";
  title: string;
  workflow: WorkflowKind;
  entityId: string;
  riskSummary: {
    level: string;
    escalation: string;
    signals: string[];
    recommendations: string[];
  };
  boundaryNotice: string;
  actions: {
    confirm: ActionDescriptor;
    cancel: ActionDescriptor;
    escalateToHuman: ActionDescriptor;
  };
}

// ── Discriminated union ─────────────────────────────────────────────

export type PageViewModel =
  | LandingPageViewModel
  | MenuPageViewModel
  | CounselingFocusPageViewModel
  | ResonanceFocusPageViewModel
  | SimulationRoutePageViewModel
  | ReportDetailPageViewModel
  | HistoryPageViewModel
  | SettingsPageViewModel
  | RiskConfirmationPageViewModel;

export function isPageViewModel(value: unknown): value is PageViewModel {
  if (!value || typeof value !== "object") return false;
  const page = (value as Record<string, unknown>)["page"];
  return (
    page === "landing" ||
    page === "menu" ||
    page === "counseling-focus" ||
    page === "resonance-focus" ||
    page === "simulation-route" ||
    page === "report-detail" ||
    page === "history" ||
    page === "settings" ||
    page === "risk-confirmation"
  );
}
