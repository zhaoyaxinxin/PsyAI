import type { SimulationReportPort } from "@psyai/simulation";

import type { ReportingUseCases } from "../application/reporting-use-cases.js";

export interface CreateSimulationReportingAdapterOptions {
  useCases: ReportingUseCases;
}

export function createSimulationReportingAdapter(
  options: CreateSimulationReportingAdapterOptions
): SimulationReportPort {
  return {
    async createReportReference(input) {
      return options.useCases.createSimulationReport({
        reportInput: input.reportInput,
        occurredAt: input.run.updatedAt
      });
    }
  };
}
