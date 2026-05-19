import type { AgentRuntime } from "../agent/agent-runtime.js";
import type { AnalysisNormalizer } from "../normalization/analysis-normalizer.js";
import { renderPromptTemplate, type PromptAssetLoader, type PromptAssetSelection } from "../prompt/prompt-asset.js";
import type {
  CounselingWorkflowOutput,
  CounselingWorkflowReplyInput,
  CounselingWorkflowRuntime,
  CounselingWorkflowStartInput
} from "../workflow/counseling-runtime.js";

const COUNSELING_START_PROMPT: PromptAssetSelection = {
  packId: "counseling-core",
  version: "v1",
  promptKey: "start"
};

const COUNSELING_REPLY_PROMPT: PromptAssetSelection = {
  packId: "counseling-core",
  version: "v1",
  promptKey: "reply"
};

export interface CreateFakeCounselingWorkflowOptions {
  agentRuntime: AgentRuntime;
  promptLoader: PromptAssetLoader;
  normalizer: AnalysisNormalizer;
}

export class FakeCounselingWorkflow implements CounselingWorkflowRuntime {
  readonly #agentRuntime: AgentRuntime;
  readonly #promptLoader: PromptAssetLoader;
  readonly #normalizer: AnalysisNormalizer;

  constructor(options: CreateFakeCounselingWorkflowOptions) {
    this.#agentRuntime = options.agentRuntime;
    this.#promptLoader = options.promptLoader;
    this.#normalizer = options.normalizer;
  }

  async start(input: CounselingWorkflowStartInput): Promise<CounselingWorkflowOutput> {
    const prompt = await this.#promptLoader.loadPromptTemplate(COUNSELING_START_PROMPT);
    const systemMessage = renderPromptTemplate(prompt, {
      openingMessage: input.openingMessage,
      userContext: input.userContext.join(", ") || "none"
    });
    const agentResult = await this.#agentRuntime.run({
      agentId: "fake-counselor",
      objective: "Open a counseling intake safely.",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: input.openingMessage
        }
      ],
      context: {
        workflow: "counseling",
        occurredAt: input.occurredAt
      },
      prompt: COUNSELING_START_PROMPT
    });

    const analysis = await this.#normalizer.normalize({
      workflow: "counseling",
      schemaId: "counseling.intake",
      schemaVersion: "v1",
      occurredAt: input.occurredAt,
      prompt: COUNSELING_START_PROMPT,
      raw: {
        summary: `Opening around ${input.openingMessage}`,
        context: input.userContext,
        assistantSignal: agentResult.finalMessage.content
      }
    });

    return {
      analysis,
      transcript: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "assistant",
          content: agentResult.finalMessage.content
        }
      ],
      prompt: COUNSELING_START_PROMPT
    };
  }

  async reply(input: CounselingWorkflowReplyInput): Promise<CounselingWorkflowOutput> {
    const prompt = await this.#promptLoader.loadPromptTemplate(COUNSELING_REPLY_PROMPT);
    const systemMessage = renderPromptTemplate(prompt, {
      message: input.message,
      historyCount: input.history.length
    });
    const agentResult = await this.#agentRuntime.run({
      agentId: "fake-counselor",
      objective: "Continue counseling exploration.",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        ...input.history.map((item) => ({
          role: item.role,
          content: item.message
        })),
        {
          role: "user",
          content: input.message
        }
      ],
      context: {
        workflow: "counseling",
        occurredAt: input.occurredAt
      },
      prompt: COUNSELING_REPLY_PROMPT
    });

    const analysis = await this.#normalizer.normalize({
      workflow: "counseling",
      schemaId: "counseling.reply",
      schemaVersion: "v1",
      occurredAt: input.occurredAt,
      prompt: COUNSELING_REPLY_PROMPT,
      raw: {
        summary: `Follow-up around ${input.message}`,
        priorSummary: input.latestAnalysis?.summary ?? "none",
        historyCount: input.history.length,
        assistantSignal: agentResult.finalMessage.content
      }
    });

    return {
      analysis,
      assistantMessage:
        "Can you describe what tends to happen right before that reaction starts?",
      transcript: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "assistant",
          content: agentResult.finalMessage.content
        }
      ],
      prompt: COUNSELING_REPLY_PROMPT
    };
  }
}

export function createFakeCounselingWorkflow(
  options: CreateFakeCounselingWorkflowOptions
): CounselingWorkflowRuntime {
  return new FakeCounselingWorkflow(options);
}
