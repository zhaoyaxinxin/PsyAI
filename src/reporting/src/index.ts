export { buildSimulationReport } from "./builders/simulation-report-builder.js";
export type { BuildSimulationReportOptions } from "./builders/simulation-report-builder.js";

export { buildResonanceReport } from "./builders/resonance-report-builder.js";
export type { BuildResonanceReportOptions } from "./builders/resonance-report-builder.js";

export { buildCounselingReport } from "./builders/counseling-report-builder.js";
export type { BuildCounselingReportOptions } from "./builders/counseling-report-builder.js";

export { createReportingUseCases } from "./application/reporting-use-cases.js";
export type {
  CreateReportingUseCasesOptions,
  ReportingIdGenerator,
  ReportingUseCases
} from "./application/reporting-use-cases.js";

export { createSimulationReportingAdapter } from "./adapters/simulation-reporting-adapter.js";
export type { CreateSimulationReportingAdapterOptions } from "./adapters/simulation-reporting-adapter.js";

export { createResonanceReportingAdapter } from "./adapters/resonance-reporting-adapter.js";
export type { CreateResonanceReportingAdapterOptions } from "./adapters/resonance-reporting-adapter.js";

export { createCounselingReportingAdapter } from "./adapters/counseling-reporting-adapter.js";
export type { CreateCounselingReportingAdapterOptions } from "./adapters/counseling-reporting-adapter.js";

export { createReportingController } from "./controller/reporting-controller.js";
export type {
  CreateReportingControllerOptions,
  ReportingController,
  ReportingErrorEnvelope,
  ReportingSuccessEnvelope
} from "./controller/reporting-controller.js";

export { createReportingModule } from "./composition/create-reporting-module.js";
export type { ReportingModule } from "./composition/create-reporting-module.js";

export { InMemoryReportRegistry } from "./testing/in-memory-report-registry.js";
export { createReportExport } from "./export/report-exporter.js";

export type {
  ReportDetailViewModel,
  ReportExportData,
  ReportHistoryViewModel,
  ReportListData,
  ReportListQuery,
  ReportRegistryRecord,
  ReportStatusData,
  ReportSummaryItem,
  ReportingReport,
  ReportingReportStatus,
  ReportingWorkflow
} from "./reporting-types.js";

export type {
  ReportGovernanceActions,
  ReportRegistry,
  ReportRegistryCounts,
  ReportRegistryListResult
} from "./ports/report-registry.js";

export {
  ReportExportUnsupportedFormatError,
  ReportNotFoundError
} from "./errors.js";

export {
  toReportDetailViewModel,
  toReportHistoryViewModel,
  toReportListData,
  toReportReference,
  toReportStatusData,
  toReportSummaryItem
} from "./projection/reporting-query-projection.js";
