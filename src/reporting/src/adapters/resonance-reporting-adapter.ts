import type { ResonanceReportPort } from "@psyai/resonance";

import type { ReportingUseCases } from "../application/reporting-use-cases.js";

export interface CreateResonanceReportingAdapterOptions {
  useCases: ReportingUseCases;
}

export function createResonanceReportingAdapter(
  options: CreateResonanceReportingAdapterOptions
): ResonanceReportPort {
  return {
    async createReportReference(input) {
      return options.useCases.createResonanceReport({
        reportInput: input.reportInput,
        occurredAt: input.comparison.createdAt
      });
    }
  };
}
