import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ResonanceCompareRequest } from "@psyai/contracts";
import "../../../frontend/src/ui/styles/scene-system.css";
import { App } from "../../../frontend/dist/ui/App.js";
import { isPageViewModel, type PageViewModel } from "../../../frontend/dist/pages/page-view-model.js";
import type { UiHostAction } from "../../../frontend/dist/ui/host-action.js";
import type { FrontendSceneRoute } from "../../../frontend/dist/scenes/scene-coordinator.js";
import type { PsyAiHostAction } from "../host-actions.js";

function toHostAction(action: UiHostAction): PsyAiHostAction {
  switch (action.type) {
    case "counseling.start":
    case "counseling.reply":
    case "counseling.finish":
    case "simulation.loadScenario":
    case "simulation.prepare":
    case "simulation.randomizePrepare":
    case "simulation.startRun":
    case "simulation.advance":
    case "simulation.finish":
    case "simulation.loadReportStatus":
    case "resonance.submitInput":
    case "resonance.analyzeInput":
    case "resonance.loadMatches":
    case "resonance.loadReportStatus":
    case "resonance.reset":
    case "report.load":
    case "settings.saveProviderConfig":
    case "settings.testProviderConnection":
    case "settings.refreshDataDirectory":
    case "settings.runCleanup":
    case "settings.runExport":
      return action;
    case "resonance.compare":
      return {
        type: "resonance.compare",
        ...(action.request && typeof action.request.inputId === "string"
          ? {
              request: {
                inputId: action.request.inputId,
                ...(typeof action.request.candidateSetId === "string" ? { candidateSetId: action.request.candidateSetId } : {}),
                ...(typeof action.request.topK === "number" ? { topK: action.request.topK } : {})
              } satisfies ResonanceCompareRequest
            }
          : {})
      };
    default:
      throw new Error(`Unsupported UI host action: ${(action as { type?: string }).type ?? "unknown"}`);
  }
}

function PsyAiRoot() {
  const [vm, setVm] = useState<PageViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const psyai = window.psyai;
    if (!psyai) {
      setError("psyai bridge not available (preload failed).");
      return;
    }

    psyai
      .getPageViewModel()
      .then((data) => setVm(data))
      .catch((err: Error) => setError(err.message));

    psyai.onStateChanged((data) => {
      setVm(data);
    });
  }, []);

  const navigate = async (route: FrontendSceneRoute) => {
    await dispatchAction({ type: "scene.navigate", route });
  };

  const dispatchUiAction = async (action: UiHostAction) => {
    await dispatchAction(toHostAction(action));
  };

  const dispatchAction = async (action: PsyAiHostAction) => {
    const psyai = window.psyai;
    if (!psyai) {
      setError("psyai bridge not available (preload failed).");
      return;
    }

    try {
      const nextViewModel = await psyai.invokeAction(action);
      if (isPageViewModel(nextViewModel)) {
        setVm(nextViewModel);
        setError(null);
      } else {
        setError("Invalid page view model returned from host action.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown renderer action error.");
    }
  };

  if (error) {
    return <p style={{ padding: 40, textAlign: "center", color: "#c33" }}>{error}</p>;
  }

  if (!vm) {
    return <p style={{ padding: 40, textAlign: "center", color: "#999" }}>Loading PsyAI...</p>;
  }

  return <App viewModel={vm} onNavigate={navigate} onAction={dispatchUiAction} />;
}

const root = createRoot(document.getElementById("root")!);
root.render(<PsyAiRoot />);
