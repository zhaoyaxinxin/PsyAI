import {
  type AgentEnvironmentSnapshot,
  type AgentMessage,
  type AgentRunInput,
  type AgentRunOutput,
  type AgentRuntime,
  type EnvironmentAgentRunInput,
  type EnvironmentAgentRunOutput,
  type MultiAgentRunInput,
  type MultiAgentRunOutput
} from "../agent/agent-runtime.js";

function summarizeMessages(messages: AgentMessage[]): string {
  const lastMessage = messages[messages.length - 1];
  return lastMessage ? lastMessage.content : "no user messages were provided";
}

function countUnits(values: string[]): number {
  return values.reduce((total, value) => total + value.length, 0);
}

function chooseAction(environment: AgentEnvironmentSnapshot): string {
  return environment.availableActions[0] ?? "observe";
}

export class FakeAgentRuntime implements AgentRuntime {
  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    const summary = summarizeMessages(input.messages);
    const promptKey = input.prompt?.promptKey ?? "none";

    return {
      finalMessage: {
        role: "assistant",
        content: `[fake:${input.context.workflow}:${promptKey}] ${summary}`
      },
      toolCalls: input.tools
        ? input.tools.map((tool) => ({
            toolName: tool.name,
            inputSummary: `available:${tool.name}`
          }))
        : [],
      annotations: [
        {
          label: "objective",
          value: input.objective
        }
      ],
      usage: {
        inputUnits: countUnits(input.messages.map((message) => message.content)),
        outputUnits: summary.length
      },
      rawOutput: {
        agentId: input.agentId,
        workflow: input.context.workflow
      }
    };
  }

  async runMultiAgent(input: MultiAgentRunInput): Promise<MultiAgentRunOutput> {
    const participantMessages = input.participants.map((participant) => ({
      role: "assistant" as const,
      content: `[fake:${participant.agentId}] ${participant.objective}`
    }));

    return {
      coordinatorMessage: {
        role: "assistant",
        content: `[fake:multi:${input.context.workflow}] ${input.objective}`
      },
      participantMessages,
      annotations: [
        {
          label: "participants",
          value: String(input.participants.length)
        }
      ],
      usage: {
        inputUnits: countUnits(input.messages.map((message) => message.content)),
        outputUnits: countUnits(participantMessages.map((message) => message.content))
      },
      rawOutput: {
        swarmId: input.swarmId,
        sharedPrompt: input.sharedPrompt?.promptKey ?? null
      }
    };
  }

  async runInEnvironment(input: EnvironmentAgentRunInput): Promise<EnvironmentAgentRunOutput> {
    const chosenAction = chooseAction(input.environment);

    return {
      finalMessage: {
        role: "assistant",
        content: `[fake:env:${input.context.workflow}] act=${chosenAction}`
      },
      chosenAction,
      annotations: [
        {
          label: "scene",
          value: input.environment.scene
        }
      ],
      usage: {
        inputUnits: countUnits(input.messages.map((message) => message.content)),
        outputUnits: chosenAction.length
      },
      rawOutput: {
        observedSignals: [...input.environment.observedSignals]
      }
    };
  }
}
