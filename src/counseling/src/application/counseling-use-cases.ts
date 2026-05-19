import type {
  CounselingFinishRequest,
  CounselingFinishResponse,
  CounselingGetRequest,
  CounselingGetResponse,
  CounselingReplyRequest,
  CounselingReplyResponse,
  CounselingReportRequest,
  CounselingReportResponse,
  CounselingStartRequest,
  CounselingStartResponse
} from "@psyai/contracts";

import { CounselingSessionNotFoundError } from "../errors.js";
import type { CounselingSessionListQuery, CounselingSessionRepository } from "../ports/counseling-session-repository.js";
import type { CounselingWorkflowAdapter } from "../workflow/counseling-workflow-adapter.js";
import {
  attachCounselingReportInput,
  attachCounselingReportReference,
  appendCounselingReply,
  createCounselingSession,
  finishCounselingSession,
  toCounselingGetData,
  toCounselingReplyData,
  toCounselingStartData,
  type CounselingSession
} from "../session/counseling-session.js";
import type { CounselingReportPort } from "../ports/counseling-report-port.js";
import { toCounselingReportInput } from "../reporting/counseling-report-input.js";

export interface CounselingIdGenerator {
  nextSessionId(): string;
  nextTurnId(): string;
  nextStageSnapshotId?(): string;
  nextRiskSignalId?(): string;
}

export interface CounselingSessionListItem {
  sessionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  riskLevel?: string;
  escalationLevel?: string;
  riskConfirmationRequired: boolean;
  turnCount: number;
}

export interface CounselingUseCases {
  startSession(
    request: CounselingStartRequest,
    occurredAt?: string
  ): Promise<CounselingStartResponse["data"]>;
  replyToSession(
    request: CounselingReplyRequest,
    occurredAt?: string
  ): Promise<CounselingReplyResponse["data"]>;
  finishSession(
    request: CounselingFinishRequest,
    occurredAt?: string
  ): Promise<CounselingFinishResponse["data"]>;
  getSession(
    request: CounselingGetRequest
  ): Promise<CounselingGetResponse["data"]>;
  getReportStatus(
    request: CounselingReportRequest
  ): Promise<CounselingReportResponse["data"]>;
  /** List sessions with optional status filter and pagination. */
  listSessions(query?: CounselingSessionListQuery): Promise<{
    items: CounselingSessionListItem[];
    totalItems: number;
  }>;
  /** Return the most recently active session for resumption, or null. */
  getResumableSession(): Promise<CounselingSessionListItem | null>;
}

export interface CreateCounselingUseCasesOptions {
  repository: CounselingSessionRepository;
  workflow: CounselingWorkflowAdapter;
  reportPort?: CounselingReportPort;
  ids?: CounselingIdGenerator;
  now?: () => string;
}

function createDefaultIdGenerator(): CounselingIdGenerator {
  let sessionCounter = 0;
  let turnCounter = 0;
  let stageSnapshotCounter = 0;
  let riskSignalCounter = 0;

  return {
    nextSessionId() {
      sessionCounter += 1;
      return `csl-session-${String(sessionCounter).padStart(3, "0")}`;
    },
    nextTurnId() {
      turnCounter += 1;
      return `csl-turn-${String(turnCounter).padStart(3, "0")}`;
    },
    nextStageSnapshotId() {
      stageSnapshotCounter += 1;
      return `csl-stage-${String(stageSnapshotCounter).padStart(3, "0")}`;
    },
    nextRiskSignalId() {
      riskSignalCounter += 1;
      return `csl-risk-${String(riskSignalCounter).padStart(3, "0")}`;
    }
  };
}

async function loadSessionOrThrow(
  repository: CounselingSessionRepository,
  sessionId: string
): Promise<CounselingSession> {
  const session = await repository.getById(sessionId);

  if (session === null) {
    throw new CounselingSessionNotFoundError(sessionId);
  }

  return session;
}

export function createCounselingUseCases(
  options: CreateCounselingUseCasesOptions
): CounselingUseCases {
  const ids = options.ids ?? createDefaultIdGenerator();
  const now = options.now ?? (() => new Date().toISOString());
  let fallbackStageSnapshotCounter = 0;
  let fallbackRiskSignalCounter = 0;
  const nextStageSnapshotId = () => {
    if (ids.nextStageSnapshotId) {
      return ids.nextStageSnapshotId();
    }

    fallbackStageSnapshotCounter += 1;
    return `csl-stage-${String(fallbackStageSnapshotCounter).padStart(3, "0")}`;
  };
  const nextRiskSignalId = () => {
    if (ids.nextRiskSignalId) {
      return ids.nextRiskSignalId();
    }

    fallbackRiskSignalCounter += 1;
    return `csl-risk-${String(fallbackRiskSignalCounter).padStart(3, "0")}`;
  };

  return {
    async startSession(request, occurredAt = now()) {
      const workflowResult = await options.workflow.start({
        openingMessage: request.openingMessage,
        userContext: request.userContext ?? [],
        occurredAt
      });

      const session = createCounselingSession({
        sessionId: ids.nextSessionId(),
        openingMessage: request.openingMessage,
        occurredAt,
        createTurnId: () => ids.nextTurnId(),
        createSnapshotId: nextStageSnapshotId,
        createRiskSignalId: nextRiskSignalId,
        initialAnalysis: workflowResult.analysis
      });

      await options.repository.save(session);
      return toCounselingStartData(session);
    },

    async replyToSession(request, occurredAt = now()) {
      const session = await loadSessionOrThrow(options.repository, request.sessionId);
      const workflowResult = await options.workflow.reply(session, request.message, occurredAt);
      const mutation = appendCounselingReply(session, {
        userMessage: request.message,
        assistantMessage: workflowResult.assistantMessage,
        analysis: workflowResult.analysis,
        occurredAt,
        createTurnId: () => ids.nextTurnId(),
        createSnapshotId: nextStageSnapshotId,
        createRiskSignalId: nextRiskSignalId
      });

      await options.repository.save(mutation.session);
      return toCounselingReplyData(mutation.session, mutation.assistantTurn);
    },

    async finishSession(request, occurredAt = now()) {
      const session = await loadSessionOrThrow(options.repository, request.sessionId);
      let finishedSession = finishCounselingSession(session, {
        reason: request.reason,
        occurredAt,
        createSnapshotId: nextStageSnapshotId,
        createRiskSignalId: nextRiskSignalId
      });
      const reportInput = toCounselingReportInput(finishedSession);
      finishedSession = attachCounselingReportInput(finishedSession, reportInput);

      if (options.reportPort) {
        const reportReference = await options.reportPort.createReportReference({
          session: finishedSession,
          reportInput
        });

        if (reportReference) {
          finishedSession = attachCounselingReportReference(
            finishedSession,
            reportReference
          );
        }
      }

      await options.repository.save(finishedSession);

      return {
        sessionId: finishedSession.sessionId,
        status: "finished",
        finishedAt: occurredAt,
        ...(finishedSession.reportReference
          ? { reportReference: finishedSession.reportReference }
          : {})
      };
    },

    async getSession(request) {
      const session = await loadSessionOrThrow(options.repository, request.sessionId);
      return toCounselingGetData(session);
    },

    async getReportStatus(request) {
      const session = await loadSessionOrThrow(options.repository, request.sessionId);

      return {
        sessionId: session.sessionId,
        ready: Boolean(session.reportReference),
        ...(session.reportReference ? { reportReference: session.reportReference } : {})
      };
    },

    async listSessions(query) {
      const result = await options.repository.list(query ?? {});
      return {
        items: result.items.map(toSessionListItem),
        totalItems: result.totalItems
      };
    },

    async getResumableSession() {
      const session = await options.repository.getMostRecentActive();
      if (!session) return null;
      return toSessionListItem(session);
    }
  };
}

function toSessionListItem(session: CounselingSession): CounselingSessionListItem {
  const item: CounselingSessionListItem = {
    sessionId: session.sessionId,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    riskConfirmationRequired: session.riskConfirmationRequired,
    turnCount: session.turns.length
  };
  if (session.latestAnalysis?.riskLevel) item.riskLevel = session.latestAnalysis.riskLevel;
  if (session.escalationSummary?.overallLevel) item.escalationLevel = session.escalationSummary.overallLevel;
  return item;
}
