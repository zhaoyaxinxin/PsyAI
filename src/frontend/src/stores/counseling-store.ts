import type {
  CounselingGetResponse,
  CounselingReportResponse,
  CounselingReplyRequest,
  CounselingStartRequest
} from "@psyai/contracts";

import type { CounselingApiClient } from "../api/transport.js";
import {
  createErrorRequestState,
  createIdleRequestState,
  createLoadingRequestState,
  createReadyRequestState,
  createStoreContainer,
  createStreamingRequestState,
  type RequestState,
  type StoreContainer
} from "./store-core.js";
import {
  mapCounselingSessionToConversationView,
  type CounselingConversationViewModel,
  type CounselingSessionWithTurns
} from "../widgets/counseling-adapter.js";

export interface CounselingStoreState {
  session: CounselingSessionWithTurns | null;
  reportStatus: CounselingReportResponse["data"] | null;
  conversationView: CounselingConversationViewModel | null;
  request: RequestState;
}

export interface CounselingStore {
  getState(): CounselingStoreState;
  subscribe: StoreContainer<CounselingStoreState>["subscribe"];
  start(request: CounselingStartRequest, occurredAt?: string): Promise<CounselingStoreState>;
  reply(request: CounselingReplyRequest, occurredAt?: string): Promise<CounselingStoreState>;
  /** Consume a streaming token source and update the conversation view incrementally. */
  replyStream(sessionId: string, stream: AsyncIterable<{ content?: string }>, occurredAt?: string): Promise<CounselingStoreState>;
  refresh(sessionId: string, occurredAt?: string): Promise<CounselingStoreState>;
  finish(sessionId: string, occurredAt?: string): Promise<CounselingStoreState>;
  loadReportStatus(sessionId: string, occurredAt?: string): Promise<CounselingStoreState>;
}

function createStateFromSession(
  session: CounselingSessionWithTurns,
  reportStatus: CounselingReportResponse["data"] | null,
  occurredAt: string
): CounselingStoreState {
  return {
    session,
    reportStatus,
    conversationView: mapCounselingSessionToConversationView(session, reportStatus?.ready ?? false),
    request: createReadyRequestState(occurredAt)
  };
}

export function createCounselingStore(client: CounselingApiClient): CounselingStore {
  const store = createStoreContainer<CounselingStoreState>({
    session: null,
    reportStatus: null,
    conversationView: null,
    request: createIdleRequestState()
  });

  async function runWithState<TValue>(
    occurredAt: string,
    action: () => Promise<TValue>,
    onSuccess: (value: TValue) => CounselingStoreState
  ): Promise<CounselingStoreState> {
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
          error instanceof Error ? error.message : "unknown counseling store error"
        )
      }));
    }
  }

  return {
    getState() {
      return store.getState();
    },
    subscribe: store.subscribe,
    start(request, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        () => client.start(request),
        (response) => createStateFromSession(response.data, null, occurredAt)
      );
    },
    reply(request, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        async () => {
          await client.reply(request);
          return client.get({ sessionId: request.sessionId });
        },
        (response: CounselingGetResponse) =>
          createStateFromSession(response.data, store.getState().reportStatus, occurredAt)
      );
    },
    refresh(sessionId, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        () => client.get({ sessionId }),
        (response) => createStateFromSession(response.data, store.getState().reportStatus, occurredAt)
      );
    },
    finish(sessionId, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        () => client.finish({ sessionId, reason: "user_completed" }),
        (response) => {
          const current = store.getState();
          const reportStatus = response.data.reportReference
            ? {
                sessionId,
                ready: true,
                reportReference: response.data.reportReference
              }
            : current.reportStatus;

          return {
            ...current,
            reportStatus,
            conversationView: current.session
              ? mapCounselingSessionToConversationView(current.session, reportStatus?.ready ?? false)
              : null,
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    },
    replyStream(sessionId, stream, occurredAt = "1970-01-01T00:00:00+00:00") {
      store.setState((current) => ({
        ...current,
        request: createStreamingRequestState(occurredAt),
        conversationView: current.conversationView
          ? { ...current.conversationView, streamingMessage: "" }
          : null
      }));

      return (async () => {
        let accumulated = "";

        try {
          for await (const event of stream) {
            if (event.content) {
              accumulated += event.content;
              store.setState((current) => ({
                ...current,
                request: createStreamingRequestState(occurredAt),
                conversationView: current.conversationView
                  ? { ...current.conversationView, streamingMessage: accumulated }
                  : null
              }));
            }
          }

          const refreshed = await client.get({ sessionId });
          const state = createStateFromSession(refreshed.data, store.getState().reportStatus, occurredAt);

          return store.setState({
            ...state,
            conversationView: state.conversationView
              ? { ...state.conversationView, streamingMessage: null }
              : null
          });
        } catch (error) {
          return store.setState((current) => ({
            ...current,
            request: createErrorRequestState(
              occurredAt,
              error instanceof Error ? error.message : "counseling stream error"
            ),
            conversationView: current.conversationView
              ? { ...current.conversationView, streamingMessage: null }
              : null
          }));
        }
      })();
    },

    loadReportStatus(sessionId, occurredAt = "1970-01-01T00:00:00+00:00") {
      return runWithState(
        occurredAt,
        () => client.getReportStatus({ sessionId }),
        (response) => {
          const current = store.getState();
          return {
            ...current,
            reportStatus: response.data,
            conversationView: current.session
              ? mapCounselingSessionToConversationView(current.session, response.data.ready)
              : null,
            request: createReadyRequestState(occurredAt)
          };
        }
      );
    }
  };
}
