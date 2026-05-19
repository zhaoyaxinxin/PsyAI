export type StoreListener<TState> = (state: TState) => void;

export type StoreUpdater<TState> = TState | ((current: TState) => TState);

export interface StoreContainer<TState> {
  getState(): TState;
  setState(updater: StoreUpdater<TState>): TState;
  subscribe(listener: StoreListener<TState>): () => void;
}

export type RequestStatus = "idle" | "loading" | "streaming" | "ready" | "error" | "empty";

export interface RecoveryAction {
  label: string;
  kind: string;
}

export interface RequestState {
  status: RequestStatus;
  lastUpdatedAt: string | null;
  errorMessage: string | null;
  recoveryAction?: RecoveryAction;
  retryCount?: number;
}

export function createStoreContainer<TState>(initialState: TState): StoreContainer<TState> {
  let state = initialState;
  const listeners = new Set<StoreListener<TState>>();

  return {
    getState(): TState {
      return state;
    },
    setState(updater: StoreUpdater<TState>): TState {
      state = typeof updater === "function" ? (updater as (current: TState) => TState)(state) : updater;

      for (const listener of listeners) {
        listener(state);
      }

      return state;
    },
    subscribe(listener: StoreListener<TState>): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

export function createIdleRequestState(): RequestState {
  return {
    status: "idle",
    lastUpdatedAt: null,
    errorMessage: null
  };
}

export function createLoadingRequestState(at: string): RequestState {
  return {
    status: "loading",
    lastUpdatedAt: at,
    errorMessage: null
  };
}

export function createReadyRequestState(at: string): RequestState {
  return {
    status: "ready",
    lastUpdatedAt: at,
    errorMessage: null
  };
}

export function createErrorRequestState(at: string, errorMessage: string, recoveryAction?: RecoveryAction): RequestState {
  return {
    status: "error",
    lastUpdatedAt: at,
    errorMessage,
    ...(recoveryAction ? { recoveryAction } : {})
  };
}

export function createEmptyRequestState(at: string, message: string): RequestState {
  return {
    status: "empty",
    lastUpdatedAt: at,
    errorMessage: message
  };
}

export function createRecoveringRequestState(at: string): RequestState {
  return {
    status: "loading",
    lastUpdatedAt: at,
    errorMessage: null
  };
}

export function createErrorWithRetryState(
  at: string,
  errorMessage: string,
  retryCount: number,
  recoveryAction: RecoveryAction
): RequestState {
  return {
    status: "error",
    lastUpdatedAt: at,
    errorMessage,
    recoveryAction,
    retryCount
  };
}

export function createStreamingRequestState(at: string): RequestState {
  return {
    status: "streaming",
    lastUpdatedAt: at,
    errorMessage: null
  };
}
