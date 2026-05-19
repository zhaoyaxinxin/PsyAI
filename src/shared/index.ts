import { z } from "zod";

export const entityIdSchema = z.string().min(1).max(128);
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const workflowKindValues = [
  "counseling",
  "simulation",
  "resonance"
] as const;

export const workflowKindSchema = z.enum(workflowKindValues);

export type WorkflowKind = z.infer<typeof workflowKindSchema>;

export {
  sceneIdSchema,
  sceneIdValues,
  type SceneId
} from "./scene.js";

export {
  reportTypeSchema,
  reportTypeValues,
  reportVersionSchema,
  type ReportType
} from "./report.js";

export {
  riskLevelSchema,
  riskLevelValues,
  type RiskLevel
} from "./risk.js";

export {
  lifecycleStatusSchema,
  lifecycleStatusValues,
  processingStatusSchema,
  processingStatusValues,
  type LifecycleStatus,
  type ProcessingStatus
} from "./status.js";

export {
  dataDirectorySchema,
  dataDirectoryValues,
  storageScopeSchema,
  storageScopeValues,
  type DataDirectory,
  type StorageScope
} from "./storage.js";

export {
  exportFormatSchema,
  exportFormatValues,
  type ExportFormat
} from "./export.js";

export {
  hostInitializationErrorKindSchema,
  hostInitializationErrorKindValues,
  type HostInitializationErrorKind
} from "./host.js";

export {
  SHARED_VERSION,
  compatTagValues,
  migrationStatusValues,
  releaseChannelValues,
  compareSemver,
  isSemverCompatible,
  parseSemver,
  type CompatTag,
  type MigrationStatus,
  type ReleaseChannel
} from "./version.js";

export {
  safeParse,
  safeParseAsync,
  isDefined,
  nonEmptyStringSchema,
  nonNegativeIntSchema,
  optionalBooleanSchema,
  pageRequestSchema,
  positiveIntSchema,
  tagsSchema,
  urlLikeStringSchema
} from "./helpers.js";

export {
  BUILD_TARGET,
  buildTargetSchema,
  buildTargetValues,
  defaultFeatureFlags,
  environmentModeSchema,
  environmentModeValues,
  featureFlagSchema,
  PRODUCT_NAME,
  type BuildTarget,
  type EnvironmentMode,
  type FeatureFlags
} from "./environment.js";

export {
  componentHealthSchema,
  componentStatusSchema,
  componentStatusValues,
  diagnosticEventSchema,
  diagnosticLevelSchema,
  diagnosticLevelValues,
  systemSnapshotSchema,
  type ComponentHealth,
  type ComponentStatus,
  type DiagnosticEvent,
  type DiagnosticLevel,
  type SystemSnapshot
} from "./diagnostic.js";

export {
  providerConfigSchema,
  providerEndpointSchema,
  providerHealthRecordSchema,
  providerMaxRetriesSchema,
  providerModelIdSchema,
  providerTestResultSchema,
  providerTimeoutMsSchema,
  type ProviderConfig,
  type ProviderHealthRecord,
  type ProviderTestResult
} from "./provider.js";

export {
  batchExportTaskSchema,
  exportTaskSchema,
  exportTaskStatusSchema,
  exportTaskStatusValues,
  type BatchExportTask,
  type ExportTask,
  type ExportTaskStatus
} from "./export-task.js";
