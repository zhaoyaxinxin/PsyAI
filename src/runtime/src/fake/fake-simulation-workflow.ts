import type { AgentRuntime } from "../agent/agent-runtime.js";
import type { AnalysisNormalizer } from "../normalization/analysis-normalizer.js";
import { renderPromptTemplate, type PromptAssetLoader, type PromptAssetSelection } from "../prompt/prompt-asset.js";
import type {
  SimulationActorState,
  SimulationWorkflowAdvanceInput,
  SimulationWorkflowOutput,
  SimulationWorkflowRuntime,
  SimulationWorkflowStartInput
} from "../workflow/simulation-runtime.js";

const SIMULATION_START_PROMPT: PromptAssetSelection = {
  packId: "simulation-core",
  version: "v1",
  promptKey: "start"
};

const SIMULATION_ADVANCE_PROMPT: PromptAssetSelection = {
  packId: "simulation-core",
  version: "v1",
  promptKey: "advance"
};

function evolveActorStates(
  actorStates: SimulationActorState[],
  suffix: string
): SimulationActorState[] {
  return actorStates.map((actorState) => ({
    ...actorState,
    currentState: `${actorState.currentState} -> ${suffix}`
  }));
}

export interface CreateFakeSimulationWorkflowOptions {
  agentRuntime: AgentRuntime;
  promptLoader: PromptAssetLoader;
  normalizer: AnalysisNormalizer;
}

export class FakeSimulationWorkflow implements SimulationWorkflowRuntime {
  readonly #agentRuntime: AgentRuntime;
  readonly #promptLoader: PromptAssetLoader;
  readonly #normalizer: AnalysisNormalizer;

  constructor(options: CreateFakeSimulationWorkflowOptions) {
    this.#agentRuntime = options.agentRuntime;
    this.#promptLoader = options.promptLoader;
    this.#normalizer = options.normalizer;
  }

  async start(input: SimulationWorkflowStartInput): Promise<SimulationWorkflowOutput> {
    const prompt = await this.#promptLoader.loadPromptTemplate(SIMULATION_START_PROMPT);
    const systemMessage = renderPromptTemplate(prompt, {
      currentNodeTitle: input.currentNodeTitle,
      scenarioTitle: input.scenarioTitle
    });
    const agentResult = await this.#agentRuntime.runMultiAgent({
      swarmId: `${input.scenarioId}-start`,
      objective: "Initialize the simulation route state.",
      participants: input.actorStates.map((actorState) => ({
        agentId: actorState.actorId,
        role: actorState.actorName,
        objective: actorState.currentState
      })),
      messages: [
        {
          role: "system",
          content: systemMessage
        }
      ],
      context: {
        workflow: "simulation",
        occurredAt: input.occurredAt
      },
      sharedPrompt: SIMULATION_START_PROMPT
    });
    const nextActorStates = evolveActorStates(input.actorStates, "engaged");
    const analysis = await this.#normalizer.normalize({
      workflow: "simulation",
      schemaId: "simulation.start",
      schemaVersion: "v1",
      occurredAt: input.occurredAt,
      prompt: SIMULATION_START_PROMPT,
      raw: {
        scenarioId: input.scenarioId,
        nodeId: input.currentNodeId,
        actorCount: nextActorStates.length
      }
    });

    return {
      actorStates: nextActorStates,
      observation: `Entered ${input.currentNodeTitle} with ${nextActorStates.length} actors.`,
      analysis,
      transcript: [
        {
          role: "system",
          content: systemMessage
        },
        agentResult.coordinatorMessage,
        ...agentResult.participantMessages
      ],
      prompt: SIMULATION_START_PROMPT
    };
  }

  async advance(input: SimulationWorkflowAdvanceInput): Promise<SimulationWorkflowOutput> {
    const prompt = await this.#promptLoader.loadPromptTemplate(SIMULATION_ADVANCE_PROMPT);
    const systemMessage = renderPromptTemplate(prompt, {
      nextNodeTitle: input.nextNodeTitle,
      selectedBranchLabel: input.selectedBranchLabel
    });
    const agentResult = await this.#agentRuntime.runInEnvironment({
      agentId: "simulation-environment",
      objective: "Advance the simulation through the chosen branch.",
      environment: {
        scene: input.nextNodeTitle,
        observedSignals: [input.previousNodeTitle, input.selectedBranchLabel],
        availableActions: ["advance", "observe"]
      },
      messages: [
        {
          role: "system",
          content: systemMessage
        }
      ],
      context: {
        workflow: "simulation",
        occurredAt: input.occurredAt
      },
      prompt: SIMULATION_ADVANCE_PROMPT
    });
    const nextActorStates = evolveActorStates(input.actorStates, input.selectedBranchLabel);
    const analysis = await this.#normalizer.normalize({
      workflow: "simulation",
      schemaId: "simulation.advance",
      schemaVersion: "v1",
      occurredAt: input.occurredAt,
      prompt: SIMULATION_ADVANCE_PROMPT,
      raw: {
        runId: input.runId,
        nextNodeId: input.nextNodeId,
        branchId: input.selectedBranchId,
        actorCount: nextActorStates.length
      }
    });

    return {
      actorStates: nextActorStates,
      observation: `Action ${agentResult.chosenAction} at ${input.nextNodeTitle}.`,
      analysis,
      transcript: [
        {
          role: "system",
          content: systemMessage
        },
        agentResult.finalMessage
      ],
      prompt: SIMULATION_ADVANCE_PROMPT
    };
  }
}

export function createFakeSimulationWorkflow(
  options: CreateFakeSimulationWorkflowOptions
): SimulationWorkflowRuntime {
  return new FakeSimulationWorkflow(options);
}
