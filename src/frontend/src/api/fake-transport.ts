import type { ReportReference } from "@psyai/contracts";

import { loadFrontendFixtureBundle, type FrontendFixtureBundle } from "../fixtures/fixture-catalog.js";
import type { FrontendReportDocument } from "../reports/report-shell.js";
import type { FrontendApiOperation, FrontendTransport } from "./transport.js";

export interface ReportRepository {
  loadByReference(reference: ReportReference): Promise<FrontendReportDocument>;
}

export interface FakeTransportOptions {
  latencyMs?: number;
  fixtures?: FrontendFixtureBundle;
}

function cloneValue<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createFakeFixtureTransport(options: FakeTransportOptions = {}): FrontendTransport {
  const fixtures = options.fixtures ?? loadFrontendFixtureBundle();

  const operationResponses: Record<FrontendApiOperation, unknown> = {
    "counseling.start": fixtures.api.counseling.startResponse,
    "counseling.reply": fixtures.api.counseling.replyResponse,
    "counseling.finish": fixtures.api.counseling.finishResponse,
    "counseling.get": fixtures.api.counseling.getResponse,
    "counseling.list": fixtures.api.counseling.listResponse,
    "counseling.report": fixtures.api.counseling.reportResponse,
    "simulation.scenario": fixtures.api.simulation.scenarioResponse,
    "simulation.prepare": fixtures.api.simulation.prepareResponse,
    "simulation.run": fixtures.api.simulation.runResponse,
    "simulation.node": fixtures.api.simulation.nodeResponse,
    "simulation.advance": fixtures.api.simulation.advanceResponse,
    "simulation.finish": fixtures.api.simulation.finishResponse,
    "simulation.list": fixtures.api.simulation.listResponse,
    "simulation.report": fixtures.api.simulation.reportResponse,
    "resonance.input": fixtures.api.resonance.inputResponse,
    "resonance.analyze": fixtures.api.resonance.analyzeResponse,
    "resonance.compare": fixtures.api.resonance.compareResponse,
    "resonance.matches": fixtures.api.resonance.matchesResponse,
    "resonance.detail": fixtures.api.resonance.detailResponse,
    "resonance.list": fixtures.api.resonance.listResponse,
    "resonance.report": fixtures.api.resonance.reportResponse
  };

  return {
    async send(operation, payload) {
      void payload;

      if (options.latencyMs && options.latencyMs > 0) {
        await delay(options.latencyMs);
      }

      const response = operationResponses[operation];
      if (response === undefined) {
        throw new Error(`No fake fixture response registered for ${operation}`);
      }

      return cloneValue(response);
    }
  };
}

export function createFixtureReportRepository(
  fixtures: FrontendFixtureBundle = loadFrontendFixtureBundle()
): ReportRepository {
  const reportsByWorkflow: Record<ReportReference["workflow"], FrontendReportDocument> = {
    counseling: fixtures.reports.counseling,
    simulation: fixtures.reports.simulation,
    resonance: fixtures.reports.resonance
  };

  return {
    async loadByReference(reference) {
      const report = reportsByWorkflow[reference.workflow];
      if (!report) {
        throw new Error(`Unsupported workflow ${reference.workflow}`);
      }

      if (report.base.reportId !== reference.reportId) {
        throw new Error(`Fixture report id mismatch for ${reference.workflow}: ${reference.reportId}`);
      }

      return cloneValue(report);
    }
  };
}
