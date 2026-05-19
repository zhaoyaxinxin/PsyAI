import React from "react";
import type { PageViewModel } from "../pages/page-view-model.js";
import type { AppNavigateHandler } from "./navigation.js";
import type { UiHostAction } from "./host-action.js";
import { EntryScene } from "./scenes/EntryScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { CounselingFocusScene } from "./scenes/CounselingFocusScene.js";
import { ResonanceFocusScene } from "./scenes/ResonanceFocusScene.js";
import { SimulationRouteScene } from "./scenes/SimulationRouteScene.js";
import { ReportScene } from "./scenes/ReportScene.js";
import { RiskConfirmation } from "./scenes/RiskConfirmation.js";
import { SettingsScene } from "./scenes/SettingsScene.js";
import { HistoryScene } from "./scenes/HistoryScene.js";

export const App: React.FC<{
  viewModel: PageViewModel;
  onNavigate?: AppNavigateHandler;
  onAction?: (action: UiHostAction) => Promise<void> | void;
}> = ({ viewModel, onNavigate, onAction }) => {
  const navigate = onNavigate ?? (() => {});
  const dispatch = onAction ?? (() => {});

  switch (viewModel.page) {
    case "landing":
      return <EntryScene vm={viewModel} onNavigate={navigate} />;
    case "menu":
      return <MenuScene vm={viewModel} onNavigate={navigate} onAction={dispatch} />;
    case "counseling-focus":
      return <CounselingFocusScene vm={viewModel} onNavigate={navigate} onAction={dispatch} />;
    case "resonance-focus":
      return <ResonanceFocusScene vm={viewModel} onNavigate={navigate} onAction={dispatch} />;
    case "simulation-route":
      return <SimulationRouteScene vm={viewModel} onNavigate={navigate} onAction={dispatch} />;
    case "report-detail":
      return <ReportScene vm={viewModel} onNavigate={navigate} onAction={dispatch} />;
    case "history":
      return <HistoryScene vm={viewModel} onNavigate={navigate} onAction={dispatch} />;
    case "settings":
      return <SettingsScene vm={viewModel} onNavigate={navigate} onAction={dispatch} />;
    case "risk-confirmation":
      return <RiskConfirmation vm={viewModel} onNavigate={navigate} />;
  }

  const exhaustiveCheck: never = viewModel;
  return exhaustiveCheck;
};
