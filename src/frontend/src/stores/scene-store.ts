import type { AppBootstrapState } from "@psyai/app-state";

import {
  createInitialSceneFromBootstrapState,
  createSceneCoordinator,
  type FrontendSceneRoute,
  type SceneCoordinatorState
} from "../scenes/scene-coordinator.js";
import { createStoreContainer, type StoreContainer } from "./store-core.js";

export interface SceneStoreState {
  bootstrapState: AppBootstrapState;
  coordinator: SceneCoordinatorState;
}

export interface SceneStore {
  getState(): SceneStoreState;
  subscribe: StoreContainer<SceneStoreState>["subscribe"];
  navigate(route: FrontendSceneRoute, reason?: string, occurredAt?: string): SceneStoreState;
  back(reason?: string, occurredAt?: string): SceneStoreState;
  syncBootstrapState(nextBootstrapState: AppBootstrapState, occurredAt?: string): SceneStoreState;
}

export function createSceneStore(bootstrapState: AppBootstrapState): SceneStore {
  const coordinator = createSceneCoordinator(createInitialSceneFromBootstrapState(bootstrapState));
  const store = createStoreContainer<SceneStoreState>({
    bootstrapState,
    coordinator: coordinator.getState()
  });

  return {
    getState() {
      return store.getState();
    },
    subscribe: store.subscribe,
    navigate(route, reason = "navigate", occurredAt = "1970-01-01T00:00:00+00:00") {
      const coordinatorState = coordinator.navigate(route, { reason, occurredAt });
      return store.setState((current) => ({
        ...current,
        coordinator: coordinatorState
      }));
    },
    back(reason = "back", occurredAt = "1970-01-01T00:00:00+00:00") {
      const coordinatorState = coordinator.back(reason, occurredAt);
      return store.setState((current) => ({
        ...current,
        coordinator: coordinatorState
      }));
    },
    syncBootstrapState(nextBootstrapState, occurredAt = "1970-01-01T00:00:00+00:00") {
      const nextRoute = createInitialSceneFromBootstrapState(nextBootstrapState);
      const coordinatorState = coordinator.reset(nextRoute, "sync-bootstrap", occurredAt);

      return store.setState({
        bootstrapState: nextBootstrapState,
        coordinator: coordinatorState
      });
    }
  };
}
