import { assertNonEmptyString } from "./validation.js";

/**
 * Full provider configuration — richer than modelSelection alone.
 * Consumer modules (frontend, infrastructure) use this to configure
 * provider endpoint, timeout, retries, and declared capabilities.
 */
export interface AppProviderConfig {
  /** Provider identifier (e.g. "openai", "local-llm"). */
  provider: string;
  /** Model identifier within the provider (e.g. "gpt-4", "deepseek-v3"). */
  modelId: string;
  /** Provider API endpoint URL. Empty means default / local. */
  endpoint: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs: number;
  /** Maximum retry attempts for transient failures. */
  maxRetries: number;
  /** Provider-declared capability names (e.g. "chat", "embedding", "analysis"). */
  capabilities: string[];
}

export interface AppProviderConfigPatch extends Partial<AppProviderConfig> {}

export const defaultAppProviderConfig: AppProviderConfig = {
  provider: "deepseek",
  modelId: "deepseek-v4-flash",
  endpoint: "https://api.deepseek.com",
  timeoutMs: 30000,
  maxRetries: 3,
  capabilities: ["chat"]
};

export function assertAppProviderConfig(
  value: AppProviderConfig
): asserts value is AppProviderConfig {
  assertNonEmptyString(value.provider, "providerConfig.provider");
  assertNonEmptyString(value.modelId, "providerConfig.modelId");

  if (typeof value.endpoint !== "string") {
    throw new Error("providerConfig.endpoint must be a string");
  }

  if (typeof value.timeoutMs !== "number" || value.timeoutMs < 1000) {
    throw new Error("providerConfig.timeoutMs must be a number >= 1000");
  }

  if (
    typeof value.maxRetries !== "number" ||
    value.maxRetries < 0 ||
    value.maxRetries > 10
  ) {
    throw new Error("providerConfig.maxRetries must be a number between 0 and 10");
  }

  if (!Array.isArray(value.capabilities)) {
    throw new Error("providerConfig.capabilities must be an array");
  }
}

export function createDefaultAppProviderConfig(
  overrides: AppProviderConfigPatch = {}
): AppProviderConfig {
  const next: AppProviderConfig = {
    ...defaultAppProviderConfig,
    ...overrides
  };

  assertAppProviderConfig(next);
  return next;
}
