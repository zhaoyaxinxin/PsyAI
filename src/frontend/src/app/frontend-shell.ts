import { createDefaultAppBootstrapState, type AppBootstrapState } from "@psyai/app-state";

import {
  createFakeFixtureTransport,
  createFixtureReportRepository,
  type ReportRepository
} from "../api/fake-transport.js";
import { createApiClients, type FrontendApiClients, type FrontendTransport } from "../api/transport.js";
import { buildPageViewModel, type PageViewBuilderInput } from "../pages/page-view-builder.js";
import type { PageViewModel } from "../pages/page-view-model.js";
import { createCounselingStore, type CounselingStore } from "../stores/counseling-store.js";
import { createReportStore, type ReportStore } from "../stores/report-store.js";
import { createResonanceStore, type ResonanceStore } from "../stores/resonance-store.js";
import { createSceneStore, type SceneStore } from "../stores/scene-store.js";
import {
  createSettingsStore,
  type SettingsStore,
  type SettingsStoreState
} from "../stores/settings-store.js";
import { createSimulationStore, type SimulationStore } from "../stores/simulation-store.js";

export interface FrontendShell {
  bootstrapState: AppBootstrapState;
  api: FrontendApiClients;
  sceneStore: SceneStore;
  counselingStore: CounselingStore;
  simulationStore: SimulationStore;
  resonanceStore: ResonanceStore;
  reportStore: ReportStore;
  settingsStore: SettingsStore;
  /** Produce a UI-consumable page view model from the current shell state. */
  getPageViewModel(): PageViewModel;
}

export interface FrontendShellOptions {
  bootstrapState?: AppBootstrapState;
  transport?: FrontendTransport;
  reportRepository?: ReportRepository;
}

export function createFrontendShell(options: FrontendShellOptions = {}): FrontendShell {
  const bootstrapState = options.bootstrapState ?? createDefaultAppBootstrapState();
  const transport = options.transport ?? createFakeFixtureTransport();
  const reportRepository = options.reportRepository ?? createFixtureReportRepository();
  const api = createApiClients(transport);

  const sceneStore = createSceneStore(bootstrapState);
  const counselingStore = createCounselingStore(api.counseling);
  const simulationStore = createSimulationStore(api.simulation);
  const resonanceStore = createResonanceStore(api.resonance);
  const reportStore = createReportStore(reportRepository);
  const settingsStore = createSettingsStore(
    {
      providerId: bootstrapState.settings.modelSelection.provider,
      modelName: bootstrapState.settings.modelSelection.modelId
    },
    bootstrapState.settings.dataRoot
  );

  function getPageViewModel(): PageViewModel {
    const input: PageViewBuilderInput = {
      bootstrapState,
      scene: sceneStore.getState().coordinator,
      counselingState: counselingStore.getState(),
      simulationState: simulationStore.getState(),
      resonanceState: resonanceStore.getState(),
      reportState: reportStore.getState(),
      settingsStoreState: settingsStore.getState()
    };

    return buildPageViewModel(input);
  }

  return {
    bootstrapState,
    api,
    sceneStore,
    counselingStore,
    simulationStore,
    resonanceStore,
    reportStore,
    settingsStore,
    getPageViewModel
  };
}
