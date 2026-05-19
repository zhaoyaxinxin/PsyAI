import {
  dataDirectorySchema,
  entityIdSchema,
  exportFormatSchema,
  hostInitializationErrorKindSchema,
  isoDateTimeSchema,
  lifecycleStatusSchema,
  processingStatusSchema,
  reportTypeSchema,
  reportVersionSchema,
  riskLevelSchema,
  sceneIdSchema,
  storageScopeSchema,
  workflowKindSchema
} from "./dist/index.js";

entityIdSchema.parse("session-001");
isoDateTimeSchema.parse("2026-05-11T16:00:00+08:00");
workflowKindSchema.parse("counseling");
sceneIdSchema.parse("focus");
reportTypeSchema.parse("resonance");
reportVersionSchema.parse("v1");
riskLevelSchema.parse("moderate");
lifecycleStatusSchema.parse("active");
processingStatusSchema.parse("running");
dataDirectorySchema.parse("indexes");
storageScopeSchema.parse("snapshots");
exportFormatSchema.parse("pdf");
hostInitializationErrorKindSchema.parse("data_directory_unavailable");

console.log("shared validation passed");
