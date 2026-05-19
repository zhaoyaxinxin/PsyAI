import type { CounselingGetResponse, CounselingStartResponse } from "@psyai/contracts";

export interface ConversationMessageViewModel {
  id: string;
  speaker: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface CounselingConversationViewModel {
  sessionId: string;
  status: string;
  dominantStage: string | null;
  riskLevel: string | null;
  escalationStatus: string | null;
  escalationReason: string | null;
  messages: ConversationMessageViewModel[];
  streamingMessage: string | null;
  reportReady: boolean;
}

export type CounselingSessionWithTurns = CounselingStartResponse["data"] | CounselingGetResponse["data"];

function sanitizeCounselingDisplayText(value: string): string {
  return value
    .replace(/^PsyAI:\s*/gmu, "")
    .replace(/^后续关注[:：]\s*Continue structured observation\s*$/gmu, "")
    .replace(/^Continue structured observation\s*$/gmu, "")
    .replace(/^Can you describe what tends to happen right before that reaction starts\??\s*$/gmu, "你可以再说说，那种反应通常会在什么前一刻开始出现？")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

export function mapCounselingSessionToConversationView(
  session: CounselingSessionWithTurns,
  reportReady = false
): CounselingConversationViewModel {
  return {
    sessionId: session.sessionId,
    status: session.status,
    dominantStage: session.latestAnalysis?.stage ?? null,
    riskLevel: session.latestAnalysis?.riskLevel ?? null,
    escalationStatus: session.latestAnalysis?.escalationResult?.escalationStatus ?? null,
    escalationReason: session.latestAnalysis?.escalationResult?.reason ?? null,
    messages: session.turns.map((turn) => ({
      id: turn.turnId,
      speaker: turn.role,
      content: sanitizeCounselingDisplayText(turn.content),
      createdAt: turn.createdAt
    })),
    streamingMessage: null,
    reportReady
  };
}
