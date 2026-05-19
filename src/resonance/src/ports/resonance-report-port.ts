import type { ReportReference } from "@psyai/contracts";

import type { ResonanceComparison } from "../match/resonance-comparison.js";
import type { ResonanceInput } from "../input/resonance-input.js";
import type { ResonanceReportInput } from "../reporting/resonance-report-input.js";

export interface ResonanceReportPort {
  createReportReference(input: {
    input: ResonanceInput;
    comparison: ResonanceComparison;
    reportInput: ResonanceReportInput;
  }): Promise<ReportReference | null>;
}
