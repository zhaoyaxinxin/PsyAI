export interface FetchLlmAdapterOptions {
  endpoint: string;
  apiKey?: string;
  modelId?: string;
  timeoutMs?: number;
}

export interface LlmChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatRequest {
  messages: LlmChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmChatResponse {
  content: string;
  finishReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class FetchLlmAdapter {
  readonly #endpoint: string;
  readonly #apiKey: string | undefined;
  readonly #modelId: string;
  readonly #timeoutMs: number;

  constructor(options: FetchLlmAdapterOptions) {
    if (!options.endpoint) {
      throw new Error("endpoint is required");
    }
    this.#endpoint = options.endpoint;
    this.#apiKey = options.apiKey;
    this.#modelId = options.modelId ?? "default";
    this.#timeoutMs = options.timeoutMs ?? 30000;
  }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (this.#apiKey) {
        headers["Authorization"] = `Bearer ${this.#apiKey}`;
      }

      const response = await fetch(this.#endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.#modelId,
          messages: request.messages,
          ...(request.temperature !== undefined
            ? { temperature: request.temperature }
            : {}),
          ...(request.maxTokens !== undefined
            ? { max_tokens: request.maxTokens }
            : {})
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "unknown");
        throw new Error(
          `LLM request failed (${response.status}): ${body.slice(0, 500)}`
        );
      }

      const json = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
        };
      };

      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? "";
      const finishReason = choice?.finish_reason ?? "stop";

      return {
        content,
        finishReason,
        usage: {
          inputTokens: json.usage?.prompt_tokens ?? 0,
          outputTokens: json.usage?.completion_tokens ?? 0
        }
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
