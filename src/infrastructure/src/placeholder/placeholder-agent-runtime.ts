import type {
  AgentEnvironmentSnapshotLike,
  AgentRunInputLike,
  AgentRunOutputLike,
  AgentRuntimeLike,
  EnvironmentAgentRunInputLike,
  EnvironmentAgentRunOutputLike,
  MultiAgentRunInputLike,
  MultiAgentRunOutputLike,
  RuntimeWorkflowKindLike
} from "../compatibility.js";

export interface PlaceholderAgentRuntimeOptions {
  providerLabel?: string;
  defaultAction?: string;
}

function summarizePrompt(promptKey?: string): string {
  return promptKey ? `prompt:${promptKey}` : "prompt:none";
}

function computeUsageUnit(value: string): number {
  return Math.max(1, Math.ceil(value.trim().length / 8));
}

function buildAnnotation(label: string, value: string): { label: string; value: string } {
  return { label, value };
}

function chooseEnvironmentAction(
  environment: AgentEnvironmentSnapshotLike,
  defaultAction: string
): string {
  if (environment.availableActions.includes(defaultAction)) {
    return defaultAction;
  }

  return environment.availableActions[0] ?? defaultAction;
}

function buildReplyLabel(workflow: RuntimeWorkflowKindLike, promptKey?: string): string {
  return `[placeholder:${workflow}:${promptKey ?? "default"}]`;
}

export class PlaceholderAgentRuntime implements AgentRuntimeLike {
  readonly #providerLabel: string;
  readonly #defaultAction: string;

  constructor(options: PlaceholderAgentRuntimeOptions = {}) {
    this.#providerLabel = options.providerLabel ?? "local-placeholder";
    this.#defaultAction = options.defaultAction ?? "observe";
  }

  async run(input: AgentRunInputLike): Promise<AgentRunOutputLike> {
    const promptKey = input.prompt?.promptKey;
    const userText = input.messages.at(-1)?.content ?? input.objective;
    const finalContent = `${buildReplyLabel(input.context.workflow, promptKey)} ${userText}`;

    return {
      finalMessage: {
        role: "assistant",
        content: finalContent
      },
      toolCalls: (input.tools ?? []).map((tool) => ({
        toolName: tool.name,
        inputSummary: `placeholder-call:${tool.name}`
      })),
      annotations: [
        buildAnnotation("provider", this.#providerLabel),
        buildAnnotation("workflow", input.context.workflow),
        buildAnnotation("prompt", summarizePrompt(promptKey))
      ],
      usage: {
        inputUnits: computeUsageUnit(
          `${input.objective} ${input.messages.map((message) => message.content).join(" ")}`
        ),
        outputUnits: computeUsageUnit(finalContent)
      },
      rawOutput: {
        provider: this.#providerLabel,
        agentId: input.agentId
      }
    };
  }

  async runMultiAgent(input: MultiAgentRunInputLike): Promise<MultiAgentRunOutputLike> {
    const participantMessages = input.participants.map((participant) => ({
      role: "assistant" as const,
      name: participant.agentId,
      content: `${buildReplyLabel(input.context.workflow, input.sharedPrompt?.promptKey)} ${participant.role}: ${participant.objective}`
    }));

    const coordinatorMessage = {
      role: "assistant" as const,
      content: `[placeholder:multi:${input.context.workflow}] coordinated ${input.participants.length} participants`
    };

    return {
      coordinatorMessage,
      participantMessages,
      annotations: [
        buildAnnotation("provider", this.#providerLabel),
        buildAnnotation("swarmId", input.swarmId)
      ],
      usage: {
        inputUnits: computeUsageUnit(input.objective),
        outputUnits: computeUsageUnit(
          coordinatorMessage.content +
            participantMessages.map((message) => message.content).join(" ")
        )
      },
      rawOutput: {
        provider: this.#providerLabel,
        participantCount: input.participants.length
      }
    };
  }

  async runInEnvironment(
    input: EnvironmentAgentRunInputLike
  ): Promise<EnvironmentAgentRunOutputLike> {
    const chosenAction = chooseEnvironmentAction(input.environment, this.#defaultAction);
    const content = `${buildReplyLabel(input.context.workflow, input.prompt?.promptKey)} choose:${chosenAction}`;

    return {
      finalMessage: {
        role: "assistant",
        content
      },
      chosenAction,
      annotations: [
        buildAnnotation("provider", this.#providerLabel),
        buildAnnotation("scene", input.environment.scene)
      ],
      usage: {
        inputUnits: computeUsageUnit(
          `${input.objective} ${input.environment.observedSignals.join(" ")}`
        ),
        outputUnits: computeUsageUnit(content)
      },
      rawOutput: {
        provider: this.#providerLabel,
        chosenAction
      }
    };
  }
}
