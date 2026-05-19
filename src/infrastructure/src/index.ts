export type {
  AgentEnvironmentSnapshotLike,
  AgentMessageLike,
  AgentRunInputLike,
  AgentRunOutputLike,
  AgentRuntimeLike,
  AppSettingsLike,
  AppSettingsPatchLike,
  AppSettingsStoreLike,
  CounselingSessionLike,
  EnvironmentAgentRunInputLike,
  EnvironmentAgentRunOutputLike,
  MultiAgentRunInputLike,
  MultiAgentRunOutputLike,
  NormalizedReportListQueryLike,
  ReportRegistryListResultLike,
  ReportRegistryRecordLike,
  ResonanceComparisonLike,
  ResonanceInputLike,
  ResonanceRetrievalPortLike,
  ResonanceRetrievalRerankInputLike,
  ResonanceRetrievalRerankResultLike,
  ResonanceRetrievalSearchCandidateLike,
  ResonanceRetrievalSearchInputLike,
  RuntimeAnnotationLike,
  RuntimeExecutionContextLike,
  RuntimeWorkflowKindLike,
  SimulationRunLike,
  SimulationScenarioLike
} from "./compatibility.js";

export { InMemoryCounselingSessionRepository } from "./in-memory/in-memory-counseling-session-repository.js";
export { InMemorySimulationRepository } from "./in-memory/in-memory-simulation-repository.js";
export type { InMemorySimulationRepositoryOptions } from "./in-memory/in-memory-simulation-repository.js";
export { InMemoryResonanceRepository } from "./in-memory/in-memory-resonance-repository.js";
export { InMemoryReportRegistry } from "./in-memory/in-memory-report-registry.js";

export { LocalFileStorage, localFileStorageScopes } from "./files/local-file-storage.js";
export type {
  FileStorageLocation,
  FileStorageWriteJsonInput,
  FileStorageWriteTextInput,
  LocalFileStorageOptions,
  LocalFileStorageScope
} from "./files/local-file-storage.js";
export { FileAppSettingsStore } from "./files/file-app-settings-store.js";
export type { FileAppSettingsStoreOptions } from "./files/file-app-settings-store.js";

export { PlaceholderAgentRuntime } from "./placeholder/placeholder-agent-runtime.js";
export type { PlaceholderAgentRuntimeOptions } from "./placeholder/placeholder-agent-runtime.js";
export { PlaceholderVectorStore } from "./placeholder/placeholder-vector-store.js";
export type { PlaceholderVectorDocument } from "./placeholder/placeholder-vector-store.js";

export { SqliteDatabase } from "./sqlite/sqlite-database.js";
export type { SqliteDatabaseOptions } from "./sqlite/sqlite-database.js";
export { SqliteCounselingRepository } from "./sqlite/sqlite-counseling-repo.js";
export type { SqliteCounselingRepositoryOptions } from "./sqlite/sqlite-counseling-repo.js";
export { SqliteSimulationRepository } from "./sqlite/sqlite-simulation-repo.js";
export type { SqliteSimulationRepositoryOptions } from "./sqlite/sqlite-simulation-repo.js";
export { SqliteResonanceRepository } from "./sqlite/sqlite-resonance-repo.js";
export type { SqliteResonanceRepositoryOptions } from "./sqlite/sqlite-resonance-repo.js";
export { SqliteReportRegistry } from "./sqlite/sqlite-report-registry.js";
export type { SqliteReportRegistryOptions } from "./sqlite/sqlite-report-registry.js";
export { SqliteAppSettingsStore } from "./sqlite/sqlite-app-settings-store.js";
export type { SqliteAppSettingsStoreOptions } from "./sqlite/sqlite-app-settings-store.js";

export { createDataDirectoryLayout, DATA_DIRECTORY_SCOPES } from "./files/data-directory.js";
export type { DataDirectoryScope, DataDirectoryLayout } from "./files/data-directory.js";

export { FetchLlmAdapter } from "./adapters/fetch-llm-adapter.js";
export type {
  FetchLlmAdapterOptions,
  LlmChatMessage,
  LlmChatRequest,
  LlmChatResponse
} from "./adapters/fetch-llm-adapter.js";

export { TokenVectorStore } from "./adapters/token-vector-store.js";
export type {
  TokenVectorDocument,
  TokenVectorSearchResult,
  TokenVectorStoreOptions
} from "./adapters/token-vector-store.js";

export { indexKnowledgeLibrary, syncKnowledgeLibraryIndexes } from "./knowledge/local-knowledge-index.js";
export type {
  IndexKnowledgeLibraryOptions,
  KnowledgeIndexEntry,
  KnowledgeIndexManifest,
  KnowledgeLibraryKind
} from "./knowledge/local-knowledge-index.js";

export { DeepSeekLlmAdapter } from "./adapters/deepseek-llm-adapter.js";
export type { DeepSeekLlmAdapterOptions } from "./adapters/deepseek-llm-adapter.js";

// ── Lifecycle: backup / restore / migration / diagnostics ──────────
export { createBackupId } from "./lifecycle/backup-restore.js";
export type {
  BackupManifest,
  BackupManifestEntry,
  BackupOptions,
  BackupRestoreService,
  RestoreOptions,
  RestoreResult
} from "./lifecycle/backup-restore.js";

export {
  createDiagnosticExportId,
  DIAGNOSTIC_COMPONENTS
} from "./lifecycle/diagnostic-export.js";
export type {
  DiagnosticCollector,
  DiagnosticComponent,
  DiagnosticComponentStatus,
  DiagnosticExportOptions,
  DiagnosticExportResult,
  DiagnosticExportService
} from "./lifecycle/diagnostic-export.js";

export { resolveMigrationStatus } from "./lifecycle/migration-runner.js";
export type {
  MigrationPlan,
  MigrationResult,
  MigrationRunner,
  MigrationState,
  MigrationStatus,
  MigrationStep
} from "./lifecycle/migration-runner.js";
