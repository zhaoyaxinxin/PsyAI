import type { CounselingFinishRequest, CounselingTurn } from "@psyai/contracts";

import type {
  CounselingRiskEscalationLevel,
  CounselingSession,
  CounselingStageSnapshot
} from "../session/counseling-session.js";

export interface CounselingReportExcerpt {
  excerptId: string;
  speaker: CounselingTurn["role"];
  content: string;
  notedAt: string;
}

export interface CounselingReportRecommendation {
  recommendationId: string;
  title: string;
  rationale: string;
  priority: "now" | "soon" | "later";
}

export interface CounselingReportSection {
  sectionId: string;
  title: string;
  stage: CounselingStageSnapshot["stage"];
  summary: string;
  riskLevel: CounselingStageSnapshot["riskLevel"];
  escalationLevel: CounselingRiskEscalationLevel;
  keyExcerpts: CounselingReportExcerpt[];
  recommendations: CounselingReportRecommendation[];
  boundaryNotice?: string;
}

export interface CounselingReportRiskSignal {
  signalId: string;
  stage: CounselingStageSnapshot["stage"];
  riskLevel: CounselingStageSnapshot["riskLevel"];
  escalationLevel: CounselingRiskEscalationLevel;
  reason: string;
  detectedAt: string;
  boundaryNotice?: string;
}

export interface CounselingReportInput {
  sessionId: string;
  title: string;
  summary: string;
  overview: {
    concernSummary: string;
    riskLevel: CounselingStageSnapshot["riskLevel"];
    dominantStage: CounselingStageSnapshot["stage"];
    escalationLevel: CounselingRiskEscalationLevel;
    startedAt: string;
    finishedAt?: string;
    finishedReason?: CounselingFinishRequest["reason"];
  };
  sections: CounselingReportSection[];
  riskSignals: CounselingReportRiskSignal[];
  closingNote?: string;
  escalationSummary?: string;
}

function createSectionTitle(snapshot: CounselingStageSnapshot): string {
  return `${snapshot.stage} 阶段整理`;
}

function createRecommendation(
  sessionId: string,
  index: number,
  escalationLevel: CounselingRiskEscalationLevel,
  stage: CounselingStageSnapshot["stage"],
  boundaryNotice?: string
): CounselingReportRecommendation {
  switch (escalationLevel) {
    case "urgent":
      return {
        recommendationId: `csl-rec-${sessionId}-${String(index).padStart(3, "0")}`,
        title: "立即转入人工支持",
        rationale:
          boundaryNotice ??
          `${stage} 阶段已出现紧急风险信号，应立即退出纯 AI 流程并转入人工支持。`,
        priority: "now"
      };
    case "escalate":
      return {
        recommendationId: `csl-rec-${sessionId}-${String(index).padStart(3, "0")}`,
        title: "安排人工跟进",
        rationale:
          boundaryNotice ??
          `${stage} 阶段显示风险已升高，需要安排人工后续跟进。`,
        priority: "now"
      };
    case "monitor":
      return {
        recommendationId: `csl-rec-${sessionId}-${String(index).padStart(3, "0")}`,
        title: "继续追踪触发点与应对变化",
        rationale: `${stage} 阶段建议继续观察强度变化与稳定性变化。`,
        priority: "soon"
      };
    case "none":
    default:
      return {
        recommendationId: `csl-rec-${sessionId}-${String(index).padStart(3, "0")}`,
        title: "继续结构化观察",
        rationale: `${stage} 阶段可以继续进行常规观察、整理与反思。`,
        priority: "later"
      };
  }
}

function createKeyExcerpts(
  session: CounselingSession,
  snapshot: CounselingStageSnapshot,
  snapshotIndex: number
): CounselingReportExcerpt[] {
  const turnsById = new Map(session.turns.map((turn) => [turn.turnId, turn]));
  const excerpts = snapshot.turnIds
    .map((turnId, turnIndex) => {
      const turn = turnsById.get(turnId);

      if (!turn) {
        return null;
      }

      return {
        excerptId: `csl-excerpt-${session.sessionId}-${String(snapshotIndex + 1).padStart(3, "0")}-${String(turnIndex + 1).padStart(2, "0")}`,
        speaker: turn.role,
        content: turn.content,
        notedAt: turn.createdAt
      };
    })
    .filter((item): item is CounselingReportExcerpt => item !== null);

  if (excerpts.length > 0) {
    return excerpts;
  }

  const fallbackTurn = session.turns[session.turns.length - 1];
  if (!fallbackTurn) {
    return [];
  }

  return [
    {
      excerptId: `csl-excerpt-${session.sessionId}-${String(snapshotIndex + 1).padStart(3, "0")}-fallback`,
      speaker: fallbackTurn.role,
      content: fallbackTurn.content,
      notedAt: fallbackTurn.createdAt
    }
  ];
}

function toCounselingReportSection(
  session: CounselingSession,
  snapshot: CounselingStageSnapshot,
  index: number
): CounselingReportSection {
  return {
    sectionId: `csl-section-${session.sessionId}-${String(index + 1).padStart(3, "0")}`,
    title: createSectionTitle(snapshot),
    stage: snapshot.stage,
    summary: snapshot.summary,
    riskLevel: snapshot.riskLevel,
    escalationLevel: snapshot.riskSignal.escalationLevel,
    keyExcerpts: createKeyExcerpts(session, snapshot, index),
    recommendations: [
      createRecommendation(
        session.sessionId,
        index + 1,
        snapshot.riskSignal.escalationLevel,
        snapshot.stage,
        snapshot.riskSignal.boundaryNotice
      )
    ],
    ...(snapshot.riskSignal.boundaryNotice
      ? { boundaryNotice: snapshot.riskSignal.boundaryNotice }
      : {})
  };
}

function createClosingNote(session: CounselingSession): string | undefined {
  const latestBoundaryNotice = [...session.stageSnapshots]
    .reverse()
    .find((snapshot) => snapshot.riskSignal.boundaryNotice)?.riskSignal.boundaryNotice;

  if (latestBoundaryNotice) {
    return latestBoundaryNotice;
  }

  return session.finishedReason === "handoff_requested"
    ? "本次会话以转交人工的方式结束，后续应由专业人员继续跟进。"
    : undefined;
}

export function toCounselingReportInput(
  session: CounselingSession
): CounselingReportInput {
  const latestSnapshot =
    session.stageSnapshots[session.stageSnapshots.length - 1] ??
    session.stageSnapshots[0];
  const dominantStage = latestSnapshot?.stage ?? "intake";
  const riskLevel = latestSnapshot?.riskLevel ?? session.latestAnalysis?.riskLevel ?? "low";
  const summary = session.latestAnalysis?.summary ?? "咨询摘要暂未生成。";
  const escalationLevel = latestSnapshot?.riskSignal?.escalationLevel ?? "none";
  const closingNote = createClosingNote(session);
  const escalationSummary =
    escalationLevel !== "none"
      ? `当前会话的风险升级等级为 ${escalationLevel}，需要继续观察并视情况跟进。`
      : undefined;

  return {
    sessionId: session.sessionId,
    title: `咨询报告 ${session.sessionId}`,
    summary,
    overview: {
      concernSummary: summary,
      riskLevel,
      dominantStage,
      escalationLevel,
      startedAt: session.createdAt,
      ...(session.finishedAt ? { finishedAt: session.finishedAt } : {}),
      ...(session.finishedReason ? { finishedReason: session.finishedReason } : {})
    },
    sections: session.stageSnapshots.map((snapshot, index) =>
      toCounselingReportSection(session, snapshot, index)
    ),
    riskSignals: session.stageSnapshots.map((snapshot) => ({
      signalId: snapshot.riskSignal.signalId,
      stage: snapshot.stage,
      riskLevel: snapshot.riskLevel,
      escalationLevel: snapshot.riskSignal.escalationLevel,
      reason: snapshot.riskSignal.reason,
      detectedAt: snapshot.riskSignal.detectedAt,
      ...(snapshot.riskSignal.boundaryNotice
        ? { boundaryNotice: snapshot.riskSignal.boundaryNotice }
        : {})
    })),
    ...(closingNote ? { closingNote } : {}),
    ...(escalationSummary ? { escalationSummary } : {})
  };
}
