import {
  createReportingUseCases,
  type CreateReportingUseCasesOptions,
  type ReportingUseCases
} from "../application/reporting-use-cases.js";
import { createCounselingReportingAdapter } from "../adapters/counseling-reporting-adapter.js";
import { createResonanceReportingAdapter } from "../adapters/resonance-reporting-adapter.js";
import { createSimulationReportingAdapter } from "../adapters/simulation-reporting-adapter.js";
import {
  createReportingController,
  type ReportingController
} from "../controller/reporting-controller.js";

export interface ReportingModule {
  useCases: ReportingUseCases;
  controller: ReportingController;
  counselingPort: ReturnType<typeof createCounselingReportingAdapter>;
  simulationPort: ReturnType<typeof createSimulationReportingAdapter>;
  resonancePort: ReturnType<typeof createResonanceReportingAdapter>;
}

export function createReportingModule(
  options: CreateReportingUseCasesOptions
): ReportingModule {
  const useCases = createReportingUseCases(options);

  return {
    useCases,
    controller: createReportingController({
      useCases,
      ...(options.now ? { now: options.now } : {})
    }),
    counselingPort: createCounselingReportingAdapter({
      useCases
    }),
    simulationPort: createSimulationReportingAdapter({
      useCases
    }),
    resonancePort: createResonanceReportingAdapter({
      useCases
    })
  };
}
