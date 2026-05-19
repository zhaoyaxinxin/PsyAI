import type { AppBootstrapState } from "@psyai/app-state";
import type { WorkflowKind } from "@psyai/shared";

export const frontendSceneValues = ["entry", "menu", "focus", "route", "report", "history", "settings", "risk-confirmation"] as const;

export type FrontendSceneId = (typeof frontendSceneValues)[number];
export type FocusWorkflowKind = Extract<WorkflowKind, "counseling" | "resonance">;

export type FrontendSceneRoute =
  | { scene: "entry" }
  | { scene: "menu"; workflow?: WorkflowKind }
  | { scene: "focus"; workflow: FocusWorkflowKind; entityId?: string }
  | { scene: "route"; runId?: string; nodeId?: string }
  | { scene: "report"; workflow: WorkflowKind; reportId: string }
  | { scene: "history"; workflow?: WorkflowKind | null }
  | { scene: "settings" }
  | { scene: "risk-confirmation"; workflow: WorkflowKind; entityId: string };

export interface SceneTransitionRecord {
  from: FrontendSceneRoute | null;
  to: FrontendSceneRoute;
  occurredAt: string;
  reason: string;
  mode: "push" | "replace" | "back" | "reset";
}

export interface SceneCoordinatorState {
  current: FrontendSceneRoute;
  previous: FrontendSceneRoute | null;
  history: FrontendSceneRoute[];
  lastTransition: SceneTransitionRecord | null;
}

export interface SceneNavigateOptions {
  occurredAt?: string;
  reason?: string;
  replace?: boolean;
}

export interface SceneCoordinator {
  getState(): SceneCoordinatorState;
  canGoBack(): boolean;
  navigate(route: FrontendSceneRoute, options?: SceneNavigateOptions): SceneCoordinatorState;
  back(reason?: string, occurredAt?: string): SceneCoordinatorState;
  reset(route: FrontendSceneRoute, reason?: string, occurredAt?: string): SceneCoordinatorState;
}

const defaultTimestamp = "1970-01-01T00:00:00+00:00";

function cloneRoute(route: FrontendSceneRoute): FrontendSceneRoute {
  return { ...route };
}

function cloneState(state: SceneCoordinatorState): SceneCoordinatorState {
  return {
    current: cloneRoute(state.current),
    previous: state.previous ? cloneRoute(state.previous) : null,
    history: state.history.map((route) => cloneRoute(route)),
    lastTransition: state.lastTransition
      ? {
          ...state.lastTransition,
          from: state.lastTransition.from ? cloneRoute(state.lastTransition.from) : null,
          to: cloneRoute(state.lastTransition.to)
        }
      : null
  };
}

function createState(
  current: FrontendSceneRoute,
  previous: FrontendSceneRoute | null,
  history: FrontendSceneRoute[],
  lastTransition: SceneTransitionRecord | null
): SceneCoordinatorState {
  return {
    current: cloneRoute(current),
    previous: previous ? cloneRoute(previous) : null,
    history: history.map((route) => cloneRoute(route)),
    lastTransition: lastTransition
      ? {
          ...lastTransition,
          from: lastTransition.from ? cloneRoute(lastTransition.from) : null,
          to: cloneRoute(lastTransition.to)
        }
      : null
  };
}

export function createInitialSceneFromBootstrapState(
  bootstrapState: AppBootstrapState
): FrontendSceneRoute {
  const { activePointers, lastActiveWorkflow } = bootstrapState;

  if (lastActiveWorkflow === "counseling" && activePointers.counselingSession) {
    return {
      scene: "focus",
      workflow: "counseling",
      entityId: activePointers.counselingSession.id
    };
  }

  if (lastActiveWorkflow === "resonance" && activePointers.resonanceInput) {
    return {
      scene: "focus",
      workflow: "resonance",
      entityId: activePointers.resonanceInput.id
    };
  }

  if (lastActiveWorkflow === "simulation" && activePointers.simulationRun) {
    return {
      scene: "route",
      runId: activePointers.simulationRun.id
    };
  }

  if (activePointers.counselingSession) {
    return {
      scene: "focus",
      workflow: "counseling",
      entityId: activePointers.counselingSession.id
    };
  }

  if (activePointers.resonanceInput) {
    return {
      scene: "focus",
      workflow: "resonance",
      entityId: activePointers.resonanceInput.id
    };
  }

  if (activePointers.simulationRun) {
    return {
      scene: "route",
      runId: activePointers.simulationRun.id
    };
  }

  if (lastActiveWorkflow === "counseling" || lastActiveWorkflow === "resonance") {
    return {
      scene: "focus",
      workflow: lastActiveWorkflow
    };
  }

  if (lastActiveWorkflow === "simulation") {
    return {
      scene: "route"
    };
  }

  return {
    scene: "entry"
  };
}

export function createSceneCoordinator(initialRoute: FrontendSceneRoute): SceneCoordinator {
  let state = createState(initialRoute, null, [initialRoute], null);

  return {
    getState(): SceneCoordinatorState {
      return cloneState(state);
    },
    canGoBack(): boolean {
      return state.history.length > 1;
    },
    navigate(route: FrontendSceneRoute, options: SceneNavigateOptions = {}): SceneCoordinatorState {
      const nextRoute = cloneRoute(route);
      const from = state.current;
      const occurredAt = options.occurredAt ?? defaultTimestamp;
      const reason = options.reason ?? "navigate";

      const nextHistory = options.replace
        ? [...state.history.slice(0, -1), nextRoute]
        : [...state.history, nextRoute];

      state = createState(
        nextRoute,
        from,
        nextHistory,
        {
          from,
          to: nextRoute,
          occurredAt,
          reason,
          mode: options.replace ? "replace" : "push"
        }
      );

      return cloneState(state);
    },
    back(reason = "back", occurredAt = defaultTimestamp): SceneCoordinatorState {
      if (state.history.length <= 1) {
        return cloneState(state);
      }

      const previousHistory = state.history.slice(0, -1);
      const nextCurrent = previousHistory[previousHistory.length - 1];
      if (!nextCurrent) {
        return cloneState(state);
      }

      const from = state.current;
      state = createState(
        nextCurrent,
        from,
        previousHistory,
        {
          from,
          to: nextCurrent,
          occurredAt,
          reason,
          mode: "back"
        }
      );

      return cloneState(state);
    },
    reset(route: FrontendSceneRoute, reason = "reset", occurredAt = defaultTimestamp): SceneCoordinatorState {
      const nextRoute = cloneRoute(route);
      const from = state.current;
      state = createState(
        nextRoute,
        from,
        [nextRoute],
        {
          from,
          to: nextRoute,
          occurredAt,
          reason,
          mode: "reset"
        }
      );

      return cloneState(state);
    }
  };
}
