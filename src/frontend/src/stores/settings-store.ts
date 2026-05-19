import {
  createErrorRequestState,
  createIdleRequestState,
  createLoadingRequestState,
  createReadyRequestState,
  createStoreContainer,
  type RequestState,
  type StoreContainer
} from "./store-core.js";

// ── Provider config ─────────────────────────────────────────────────

export interface ProviderConfigState {
  providerId: string;
  providerVersion: string;
  endpoint: string;
  modelName: string;
  timeoutMs: number;
  maxRetries: number;
  capabilities: string[];
  apiKeyConfigured: boolean;
  apiKeyPreview: string;
}

export interface ProviderTestResult {
  success: boolean;
  latencyMs: number;
  errorMessage: string | null;
}

// ── Data directory ──────────────────────────────────────────────────

export interface DataDirectoryScopeState {
  scope: string;
  path: string;
  exists: boolean;
}

export interface DataDirectoryState {
  rootPath: string;
  scopes: DataDirectoryScopeState[];
  totalSizeEstimate: string;
}

// ── Export ──────────────────────────────────────────────────────────

export interface ExportSettingsState {
  availableFormats: string[];
  selectedFormat: string;
  lastExport: { fileName: string; exportedAt: string } | null;
}

// ── Cleanup ─────────────────────────────────────────────────────────

export interface CleanupState {
  pendingItems: number;
  estimatedSpace: string;
  lastCleanup: string | null;
}

// ── Store state ─────────────────────────────────────────────────────

export interface SettingsStoreState {
  provider: ProviderConfigState;
  dataDirectory: DataDirectoryState;
  exportSettings: ExportSettingsState;
  cleanup: CleanupState;
  providerRequest: RequestState;
  directoryRequest: RequestState;
  exportRequest: RequestState;
  cleanupRequest: RequestState;
  lastProviderTest: ProviderTestResult | null;
}

// ── Store interface ─────────────────────────────────────────────────

export interface SettingsStore {
  getState(): SettingsStoreState;
  subscribe: StoreContainer<SettingsStoreState>["subscribe"];

  updateProvider(config: Partial<ProviderConfigState>, occurredAt?: string): SettingsStoreState;
  testProviderConnection(occurredAt?: string): Promise<SettingsStoreState>;
  refreshDataDirectory(occurredAt?: string): Promise<SettingsStoreState>;
  changeDataDirectory(newPath: string, occurredAt?: string): Promise<SettingsStoreState>;
  updateExportFormat(format: string, occurredAt?: string): SettingsStoreState;
  runExport(occurredAt?: string): Promise<SettingsStoreState>;
  runCleanup(occurredAt?: string): Promise<SettingsStoreState>;
  reset(): SettingsStoreState;
}

// ── Factory ─────────────────────────────────────────────────────────

export function createSettingsStore(
  initialProvider?: Partial<ProviderConfigState>,
  initialDataRoot?: string
): SettingsStore {
  const store = createStoreContainer<SettingsStoreState>({
    provider: {
      providerId: initialProvider?.providerId ?? "local",
      providerVersion: initialProvider?.providerVersion ?? "v1",
      endpoint: initialProvider?.endpoint ?? "",
      modelName: initialProvider?.modelName ?? "default",
      timeoutMs: initialProvider?.timeoutMs ?? 30000,
      maxRetries: initialProvider?.maxRetries ?? 3,
      capabilities: initialProvider?.capabilities ?? [],
      apiKeyConfigured: initialProvider?.apiKeyConfigured ?? false,
      apiKeyPreview: initialProvider?.apiKeyPreview ?? ""
    },
    dataDirectory: {
      rootPath: initialDataRoot ?? ".",
      scopes: [
        { scope: "db", path: `${initialDataRoot ?? "."}/db`, exists: false },
        { scope: "uploads", path: `${initialDataRoot ?? "."}/uploads`, exists: false },
        { scope: "exports", path: `${initialDataRoot ?? "."}/exports`, exists: false },
        { scope: "snapshots", path: `${initialDataRoot ?? "."}/snapshots`, exists: false },
        { scope: "indexes", path: `${initialDataRoot ?? "."}/indexes`, exists: false },
        {
          scope: "knowledge-counseling",
          path: `${initialDataRoot ?? "."}/knowledge-counseling`,
          exists: false
        },
        {
          scope: "knowledge-resonance",
          path: `${initialDataRoot ?? "."}/knowledge-resonance`,
          exists: false
        }
      ],
      totalSizeEstimate: "Unknown"
    },
    exportSettings: {
      availableFormats: ["html", "json"],
      selectedFormat: "html",
      lastExport: null
    },
    cleanup: {
      pendingItems: 0,
      estimatedSpace: "0 MB",
      lastCleanup: null
    },
    providerRequest: createIdleRequestState(),
    directoryRequest: createIdleRequestState(),
    exportRequest: createIdleRequestState(),
    cleanupRequest: createIdleRequestState(),
    lastProviderTest: null
  });

  async function runWithState(
    occurredAt: string,
    requestKey: "providerRequest" | "directoryRequest" | "exportRequest" | "cleanupRequest",
    action: () => Promise<Partial<SettingsStoreState>>
  ): Promise<SettingsStoreState> {
    store.setState((current) => ({
      ...current,
      [requestKey]: createLoadingRequestState(occurredAt)
    }));

    try {
      const patch = await action();
      return store.setState((current) => ({
        ...current,
        ...patch,
        [requestKey]: createReadyRequestState(occurredAt)
      }));
    } catch (error) {
      return store.setState((current) => ({
        ...current,
        [requestKey]: createErrorRequestState(
          occurredAt,
          error instanceof Error ? error.message : "unknown settings store error"
        )
      }));
    }
  }

  return {
    getState() {
      return store.getState();
    },
    subscribe: store.subscribe,

    updateProvider(config, occurredAt = new Date().toISOString()) {
      return store.setState((current) => ({
        ...current,
        provider: { ...current.provider, ...config },
        providerRequest: createReadyRequestState(occurredAt)
      }));
    },

    testProviderConnection(occurredAt = new Date().toISOString()) {
      return runWithState(occurredAt, "providerRequest", async () => {
        const started = Date.now();
        // Simulate a connection test — real implementation would ping the provider.
        await new Promise((resolve) => setTimeout(resolve, 10));
        const latencyMs = Date.now() - started;
        const current = store.getState();
        const missingApiKey =
          current.provider.providerId === "deepseek" &&
          !current.provider.apiKeyConfigured;

        return {
          lastProviderTest: {
            success: !missingApiKey,
            latencyMs,
            errorMessage: missingApiKey
              ? "DeepSeek API Key 尚未配置，当前仍会回退到本地演示后端。"
              : null
          }
        };
      });
    },

    refreshDataDirectory(occurredAt = new Date().toISOString()) {
      return runWithState(occurredAt, "directoryRequest", async () => {
        // Real implementation would stat the filesystem.
        const current = store.getState();
        return {
          dataDirectory: {
            ...current.dataDirectory,
            scopes: current.dataDirectory.scopes.map((s) => ({ ...s, exists: true })),
            totalSizeEstimate: "< 1 MB"
          }
        };
      });
    },

    changeDataDirectory(newPath, occurredAt = new Date().toISOString()) {
      return runWithState(occurredAt, "directoryRequest", async () => {
        return {
          dataDirectory: {
            rootPath: newPath,
            scopes: [
              { scope: "db", path: `${newPath}/db`, exists: false },
              { scope: "uploads", path: `${newPath}/uploads`, exists: false },
              { scope: "exports", path: `${newPath}/exports`, exists: false },
              { scope: "snapshots", path: `${newPath}/snapshots`, exists: false },
              { scope: "indexes", path: `${newPath}/indexes`, exists: false },
              {
                scope: "knowledge-counseling",
                path: `${newPath}/knowledge-counseling`,
                exists: false
              },
              {
                scope: "knowledge-resonance",
                path: `${newPath}/knowledge-resonance`,
                exists: false
              }
            ],
            totalSizeEstimate: "Unknown"
          }
        };
      });
    },

    updateExportFormat(format, occurredAt = new Date().toISOString()) {
      return store.setState((current) => ({
        ...current,
        exportSettings: { ...current.exportSettings, selectedFormat: format },
        exportRequest: createReadyRequestState(occurredAt)
      }));
    },

    runExport(occurredAt = new Date().toISOString()) {
      return runWithState(occurredAt, "exportRequest", async () => {
        const current = store.getState();
        const fileName = `psyai-export-${Date.now()}.${current.exportSettings.selectedFormat}`;

        return {
          exportSettings: {
            ...current.exportSettings,
            lastExport: {
              fileName,
              exportedAt: occurredAt
            }
          }
        };
      });
    },

    runCleanup(occurredAt = new Date().toISOString()) {
      return runWithState(occurredAt, "cleanupRequest", async () => {
        return {
          cleanup: {
            pendingItems: 0,
            estimatedSpace: "0 MB",
            lastCleanup: occurredAt
          }
        };
      });
    },

    reset() {
      return store.setState((current) => ({
        ...current,
        providerRequest: createIdleRequestState(),
        directoryRequest: createIdleRequestState(),
        exportRequest: createIdleRequestState(),
        cleanupRequest: createIdleRequestState(),
        lastProviderTest: null
      }));
    }
  };
}
