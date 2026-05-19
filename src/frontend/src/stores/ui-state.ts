/**
 * UI state management — loading / error / empty / recovery patterns
 * for the frontend shell. Pure helpers, no business rules.
 */
import type { RequestState, RecoveryAction } from "./store-core.js";

// ── Status predicates ───────────────────────────────────────────────

export function isIdle(state: RequestState): boolean {
  return state.status === "idle";
}

export function isLoading(state: RequestState): boolean {
  return state.status === "loading";
}

export function isReady(state: RequestState): boolean {
  return state.status === "ready";
}

export function isError(state: RequestState): boolean {
  return state.status === "error";
}

export function isEmpty(state: RequestState): boolean {
  return state.status === "empty";
}

export function isSettled(state: RequestState): boolean {
  return state.status === "ready" || state.status === "error" || state.status === "empty";
}

// ── Composite UI state ──────────────────────────────────────────────

export interface UiBlockState {
  mode: "loading" | "error" | "empty" | "ready" | "idle";
  message: string | null;
  recoveryAction: RecoveryAction | null;
  retryCount: number;
}

export function computeUiBlock(
  request: RequestState,
  hasData: boolean
): UiBlockState {
  switch (request.status) {
    case "idle":
      return { mode: "idle", message: null, recoveryAction: null, retryCount: 0 };
    case "loading": {
      const retryCount = request.retryCount ?? 0;
      if (retryCount > 0) {
        return {
          mode: "loading",
          message: `Retrying (attempt ${retryCount})...`,
          recoveryAction: null,
          retryCount
        };
      }
      return { mode: "loading", message: "Loading...", recoveryAction: null, retryCount: 0 };
    }
    case "streaming":
      return { mode: "loading", message: "Receiving response...", recoveryAction: null, retryCount: 0 };
    case "ready":
      if (!hasData) {
        return { mode: "empty", message: "No data available.", recoveryAction: null, retryCount: 0 };
      }
      return { mode: "ready", message: null, recoveryAction: null, retryCount: 0 };
    case "error":
      return {
        mode: "error",
        message: request.errorMessage ?? "An unexpected error occurred.",
        recoveryAction: request.recoveryAction ?? { label: "Try Again", kind: "retry" },
        retryCount: request.retryCount ?? 0
      };
    case "empty":
      return {
        mode: "empty",
        message: request.errorMessage ?? "Nothing to show yet.",
        recoveryAction: null,
        retryCount: 0
      };
  }
}

// ── Recovery helpers ────────────────────────────────────────────────

export function buildRetryRecovery(retryCount: number): RecoveryAction {
  return {
    label: retryCount > 0 ? `Retry (${retryCount})` : "Retry",
    kind: "retry"
  };
}

export function buildBackToMenuRecovery(): RecoveryAction {
  return { label: "Back to Menu", kind: "navigate-menu" };
}

export function buildStartNewRecovery(): RecoveryAction {
  return { label: "Start New", kind: "start-new" };
}

export function buildRefreshRecovery(): RecoveryAction {
  return { label: "Refresh", kind: "refresh" };
}

// ── Multi-request aggregation ───────────────────────────────────────

export type AggregatedUiMode = "idle" | "loading" | "ready" | "error" | "empty";

export interface AggregatedUiState {
  mode: AggregatedUiMode;
  loadingCount: number;
  errorCount: number;
  firstErrorMessage: string | null;
}

/**
 * Aggregate multiple request states into a single UI mode.
 * Ready + Loading = Loading, Error + anything = Error, etc.
 */
export function aggregateRequestStates(states: RequestState[]): AggregatedUiState {
  let loadingCount = 0;
  let errorCount = 0;
  let firstErrorMessage: string | null = null;
  let hasReady = false;

  for (const state of states) {
    if (state.status === "loading") loadingCount += 1;
    if (state.status === "error") {
      errorCount += 1;
      if (!firstErrorMessage) firstErrorMessage = state.errorMessage;
    }
    if (state.status === "ready") hasReady = true;
  }

  if (errorCount > 0) {
    return { mode: "error", loadingCount, errorCount, firstErrorMessage };
  }

  if (loadingCount > 0) {
    return { mode: "loading", loadingCount, errorCount, firstErrorMessage };
  }

  if (hasReady) {
    return { mode: "ready", loadingCount, errorCount, firstErrorMessage };
  }

  if (states.every((s) => s.status === "idle")) {
    return { mode: "idle", loadingCount, errorCount, firstErrorMessage };
  }

  return { mode: "empty", loadingCount, errorCount, firstErrorMessage };
}
