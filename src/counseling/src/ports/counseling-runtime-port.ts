import type { CounselingAnalysis, CounselingTurn } from "@psyai/contracts";

export interface CounselingRuntimeStartInput {
  openingMessage: string;
  userContext: string[];
  occurredAt: string;
}

export interface CounselingRuntimeReplyInput {
  message: string;
  history: CounselingTurn[];
  latestAnalysis?: CounselingAnalysis;
  occurredAt: string;
}

export interface CounselingRuntimeStartOutput {
  analysis: CounselingAnalysis;
}

export interface CounselingRuntimeReplyOutput {
  analysis: CounselingAnalysis;
  assistantMessage: string;
}

export interface CounselingRuntimePort {
  start(input: CounselingRuntimeStartInput): Promise<CounselingRuntimeStartOutput>;
  reply(input: CounselingRuntimeReplyInput): Promise<CounselingRuntimeReplyOutput>;
}
