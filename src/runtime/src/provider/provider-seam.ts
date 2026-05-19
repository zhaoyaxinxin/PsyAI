import type { AgentRuntime } from "../agent/agent-runtime.js";
import type { ProviderExtension } from "./provider-extension.js";

/**
 * Formal provider seam — the contract every real provider must satisfy.
 *
 * This is the real main-path entry point, not fake-first.
 * Infrastructure implements this; business modules consume it through workflow runtimes.
 */
export interface ProviderSeam {
  /** Provider identity, version, and declared capabilities. */
  readonly extension: ProviderExtension;

  /** Single-agent, multi-agent, and environment-agent execution. */
  readonly agentRuntime: AgentRuntime;

  /** Lightweight liveness check. Returns false when the provider is unreachable. */
  healthCheck(): Promise<boolean>;
}
