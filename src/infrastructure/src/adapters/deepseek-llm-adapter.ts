import type {
  AgentEnvironmentSnapshot,
  AgentMessage,
  AgentRunInput,
  AgentRunOutput,
  AgentRunStreamEvent,
  AgentRuntime,
  AgentToolCall,
  AgentUsage,
  EnvironmentAgentRunInput,
  EnvironmentAgentRunOutput,
  MultiAgentRunInput,
  MultiAgentRunOutput,
  StreamingAgentRuntime
} from "@psyai/runtime";
import {
  type ExecutionGuardOptions,
  type GuardedExecutionResult,
  type RetryPolicy,
  type RuntimeFailure,
  classifyProviderError,
  executeWithGuard
} from "@psyai/runtime";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// ── Configuration ───────────────────────────────────────────────────

export interface DeepSeekLlmAdapterOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
  /** Enable thinking mode for DeepSeek models that support it. */
  enableThinking?: boolean;
  /** Optional thinking effort override for OpenAI-compatible request bodies. */
  reasoningEffort?: "low" | "medium" | "high";
}

const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryableKinds: ["transient", "timeout", "rate_limited"]
};

type DeepSeekChatCompletionRequest =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    extra_body?: {
      thinking?: { type: "enabled" | "disabled" };
    };
  };

type DeepSeekChatCompletionStreamRequest =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming & {
    extra_body?: {
      thinking?: { type: "enabled" | "disabled" };
    };
  };

type DeepSeekResponseMessage = {
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
};

type DeepSeekStreamDelta = {
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: Array<{
    type?: "function";
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
};

function resolveApiKey(options: DeepSeekLlmAdapterOptions): string {
  if (options.apiKey) return options.apiKey;
  const envKey = process.env["DEEPSEEK_API_KEY"];
  if (envKey) return envKey;
  throw new Error(
    "DeepSeek API key not found. Set DEEPSEEK_API_KEY environment variable or pass apiKey option."
  );
}

// ── Message mapping ─────────────────────────────────────────────────

function toOpenAiMessages(messages: AgentMessage[]): ChatCompletionMessageParam[] {
  return messages.map((msg): ChatCompletionMessageParam => {
    const base = { content: msg.content };
    if (msg.name) return { ...base, role: msg.role as "system" | "user" | "assistant", name: msg.name };
    return { ...base, role: msg.role as "system" | "user" | "assistant" };
  });
}

function toAgentMessage(content: string, role: "assistant" = "assistant"): AgentMessage {
  return { role, content };
}

function toAgentUsage(
  inputUnits: number | undefined,
  outputUnits: number | undefined
): AgentUsage {
  return {
    inputUnits: inputUnits ?? 0,
    outputUnits: outputUnits ?? 0
  };
}

// ── System prompt builders ──────────────────────────────────────────

function buildMultiAgentSystemPrompt(input: MultiAgentRunInput): string {
  const participantDescriptions = input.participants
    .map((p) => `- ${p.agentId} (${p.role}): ${p.objective}`)
    .join("\n");

  return [
    `You are coordinating a multi-agent simulation.`,
    `Overall objective: ${input.objective}`,
    ``,
    `Participants:`,
    participantDescriptions,
    ``,
    `For each participant, output their response in this format:`,
    `[AGENT:agentId]`,
    `ROLE: <their role in the scene>`,
    `RESPONSE: <what they say or do>`,
    ``,
    `Then output your coordinator summary:`,
    `[COORDINATOR]`,
    `SUMMARY: <overall scene assessment>`
  ].join("\n");
}

function parseMultiAgentResponse(content: string, input: MultiAgentRunInput): {
  participantMessages: AgentMessage[];
  coordinatorMessage: AgentMessage;
} {
  const participantMessages: AgentMessage[] = [];
  const sections = content.split(/\[AGENT:|\[COORDINATOR\]/);

  let coordinatorContent = "";

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.startsWith("SUMMARY:")) {
      coordinatorContent = trimmed.replace("SUMMARY:", "").trim();
    } else {
      const agentMatch = trimmed.match(/^([^\]]+)\]\s*ROLE:.*?RESPONSE:\s*(.*)/s);
      if (agentMatch) {
        const agentId = agentMatch[1]?.trim() ?? "";
        const response = agentMatch[2]?.trim() ?? trimmed;
        const participant = input.participants.find((p) => p.agentId === agentId);
        participantMessages.push({
          role: "assistant",
          content: response,
          name: participant?.role ?? agentId
        });
      }
    }
  }

  if (participantMessages.length === 0) {
    for (const p of input.participants) {
      participantMessages.push({ role: "assistant", content: `[${p.agentId}] ${p.objective}`, name: p.role });
    }
  }

  return {
    participantMessages,
    coordinatorMessage: toAgentMessage(coordinatorContent || content)
  };
}

function buildEnvironmentPrompt(input: EnvironmentAgentRunInput): string {
  return [
    `You are agent ${input.agentId}.`,
    `Objective: ${input.objective}`,
    ``,
    `Current scene: ${input.environment.scene}`,
    `Observed signals: ${input.environment.observedSignals.join(", ") || "none"}`,
    `Available actions: ${input.environment.availableActions.join(", ") || "none"}`,
    ``,
    `Choose the single best action from the available actions. Respond with just the action name.`
  ].join("\n");
}

// ── Adapter ─────────────────────────────────────────────────────────

export class DeepSeekLlmAdapter implements AgentRuntime, StreamingAgentRuntime {
  readonly #client: OpenAI;
  readonly #model: string;
  readonly #timeoutMs: number;
  readonly #retryPolicy: RetryPolicy;
  readonly #enableThinking: boolean;
  readonly #reasoningEffort: DeepSeekLlmAdapterOptions["reasoningEffort"];

  constructor(options: DeepSeekLlmAdapterOptions = {}) {
    const apiKey = resolveApiKey(options);

    this.#client = new OpenAI({
      apiKey,
      baseURL: options.baseUrl ?? DEFAULT_DEEPSEEK_BASE_URL
    });
    this.#model = options.model ?? DEFAULT_DEEPSEEK_MODEL;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#retryPolicy = options.retryPolicy ?? DEFAULT_RETRY_POLICY;
    this.#enableThinking = options.enableThinking ?? false;
    this.#reasoningEffort = options.reasoningEffort;
  }

  // ── AgentRuntime ──────────────────────────────────────────────────

  async run(input: AgentRunInput): Promise<AgentRunOutput> {
    return this.#executeWithGuard(
      () => this.#chat(input.messages, input.context.workflow, input.objective),
      input.context.workflow,
      "agent-run"
    );
  }

  async runMultiAgent(input: MultiAgentRunInput): Promise<MultiAgentRunOutput> {
    return this.#executeWithGuard(
      () => this.#multiAgentChat(input),
      input.context.workflow,
      "multi-agent-run"
    );
  }

  async runInEnvironment(input: EnvironmentAgentRunInput): Promise<EnvironmentAgentRunOutput> {
    return this.#executeWithGuard(
      () => this.#environmentChat(input),
      input.context.workflow,
      "environment-agent-run"
    );
  }

  async *runStream(input: AgentRunInput): AsyncIterable<AgentRunStreamEvent> {
    const openAiMessages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are a supportive AI agent in a "${input.context.workflow}" workflow. ${input.objective}`
      },
      ...toOpenAiMessages(input.messages)
    ];

    let accumulatedContent = "";
    let accumulatedReasoning = "";
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const stream = await this.#client.chat.completions.create(
        this.#buildStreamRequest(openAiMessages, 0.7, 4096)
      );

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta as DeepSeekStreamDelta | undefined;

        if (delta?.reasoning_content) {
          accumulatedReasoning += delta.reasoning_content;
        }

        if (delta?.content) {
          accumulatedContent += delta.content;
          yield { type: "token", content: delta.content };
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.type === "function") {
              yield {
                type: "tool_call",
                toolName: tc.function?.name ?? "unknown",
                inputSummary: tc.function?.arguments ?? ""
              };
            }
          }
        }

        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
      }

      yield {
        type: "done",
        usage: toAgentUsage(promptTokens || undefined, completionTokens || undefined),
        ...(accumulatedReasoning
          ? {
              annotations: [
                { label: "reasoning_content", value: accumulatedReasoning }
              ]
            }
          : {})
      };
    } catch (error) {
      yield {
        type: "error",
        failure: classifyProviderError(error, { workflow: input.context.workflow, operation: "runStream" })
      };
    }
  }

  // ── Internal ──────────────────────────────────────────────────────

  async #chat(
    messages: AgentMessage[],
    workflow: string,
    objective: string
  ): Promise<AgentRunOutput> {
    const openAiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: `You are a supportive AI agent in a "${workflow}" workflow. ${objective}` },
      ...toOpenAiMessages(messages)
    ];

    const completion = await this.#client.chat.completions.create(
      this.#buildRequest(openAiMessages, 0.7, 4096)
    );

    const choice = completion.choices[0];
    const message = choice?.message as DeepSeekResponseMessage | undefined;
    const content = message?.content ?? "";
    const reasoningContent = message?.reasoning_content?.trim() ?? "";
    const toolCalls: AgentToolCall[] = [];

    if (message?.tool_calls) {
      for (const tc of message.tool_calls) {
        if (tc.type === "function") {
          toolCalls.push({ toolName: tc.function.name, inputSummary: tc.function.arguments });
        }
      }
    }

    return {
      finalMessage: toAgentMessage(content),
      toolCalls,
      annotations: [
        { label: "objective", value: objective },
        ...(reasoningContent
          ? [{ label: "reasoning_content", value: reasoningContent }]
          : [])
      ],
      usage: toAgentUsage(completion.usage?.prompt_tokens, completion.usage?.completion_tokens),
      rawOutput: completion
    };
  }

  async #multiAgentChat(input: MultiAgentRunInput): Promise<MultiAgentRunOutput> {
    const systemPrompt = buildMultiAgentSystemPrompt(input);
    const openAiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...toOpenAiMessages(input.messages)
    ];

    const completion = await this.#client.chat.completions.create(
      this.#buildRequest(openAiMessages, 0.8, 8192)
    );

    const content = choiceContent(completion);
    const { participantMessages, coordinatorMessage } = parseMultiAgentResponse(content, input);

    return {
      coordinatorMessage,
      participantMessages,
      annotations: [{ label: "participants", value: String(input.participants.length) }],
      usage: toAgentUsage(completion.usage?.prompt_tokens, completion.usage?.completion_tokens),
      rawOutput: completion
    };
  }

  async #environmentChat(input: EnvironmentAgentRunInput): Promise<EnvironmentAgentRunOutput> {
    const systemPrompt = buildEnvironmentPrompt(input);
    const openAiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...toOpenAiMessages(input.messages)
    ];

    const completion = await this.#client.chat.completions.create(
      this.#buildRequest(openAiMessages, 0.3, 256)
    );

    const content = choiceContent(completion).trim();
    const chosenAction = input.environment.availableActions.includes(content)
      ? content
      : (input.environment.availableActions[0] ?? "observe");

    return {
      finalMessage: toAgentMessage(content),
      chosenAction,
      annotations: [{ label: "scene", value: input.environment.scene }],
      usage: toAgentUsage(completion.usage?.prompt_tokens, completion.usage?.completion_tokens),
      rawOutput: completion
    };
  }

  async #executeWithGuard<T>(
    fn: () => Promise<T>,
    workflow: string,
    operation: string
  ): Promise<T> {
    const guardOptions: ExecutionGuardOptions = {
      timeoutMs: this.#timeoutMs,
      retryPolicy: this.#retryPolicy,
      operation,
      workflow: workflow as "counseling" | "simulation" | "resonance"
    };

    const result: GuardedExecutionResult<T> = await executeWithGuard(fn, guardOptions);

    if (!result.success && result.failure) {
      throw result.failure;
    }

    return result.result as T;
  }

  #buildRequest(
    messages: ChatCompletionMessageParam[],
    temperature: number,
    maxTokens: number
  ): DeepSeekChatCompletionRequest {
    const request: DeepSeekChatCompletionRequest = {
      model: this.#model,
      messages,
      max_tokens: maxTokens,
      ...this.#buildThinkingOptions()
    };

    if (!this.#enableThinking) {
      request.temperature = temperature;
    }

    return request;
  }

  #buildStreamRequest(
    messages: ChatCompletionMessageParam[],
    temperature: number,
    maxTokens: number
  ): DeepSeekChatCompletionStreamRequest {
    const request: DeepSeekChatCompletionStreamRequest = {
      model: this.#model,
      messages,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      ...this.#buildThinkingOptions()
    };

    if (!this.#enableThinking) {
      request.temperature = temperature;
    }

    return request;
  }

  #buildThinkingOptions(): Pick<DeepSeekChatCompletionRequest, "reasoning_effort" | "extra_body"> {
    if (!this.#enableThinking) {
      return {};
    }

    return {
      reasoning_effort: this.#reasoningEffort ?? "high",
      extra_body: {
        thinking: { type: "enabled" }
      }
    };
  }
}

function choiceContent(completion: OpenAI.Chat.Completions.ChatCompletion): string {
  return completion.choices[0]?.message?.content ?? "";
}
