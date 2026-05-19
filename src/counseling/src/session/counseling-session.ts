import type {
  CounselingAnalysis,
  CounselingFinishRequest,
  CounselingGetResponse,
  CounselingStartResponse,
  CounselingReplyResponse,
  CounselingTurn,
  HostBootstrapSummary,
  ReportReference
} from "@psyai/contracts";

import { CounselingSessionStateError } from "../errors.js";
import type { CounselingReportInput } from "../reporting/counseling-report-input.js";

export type CounselingStageSnapshotTrigger = "start" | "reply" | "finish";
export type CounselingRiskEscalationLevel = "none" | "monitor" | "escalate" | "urgent";

export interface CounselingRiskSignal {
  signalId: string;
  sourceRiskLevel: CounselingAnalysis["riskLevel"];
  escalationLevel: CounselingRiskEscalationLevel;
  reason: string;
  detectedAt: string;
  boundaryNotice?: string;
}

export interface CounselingStageSnapshot {
  snapshotId: string;
  stage: CounselingAnalysis["stage"];
  summary: string;
  riskLevel: CounselingAnalysis["riskLevel"];
  trigger: CounselingStageSnapshotTrigger;
  createdAt: string;
  turnIds: string[];
  riskSignal: CounselingRiskSignal;
}

export interface CounselingEscalationSummary {
  overallLevel: CounselingRiskEscalationLevel;
  signalCount: number;
  highestSignalAt: string | null;
  requiresConfirmation: boolean;
  boundaryNotice: string | null;
}

export interface CounselingSession {
  sessionId: string;
  status: CounselingGetResponse["data"]["status"];
  createdAt: string;
  updatedAt: string;
  turns: CounselingTurn[];
  stageSnapshots: CounselingStageSnapshot[];
  latestAnalysis?: CounselingAnalysis;
  finishedAt?: string;
  finishedReason?: CounselingFinishRequest["reason"];
  reportInput?: CounselingReportInput;
  reportReference?: ReportReference;
  escalationSummary?: CounselingEscalationSummary;
  riskConfirmationRequired: boolean;
}

export interface CreateCounselingSessionParams {
  sessionId: string;
  openingMessage: string;
  occurredAt: string;
  createTurnId: () => string;
  createSnapshotId: () => string;
  createRiskSignalId: () => string;
  initialAnalysis?: CounselingAnalysis;
}

export interface AppendCounselingReplyParams {
  userMessage: string;
  assistantMessage: string;
  analysis: CounselingAnalysis;
  occurredAt: string;
  createTurnId: () => string;
  createSnapshotId: () => string;
  createRiskSignalId: () => string;
}

export interface FinishCounselingSessionParams {
  reason: CounselingFinishRequest["reason"];
  occurredAt: string;
  createSnapshotId: () => string;
  createRiskSignalId: () => string;
}

export interface CounselingReplyMutation {
  session: CounselingSession;
  userTurn: CounselingTurn;
  assistantTurn: CounselingTurn;
}

function createRiskSignal(
  analysis: CounselingAnalysis,
  occurredAt: string,
  createRiskSignalId: () => string
): CounselingRiskSignal {
  switch (analysis.riskLevel) {
    case "urgent":
      return {
        signalId: createRiskSignalId(),
        sourceRiskLevel: analysis.riskLevel,
        escalationLevel: "urgent",
        reason: "The latest counseling analysis indicates an urgent safety risk that needs immediate human support.",
        detectedAt: occurredAt,
        boundaryNotice:
          "This conversation cannot replace emergency or crisis support. Escalate to immediate human help."
      };
    case "high":
      return {
        signalId: createRiskSignalId(),
        sourceRiskLevel: analysis.riskLevel,
        escalationLevel: "escalate",
        reason: "The latest counseling analysis indicates elevated risk and a need for supported follow-up.",
        detectedAt: occurredAt,
        boundaryNotice:
          "This conversation should transition toward human follow-up instead of relying on AI alone."
      };
    case "moderate":
      return {
        signalId: createRiskSignalId(),
        sourceRiskLevel: analysis.riskLevel,
        escalationLevel: "monitor",
        reason: "The latest counseling analysis indicates moderate risk that should keep being monitored.",
        detectedAt: occurredAt
      };
    case "low":
    default:
      return {
        signalId: createRiskSignalId(),
        sourceRiskLevel: analysis.riskLevel,
        escalationLevel: "none",
        reason: "The latest counseling analysis does not indicate an elevated risk signal.",
        detectedAt: occurredAt
      };
  }
}

function createStageSnapshot(
  analysis: CounselingAnalysis,
  trigger: CounselingStageSnapshotTrigger,
  occurredAt: string,
  turnIds: string[],
  createSnapshotId: () => string,
  createRiskSignalId: () => string
): CounselingStageSnapshot {
  return {
    snapshotId: createSnapshotId(),
    stage: analysis.stage,
    summary: analysis.summary,
    riskLevel: analysis.riskLevel,
    trigger,
    createdAt: occurredAt,
    turnIds: [...turnIds],
    riskSignal: createRiskSignal(analysis, occurredAt, createRiskSignalId)
  };
}

function createClosingAnalysis(
  session: CounselingSession,
  reason: CounselingFinishRequest["reason"]
): CounselingAnalysis {
  const priorAnalysis = session.latestAnalysis;
  const summaryByReason: Record<CounselingFinishRequest["reason"], string> = {
    user_completed: "The counseling session closed after the user indicated the current conversation was complete.",
    user_cancelled: "The counseling session closed because the user chose to stop the current conversation.",
    handoff_requested:
      "The counseling session closed because the conversation needs a supported human handoff.",
    forced_termination:
      "The counseling session was forcibly terminated due to an urgent risk signal requiring immediate human escalation."
  };

  const derivedRiskLevel =
    reason === "handoff_requested" || reason === "forced_termination"
      ? priorAnalysis?.riskLevel === "urgent"
        ? "urgent"
        : "high"
      : (priorAnalysis?.riskLevel ?? "low");

  return {
    stage: "closure",
    summary: priorAnalysis
      ? `${summaryByReason[reason]} Latest working summary: ${priorAnalysis.summary}`
      : summaryByReason[reason],
    riskLevel: derivedRiskLevel
  };
}

function assertSessionIsActive(session: CounselingSession): void {
  if (session.status !== "active") {
    throw new CounselingSessionStateError("Cannot mutate a finished counseling session");
  }
}

function createTurn(
  role: CounselingTurn["role"],
  content: string,
  occurredAt: string,
  createTurnId: () => string
): CounselingTurn {
  return {
    turnId: createTurnId(),
    role,
    content,
    createdAt: occurredAt
  };
}

export function createCounselingSession(
  params: CreateCounselingSessionParams
): CounselingSession {
  const openingTurn = createTurn("user", params.openingMessage, params.occurredAt, params.createTurnId);
  const stageSnapshots = params.initialAnalysis
    ? [
        createStageSnapshot(
          params.initialAnalysis,
          "start",
          params.occurredAt,
          [openingTurn.turnId],
          params.createSnapshotId,
          params.createRiskSignalId
        )
      ]
    : [];

  const escalationSummary = aggregateEscalationSignals(stageSnapshots);

  return {
    sessionId: params.sessionId,
    status: "active",
    createdAt: params.occurredAt,
    updatedAt: params.occurredAt,
    turns: [openingTurn],
    stageSnapshots,
    riskConfirmationRequired: escalationSummary.requiresConfirmation,
    ...(params.initialAnalysis ? { latestAnalysis: params.initialAnalysis } : {}),
    ...(escalationSummary.signalCount > 0 ? { escalationSummary } : {})
  };
}

export function appendCounselingReply(
  session: CounselingSession,
  params: AppendCounselingReplyParams
): CounselingReplyMutation {
  assertSessionIsActive(session);

  const userTurn = createTurn("user", params.userMessage, params.occurredAt, params.createTurnId);
  const assistantTurn = createTurn(
    "assistant",
    params.assistantMessage,
    params.occurredAt,
    params.createTurnId
  );
  const stageSnapshot = createStageSnapshot(
    params.analysis,
    "reply",
    params.occurredAt,
    [userTurn.turnId, assistantTurn.turnId],
    params.createSnapshotId,
    params.createRiskSignalId
  );

  const nextSnapshots = [...session.stageSnapshots, stageSnapshot];
  const escalationSummary = aggregateEscalationSignals(nextSnapshots);

  return {
    userTurn,
    assistantTurn,
    session: {
      ...session,
      updatedAt: params.occurredAt,
      latestAnalysis: params.analysis,
      turns: [...session.turns, userTurn, assistantTurn],
      stageSnapshots: nextSnapshots,
      riskConfirmationRequired: escalationSummary.requiresConfirmation,
      ...(escalationSummary.signalCount > 0 ? { escalationSummary } : {})
    }
  };
}

export function finishCounselingSession(
  session: CounselingSession,
  params: FinishCounselingSessionParams
): CounselingSession {
  assertSessionIsActive(session);
  const closingAnalysis = createClosingAnalysis(session, params.reason);
  const latestTurnId = session.turns[session.turns.length - 1]?.turnId;
  const closingSnapshot = createStageSnapshot(
    closingAnalysis,
    "finish",
    params.occurredAt,
    latestTurnId ? [latestTurnId] : [],
    params.createSnapshotId,
    params.createRiskSignalId
  );

  const nextSnapshots = [...session.stageSnapshots, closingSnapshot];
  const escalationSummary = aggregateEscalationSignals(nextSnapshots);

  return {
    ...session,
    status: "finished",
    updatedAt: params.occurredAt,
    finishedAt: params.occurredAt,
    finishedReason: params.reason,
    latestAnalysis: closingAnalysis,
    stageSnapshots: nextSnapshots,
    riskConfirmationRequired: escalationSummary.requiresConfirmation,
    ...(escalationSummary.signalCount > 0 ? { escalationSummary } : {})
  };
}

export function attachCounselingReportInput(
  session: CounselingSession,
  reportInput: CounselingReportInput
): CounselingSession {
  return {
    ...session,
    reportInput
  };
}

export function attachCounselingReportReference(
  session: CounselingSession,
  reportReference: ReportReference
): CounselingSession {
  return {
    ...session,
    reportReference
  };
}

export function aggregateEscalationSignals(
  snapshots: CounselingStageSnapshot[]
): CounselingEscalationSummary {
  const signals = snapshots.map((s) => s.riskSignal);
  if (signals.length === 0) {
    return {
      overallLevel: "none",
      signalCount: 0,
      highestSignalAt: null,
      requiresConfirmation: false,
      boundaryNotice: null
    };
  }

  const levelPriority: Record<CounselingRiskEscalationLevel, number> = {
    none: 0,
    monitor: 1,
    escalate: 2,
    urgent: 3
  };

  let overallLevel: CounselingRiskEscalationLevel = "none";
  let highestSignalAt: string | null = null;
  const boundaryNotices: string[] = [];

  for (const signal of signals) {
    if (levelPriority[signal.escalationLevel] > levelPriority[overallLevel]) {
      overallLevel = signal.escalationLevel;
      highestSignalAt = signal.detectedAt;
    }
    if (signal.boundaryNotice) {
      boundaryNotices.push(signal.boundaryNotice);
    }
  }

  const requiresConfirmation =
    overallLevel === "escalate" || overallLevel === "urgent";

  return {
    overallLevel,
    signalCount: signals.length,
    highestSignalAt,
    requiresConfirmation,
    boundaryNotice: boundaryNotices.length > 0 ? boundaryNotices[boundaryNotices.length - 1] ?? null : null
  };
}

export function toCounselingGetData(
  session: CounselingSession
): CounselingGetResponse["data"] {
  return {
    sessionId: session.sessionId,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    turns: [...session.turns],
    ...(session.latestAnalysis ? { latestAnalysis: session.latestAnalysis } : {}),
    ...(session.reportReference ? { reportReference: session.reportReference } : {})
  };
}

export function toCounselingStartData(
  session: CounselingSession
): CounselingStartResponse["data"] {
  return {
    ...toCounselingGetData(session),
    bootstrap: createCounselingBootstrapSummary(),
    turns: [...session.turns]
  };
}

export function toCounselingReplyData(
  session: CounselingSession,
  assistantTurn: CounselingTurn
): CounselingReplyResponse["data"] {
  return {
    sessionId: session.sessionId,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    reply: assistantTurn,
    ...(session.latestAnalysis ? { latestAnalysis: session.latestAnalysis } : {}),
    ...(session.reportReference ? { reportReference: session.reportReference } : {})
  };
}

function createCounselingBootstrapSummary(): HostBootstrapSummary {
  return {
    ready: true,
    workflow: "counseling",
    scene: "focus"
  };
}
