import type { ReportReference } from "@psyai/contracts";

import type { SimulationReportInput } from "../reporting/simulation-report-input.js";
import type { SimulationRun, SimulationScenario } from "../simulation/simulation-run.js";

export interface SimulationReportPort {
  createReportReference(input: {
    scenario: SimulationScenario;
    run: SimulationRun;
    reportInput: SimulationReportInput;
  }): Promise<ReportReference | null>;
}
