import type {
  SimulationAdvanceRequest,
  SimulationAdvanceResponse,
  SimulationFinishResponse,
  SimulationNodeResponse,
  SimulationPrepareRequest,
  SimulationPrepareResponse,
  SimulationReportResponse,
  SimulationRunRequest,
  SimulationScenarioResponse
} from "@psyai/contracts";

import type { SimulationApiClient } from "../api/transport.js";
import {
  createErrorRequestState,
  createIdleRequestState,
  createLoadingRequestState,
  createReadyRequestState,
  createStoreContainer,
  type RequestState,
  type StoreContainer
} from "./store-core.js";
import { mapSimulationRouteToView, type SimulationRouteViewModel } from "../widgets/simulation-adapter.js";

type SimulationNodeEnvelope = SimulationNodeResponse["data"] | SimulationAdvanceResponse["data"] | null;
type SimulationPreparationEnvelope = SimulationPrepareResponse["data"] | null;

export interface SimulationStoreState {
  scenario: SimulationScenarioResponse["data"] | null;
  preparation: SimulationPreparationEnvelope;
  run: SimulationNodeEnvelope;
  reportStatus: SimulationReportResponse["data"] | null;
  routeView: SimulationRouteViewModel | null;
  request: RequestState;
}

export interface SimulationStore {
  getState(): SimulationStoreState;
  subscribe: StoreContainer<SimulationStoreState>["subscribe"];
  loadScenario(scenarioId: string, occurredAt?: string): Promise<SimulationStoreState>;
  prepare(request: SimulationPrepareRequest, occurredAt?: string): Promise<SimulationStoreState>;
  startRun(request: SimulationRunRequest, occurredAt?: string): Promise<SimulationStoreState>;
  refreshNode(runId: string, occurredAt?: string): Promise<SimulationStoreState>;
  advance(request: SimulationAdvanceRequest, occurredAt?: string): Promise<SimulationStoreState>;
  finish(runId: string, occurredAt?: string): Promise<SimulationStoreState>;
  loadReportStatus(runId: string, occurredAt?: string): Promise<SimulationStoreState>;
}

function buildRouteView(
  scenario: SimulationScenarioResponse["data"] | null,
  preparation: SimulationPreparationEnvelope,
  run: SimulationNodeEnvelope,
  reportReady: boolean
): SimulationRouteViewModel | null {
  if (!scenario) {
    return null;
  }

  return mapSimulationRouteToView(scenario, preparation, run, reportReady);
}

export function createSimulationStore(client: SimulationApiClient): SimulationStore {
  const store = createStoreContainer<SimulationStoreState>({
    scenario: null,
    preparation: null,
    run: null,
    reportStatus: null,
    routeView: null,
    request: createIdleRequestState()
  });

  function getInFlightState(): SimulationStoreState | null {
    const current = store.getState();
    return current.request.status === "loading" || current.request.status === "streaming"
      ? current
      : null;
  }

  async function runWithState<TValue>(
    occurredAt: string,
    action: () => Promise<TValue>,
    onSuccess: (value: TValue) => SimulationStoreState
  ): Promise<SimulationStoreState> {
    store.setState((current) => ({
      ...current,
      request: createLoadingRequestState(occurredAt)
    }));

    try {
      const value = await action();
      return store.setState(onSuccess(value));
    } catch (error) {
      return store.setState((current) => ({
        ...current,
        request: createErrorRequestState(
          occurredAt,
          error instanceof Error ? error.message : "unknown simulation store error"
        )
      }));
    }
  }

  return {
    getState() {
      return store.getState();
    },
    subscribe: store.subscribe,
    loadScenario(scenarioId, occurredAt = "1970-01-01T00:00:00+00:00") {
      const inFlightState = getInFlightState();
      if (inFlightState) {
        return Promise.resolve(inFlightState);
      }
      return runWithState(
        occurredAt,
        () => client.getScenario({ scenarioId }),
        (response) => {
          const current = store.getState();
          return {
            ...current,
            scenario: response.data,
            routeView: buildRouteView(
              response.data,
              current.preparation,
              current.run,
              current.reportStatus?.ready ?? false
            ),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    prepare(request, occurredAt = "1970-01-01T00:00:00+00:00") {
      const inFlightState = getInFlightState();
      if (inFlightState) {
        return Promise.resolve(inFlightState);
      }
      return runWithState(
        occurredAt,
        () => client.prepare(request),
        (response) => {
          const current = store.getState();
          return {
            ...current,
            preparation: response.data,
            run: null,
            reportStatus: null,
            routeView: buildRouteView(current.scenario, response.data, null, false),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    startRun(request, occurredAt = "1970-01-01T00:00:00+00:00") {
      const inFlightState = getInFlightState();
      if (inFlightState) {
        return Promise.resolve(inFlightState);
      }
      return runWithState(
        occurredAt,
        () => client.startRun(request),
        (response) => {
          const current = store.getState();
          return {
            ...current,
            preparation:
              current.preparation && current.preparation.prepareId === response.data.prepareId
                ? current.preparation
                : current.preparation,
            run: response.data,
            routeView: buildRouteView(
              current.scenario,
              current.preparation,
              response.data,
              current.reportStatus?.ready ?? false
            ),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    refreshNode(runId, occurredAt = "1970-01-01T00:00:00+00:00") {
      const inFlightState = getInFlightState();
      if (inFlightState) {
        return Promise.resolve(inFlightState);
      }
      return runWithState(
        occurredAt,
        () => client.getNode({ runId }),
        (response) => {
          const current = store.getState();
          return {
            ...current,
            run: response.data,
            routeView: buildRouteView(
              current.scenario,
              current.preparation,
              response.data,
              current.reportStatus?.ready ?? false
            ),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    advance(request, occurredAt = "1970-01-01T00:00:00+00:00") {
      const inFlightState = getInFlightState();
      if (inFlightState) {
        return Promise.resolve(inFlightState);
      }
      return runWithState(
        occurredAt,
        () => client.advance(request),
        (response) => {
          const current = store.getState();
          const reportStatus = response.data.reportReference
            ? {
                runId: response.data.runId,
                ready: true,
                reportReference: response.data.reportReference
              }
            : current.reportStatus;

          return {
            ...current,
            run: response.data,
            reportStatus,
            routeView: buildRouteView(
              current.scenario,
              current.preparation,
              response.data,
              reportStatus?.ready ?? false
            ),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    finish(runId, occurredAt = "1970-01-01T00:00:00+00:00") {
      const inFlightState = getInFlightState();
      if (inFlightState) {
        return Promise.resolve(inFlightState);
      }
      return runWithState(
        occurredAt,
        () => client.finish({ runId, reason: "user_completed" }),
        (response: SimulationFinishResponse) => {
          const current = store.getState();
          const nextRun = current.run
            ? {
                ...current.run,
                status: response.data.status,
                stage: response.data.status === "completed" ? "completed" : current.run.stage,
                updatedAt: response.data.finishedAt,
                ...(response.data.reportReference ? { reportReference: response.data.reportReference } : {})
              }
            : current.run;
          const reportStatus = response.data.reportReference
            ? {
                runId: response.data.runId,
                ready: true,
                reportReference: response.data.reportReference
              }
            : current.reportStatus;

          return {
            ...current,
            run: nextRun,
            reportStatus,
            routeView: buildRouteView(
              current.scenario,
              current.preparation,
              nextRun,
              reportStatus?.ready ?? false
            ),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    loadReportStatus(runId, occurredAt = "1970-01-01T00:00:00+00:00") {
      const inFlightState = getInFlightState();
      if (inFlightState) {
        return Promise.resolve(inFlightState);
      }
      return runWithState(
        occurredAt,
        () => client.getReportStatus({ runId }),
        (response) => {
          const current = store.getState();
          return {
            ...current,
            reportStatus: response.data,
            routeView: buildRouteView(
              current.scenario,
              current.preparation,
              current.run,
              response.data.ready
            ),
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    }
  };
}
