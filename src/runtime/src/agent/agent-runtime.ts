import type { RuntimeAnnotation, RuntimeExecutionContext } from "../common.js";
import type { PromptAssetSelection } from "../prompt/prompt-asset.js";
import type { RuntimeFailure } from "../provider/runtime-failure.js";

export type AgentMessageRole = "system" | "user" | "assistant" | "tool";

export interface AgentMessage {
  role: AgentMessageRole;
  content: string;
  name?: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
}

export interface AgentToolCall {
  toolName: string;
  inputSummary: string;
}

export interface AgentUsage {
  inputUnits: number;
  outputUnits: number;
}

export interface AgentRunInput {
  agentId: string;
  objective: string;
  messages: AgentMessage[];
  context: RuntimeExecutionContext;
  prompt?: PromptAssetSelection;
  tools?: AgentToolDefinition[];
}

export interface AgentParticipant {
  agentId: string;
  role: string;
  objective: string;
}

export interface MultiAgentRunInput {
  swarmId: string;
  objective: string;
  participants: AgentParticipant[];
  messages: AgentMessage[];
  context: RuntimeExecutionContext;
  sharedPrompt?: PromptAssetSelection;
}

export interface AgentEnvironmentSnapshot {
  scene: string;
  observedSignals: string[];
  availableActions: string[];
}

export interface EnvironmentAgentRunInput {
  agentId: string;
  objective: string;
  environment: AgentEnvironmentSnapshot;
  messages: AgentMessage[];
  context: RuntimeExecutionContext;
  prompt?: PromptAssetSelection;
}

export interface AgentRunOutput {
  finalMessage: AgentMessage;
  toolCalls: AgentToolCall[];
  annotations: RuntimeAnnotation[];
  usage: AgentUsage;
  rawOutput: unknown;
}

export interface MultiAgentRunOutput {
  coordinatorMessage: AgentMessage;
  participantMessages: AgentMessage[];
  annotations: RuntimeAnnotation[];
  usage: AgentUsage;
  rawOutput: unknown;
}

export interface EnvironmentAgentRunOutput {
  finalMessage: AgentMessage;
  chosenAction: string;
  annotations: RuntimeAnnotation[];
  usage: AgentUsage;
  rawOutput: unknown;
}

export interface AgentRuntime {
  run(input: AgentRunInput): Promise<AgentRunOutput>;
  runMultiAgent(input: MultiAgentRunInput): Promise<MultiAgentRunOutput>;
  runInEnvironment(input: EnvironmentAgentRunInput): Promise<EnvironmentAgentRunOutput>;
}

// ── Streaming (task6 / M10-T005) ───────────────────────────────────

export type AgentRunStreamEvent =
  | { type: "token"; content: string }
  | { type: "tool_call"; toolName: string; inputSummary: string }
  | { type: "done"; usage: AgentUsage }
  | { type: "error"; failure: RuntimeFailure };

/**
 * Streaming variant of AgentRuntime.
 * Implementations yield events as the provider streams tokens.
 * Consumers iterate with `for await (const event of runtime.runStream(input))`.
 */
export interface StreamingAgentRuntime {
  runStream(input: AgentRunInput): AsyncIterable<AgentRunStreamEvent>;
}
