import type { ReportReference } from "@psyai/contracts";

import type { ReportRepository } from "../api/fake-transport.js";
import {
  mapReportToListItem,
  mapReportToShellViewModel,
  type FrontendReportDocument,
  type ReportListItemViewModel,
  type ReportShellViewModel
} from "../reports/report-shell.js";
import {
  createErrorRequestState,
  createIdleRequestState,
  createLoadingRequestState,
  createReadyRequestState,
  createStoreContainer,
  type RequestState,
  type StoreContainer
} from "./store-core.js";

export interface ReportStoreState {
  currentReference: ReportReference | null;
  currentReport: FrontendReportDocument | null;
  shellView: ReportShellViewModel | null;
  history: ReportListItemViewModel[];
  listRequest: RequestState;
  request: RequestState;
}

export interface ReportStore {
  getState(): ReportStoreState;
  subscribe: StoreContainer<ReportStoreState>["subscribe"];
  load(reference: ReportReference, occurredAt?: string): Promise<ReportStoreState>;
  addToHistory(report: FrontendReportDocument): ReportStoreState;
  list(): ReportStoreState;
  clear(): ReportStoreState;
}

export function createReportStore(reportRepository: ReportRepository): ReportStore {
  const store = createStoreContainer<ReportStoreState>({
    currentReference: null,
    currentReport: null,
    shellView: null,
    history: [],
    listRequest: createIdleRequestState(),
    request: createIdleRequestState()
  });

  return {
    getState() {
      return store.getState();
    },
    subscribe: store.subscribe,
    async load(reference, occurredAt = "1970-01-01T00:00:00+00:00") {
      store.setState((current) => ({
        ...current,
        currentReference: reference,
        request: createLoadingRequestState(occurredAt)
      }));

      try {
        const report = await reportRepository.loadByReference(reference);
        const listItem = mapReportToListItem(report);

        return store.setState((current) => {
          const alreadyInHistory = current.history.some(
            (item) => item.reportId === listItem.reportId
          );

          return {
            currentReference: reference,
            currentReport: report,
            shellView: mapReportToShellViewModel(report),
            history: alreadyInHistory ? current.history : [...current.history, listItem],
            listRequest: current.listRequest,
            request: createReadyRequestState(occurredAt)
          };
        });
      } catch (error) {
        return store.setState((current) => ({
          ...current,
          request: createErrorRequestState(
            occurredAt,
            error instanceof Error ? error.message : "unknown report store error"
          )
        }));
      }
    },
    addToHistory(report) {
      const listItem = mapReportToListItem(report);

      return store.setState((current) => {
        const alreadyInHistory = current.history.some(
          (item) => item.reportId === listItem.reportId
        );

        return {
          ...current,
          history: alreadyInHistory ? current.history : [...current.history, listItem]
        };
      });
    },
    list() {
      return store.setState((current) => ({
        ...current,
        listRequest: createReadyRequestState(
          new Date().toISOString()
        )
      }));
    },
    clear() {
      return store.setState({
        currentReference: null,
        currentReport: null,
        shellView: null,
        history: [],
        listRequest: createIdleRequestState(),
        request: createIdleRequestState()
      });
    }
  };
}
