import type {
  CounselingReplyRequest,
  CounselingStartRequest,
  ReportReference,
  ResonanceCompareRequest,
  ResonanceInputRequest,
  SimulationAdvanceRequest,
  SimulationPrepareRequest,
  SimulationRunRequest
} from "@psyai/contracts";
import type { FrontendSceneRoute, FrontendShell, PageViewModel } from "@psyai/frontend";

export type SimulationPrepareActionRequest = Partial<SimulationPrepareRequest> & {
  playerProfile?: {
    displayName?: string;
    identity?: string;
    publicGoal?: string;
    hiddenPressure?: string;
    coreBelief?: string;
    emotionalTrait?: string;
    currentState?: string;
  };
  npcProfiles?: Array<{
    displayName?: string;
    identity?: string;
    publicGoal?: string;
    hiddenPressure?: string;
    coreBelief?: string;
    emotionalTrait?: string;
    currentState?: string;
  }>;
  environmentProfile?: {
    displayName?: string;
    era?: string;
    location?: string;
    socialRule?: string;
    pressureSource?: string;
    eventBias?: string;
    currentState?: string;
  };
};

export type PsyAiHostAction =
  | { type: "scene.navigate"; route: FrontendSceneRoute; reason?: string }
  | { type: "scene.back"; reason?: string }
  | { type: "counseling.start"; request?: CounselingStartRequest }
  | { type: "counseling.reply"; request?: CounselingReplyRequest }
  | { type: "counseling.finish"; sessionId?: string }
  | { type: "counseling.loadReportStatus"; sessionId?: string }
  | { type: "simulation.loadScenario"; scenarioId?: string }
  | { type: "simulation.prepare"; request?: SimulationPrepareActionRequest }
  | {
      type: "simulation.randomizePrepare";
      request?: {
        scenarioId?: string;
        playerName?: string;
        npcCount?: number;
        npcNames?: string[];
        sourceNotes?: string[];
        operatorNote?: string;
      };
    }
  | { type: "simulation.startRun"; request?: SimulationRunRequest }
  | { type: "simulation.advance"; request?: SimulationAdvanceRequest }
  | { type: "simulation.finish"; runId?: string }
  | { type: "simulation.loadReportStatus"; runId?: string }
  | { type: "resonance.submitInput"; request?: ResonanceInputRequest }
  | { type: "resonance.analyzeInput"; inputId?: string }
  | { type: "resonance.compare"; request?: ResonanceCompareRequest }
  | { type: "resonance.loadMatches"; comparisonId?: string }
  | { type: "resonance.loadReportStatus"; comparisonId?: string }
  | { type: "resonance.reset" }
  | { type: "report.load"; reference?: ReportReference }
  | { type: "report.list" }
  | {
      type: "settings.saveProviderConfig";
      request?: {
        providerId?: string;
        modelName?: string;
        endpoint?: string;
        apiKey?: string;
      };
    }
  | { type: "settings.testProviderConnection" }
  | { type: "settings.refreshDataDirectory" }
  | { type: "settings.runCleanup" }
  | { type: "settings.runExport" };

export interface PsyAiBridge {
  getPageViewModel(): Promise<PageViewModel>;
  invokeAction(action: PsyAiHostAction): Promise<PageViewModel>;
  onStateChanged(callback: (viewModel: PageViewModel) => void): void;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, callback: (...args: unknown[]) => void): void;
}

export type PsyAiHostShell = FrontendShell;
