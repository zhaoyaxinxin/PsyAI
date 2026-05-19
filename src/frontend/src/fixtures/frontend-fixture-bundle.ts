import counselingApiFixture from "../../../contracts/api/fixtures/counseling.json" with { type: "json" };
import resonanceApiFixture from "../../../contracts/api/fixtures/resonance.json" with { type: "json" };
import simulationApiFixture from "../../../contracts/api/fixtures/simulation.json" with { type: "json" };
import counselingReportFixture from "../../../contracts/reports/fixtures/counseling-report.json" with { type: "json" };
import resonanceReportFixture from "../../../contracts/reports/fixtures/resonance-report.json" with { type: "json" };
import simulationReportFixture from "../../../contracts/reports/fixtures/simulation-report.json" with { type: "json" };

export const frontendFixtureBundle = {
  api: {
    counseling: counselingApiFixture,
    simulation: simulationApiFixture,
    resonance: resonanceApiFixture
  },
  reports: {
    counseling: counselingReportFixture,
    simulation: simulationReportFixture,
    resonance: resonanceReportFixture
  }
} as const;
