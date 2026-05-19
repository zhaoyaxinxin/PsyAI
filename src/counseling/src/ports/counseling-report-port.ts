import type { ReportReference } from "@psyai/contracts";

import type { CounselingReportInput } from "../reporting/counseling-report-input.js";
import type { CounselingSession } from "../session/counseling-session.js";

export interface CounselingReportPort {
  createReportReference(input: {
    session: CounselingSession;
    reportInput: CounselingReportInput;
  }): Promise<ReportReference | null>;
}
