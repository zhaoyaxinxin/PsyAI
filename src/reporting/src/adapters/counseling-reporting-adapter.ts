import type { CounselingReportPort } from "@psyai/counseling";

import type { ReportingUseCases } from "../application/reporting-use-cases.js";

export interface CreateCounselingReportingAdapterOptions {
  useCases: ReportingUseCases;
}

export function createCounselingReportingAdapter(
  options: CreateCounselingReportingAdapterOptions
): CounselingReportPort {
  return {
    async createReportReference(input) {
      return options.useCases.createCounselingReport({
        reportInput: input.reportInput,
        occurredAt: input.session.finishedAt ?? input.session.updatedAt
      });
    }
  };
}
