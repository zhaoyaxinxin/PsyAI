import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  counselingFinishRequestSchema,
  counselingFinishResponseSchema,
  counselingGetRequestSchema,
  counselingGetResponseSchema,
  counselingListRequestSchema,
  counselingListResponseSchema,
  counselingReplyRequestSchema,
  counselingReplyResponseSchema,
  counselingReportRequestSchema,
  counselingReportResponseSchema,
  counselingStartRequestSchema,
  counselingStartResponseSchema
} from "./dist/api/counseling.js";
import { errorEnvelopeSchema } from "./dist/api/errors.js";
import {
  batchExportRequestSchema,
  batchExportResponseSchema,
  historyRequestSchema,
  historyResponseSchema,
  reportExportRequestSchema,
  reportExportResponseSchema
} from "./dist/api/export.js";
import {
  systemHealthRequestSchema,
  systemHealthResponseSchema,
  systemStatusRequestSchema,
  systemStatusResponseSchema,
  workflowStatusRequestSchema,
  workflowStatusResponseSchema
} from "./dist/api/health.js";
import {
  cleanupRequestSchema,
  cleanupResponseSchema,
  dataDirectoryCheckRequestSchema,
  dataDirectoryCheckResponseSchema,
  hostInitRequestSchema,
  hostInitResponseSchema,
  providerConfigGetRequestSchema,
  providerConfigGetResponseSchema,
  providerConfigUpdateRequestSchema,
  providerConfigUpdateResponseSchema,
  providerTestRequestSchema,
  providerTestResponseSchema
} from "./dist/api/host.js";
import {
  resonanceAnalyzeRequestSchema,
  resonanceAnalyzeResponseSchema,
  resonanceCompareRequestSchema,
  resonanceCompareResponseSchema,
  resonanceDetailRequestSchema,
  resonanceDetailResponseSchema,
  resonanceFinishRequestSchema,
  resonanceFinishResponseSchema,
  resonanceInputRequestSchema,
  resonanceInputResponseSchema,
  resonanceListRequestSchema,
  resonanceListResponseSchema,
  resonanceMatchesRequestSchema,
  resonanceMatchesResponseSchema,
  resonanceReportRequestSchema,
  resonanceReportResponseSchema
} from "./dist/api/resonance.js";
import {
  riskConfirmationRequestSchema,
  riskConfirmationResponseSchema,
  riskStatusRequestSchema,
  riskStatusResponseSchema
} from "./dist/api/risk.js";
import {
  simulationAdvanceRequestSchema,
  simulationAdvanceResponseSchema,
  simulationFinishRequestSchema,
  simulationFinishResponseSchema,
  simulationListRequestSchema,
  simulationListResponseSchema,
  simulationPrepareRequestSchema,
  simulationPrepareResponseSchema,
  simulationNodeRequestSchema,
  simulationNodeResponseSchema,
  simulationReportRequestSchema,
  simulationReportResponseSchema,
  simulationRunRequestSchema,
  simulationRunResponseSchema,
  simulationScenarioRequestSchema,
  simulationScenarioResponseSchema
} from "./dist/api/simulation.js";
import { counselingReportSchema } from "./dist/reports/counseling.js";
import { resonanceReportSchema } from "./dist/reports/resonance.js";
import { simulationReportSchema } from "./dist/reports/simulation.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const apiFixtureSpecs = [
  {
    relativePath: "api/fixtures/counseling.json",
    schemaMap: {
      startRequest: counselingStartRequestSchema,
      startResponse: counselingStartResponseSchema,
      replyRequest: counselingReplyRequestSchema,
      replyResponse: counselingReplyResponseSchema,
      finishRequest: counselingFinishRequestSchema,
      finishResponse: counselingFinishResponseSchema,
      getRequest: counselingGetRequestSchema,
      getResponse: counselingGetResponseSchema,
      reportRequest: counselingReportRequestSchema,
      reportResponse: counselingReportResponseSchema,
      listRequest: counselingListRequestSchema,
      listResponse: counselingListResponseSchema
    }
  },
  {
    relativePath: "api/fixtures/simulation.json",
    schemaMap: {
      scenarioRequest: simulationScenarioRequestSchema,
      scenarioResponse: simulationScenarioResponseSchema,
      prepareRequest: simulationPrepareRequestSchema,
      prepareResponse: simulationPrepareResponseSchema,
      runRequest: simulationRunRequestSchema,
      runResponse: simulationRunResponseSchema,
      nodeRequest: simulationNodeRequestSchema,
      nodeResponse: simulationNodeResponseSchema,
      advanceRequest: simulationAdvanceRequestSchema,
      advanceResponse: simulationAdvanceResponseSchema,
      finishRequest: simulationFinishRequestSchema,
      finishResponse: simulationFinishResponseSchema,
      listRequest: simulationListRequestSchema,
      listResponse: simulationListResponseSchema,
      reportRequest: simulationReportRequestSchema,
      reportResponse: simulationReportResponseSchema
    }
  },
  {
    relativePath: "api/fixtures/resonance.json",
    schemaMap: {
      inputRequest: resonanceInputRequestSchema,
      inputResponse: resonanceInputResponseSchema,
      analyzeRequest: resonanceAnalyzeRequestSchema,
      analyzeResponse: resonanceAnalyzeResponseSchema,
      importSuccessResponse: resonanceInputResponseSchema,
      importFailureResponse: resonanceInputResponseSchema,
      compareRequest: resonanceCompareRequestSchema,
      compareResponse: resonanceCompareResponseSchema,
      matchesRequest: resonanceMatchesRequestSchema,
      matchesResponse: resonanceMatchesResponseSchema,
      finishRequest: resonanceFinishRequestSchema,
      finishResponse: resonanceFinishResponseSchema,
      detailRequest: resonanceDetailRequestSchema,
      detailResponse: resonanceDetailResponseSchema,
      listRequest: resonanceListRequestSchema,
      listResponse: resonanceListResponseSchema,
      reportRequest: resonanceReportRequestSchema,
      reportResponse: resonanceReportResponseSchema
    }
  },
  {
    relativePath: "api/fixtures/errors.json",
    schemaMap: {
      validationError: errorEnvelopeSchema,
      sessionNotFound: errorEnvelopeSchema,
      runNotFound: errorEnvelopeSchema,
      inputNotFound: errorEnvelopeSchema,
      reportNotReady: errorEnvelopeSchema,
      reportNotFound: errorEnvelopeSchema,
      runtimeUnavailable: errorEnvelopeSchema,
      runtimeProviderTimeout: errorEnvelopeSchema,
      runtimeProviderUnavailable: errorEnvelopeSchema,
      runtimeRateLimited: errorEnvelopeSchema,
      runtimePromptPackNotFound: errorEnvelopeSchema,
      runtimeStructuredOutputInvalid: errorEnvelopeSchema,
      retrievalUnavailable: errorEnvelopeSchema,
      retrievalNoCandidates: errorEnvelopeSchema,
      persistenceQueryFailed: errorEnvelopeSchema,
      persistenceMigrationNeeded: errorEnvelopeSchema,
      hostSettingsLoadFailed: errorEnvelopeSchema,
      hostProviderConfigMissing: errorEnvelopeSchema,
      hostConsentNotCompleted: errorEnvelopeSchema,
      securityRiskConfirmationRequired: errorEnvelopeSchema,
      hostDataDirectoryUnavailable: errorEnvelopeSchema,
      hostWorkspaceRootUnavailable: errorEnvelopeSchema,
      hostExportDirectoryUnavailable: errorEnvelopeSchema,
      storageDataDirectoryNotFound: errorEnvelopeSchema,
      storageDataDirectoryCorrupted: errorEnvelopeSchema,
      storageDataDirectoryAccessDenied: errorEnvelopeSchema,
      exportFormatUnsupported: errorEnvelopeSchema,
      exportFailed: errorEnvelopeSchema,
      cleanupFailed: errorEnvelopeSchema
    }
  },
  {
    relativePath: "api/fixtures/host.json",
    schemaMap: {
      hostInitRequest: hostInitRequestSchema,
      hostInitResponse: hostInitResponseSchema,
      dataDirectoryCheckRequest: dataDirectoryCheckRequestSchema,
      dataDirectoryCheckResponse: dataDirectoryCheckResponseSchema,
      providerConfigGetRequest: providerConfigGetRequestSchema,
      providerConfigGetResponse: providerConfigGetResponseSchema,
      providerConfigUpdateRequest: providerConfigUpdateRequestSchema,
      providerConfigUpdateResponse: providerConfigUpdateResponseSchema,
      providerTestRequest: providerTestRequestSchema,
      providerTestResponse: providerTestResponseSchema,
      cleanupRequest: cleanupRequestSchema,
      cleanupResponse: cleanupResponseSchema
    }
  },
  {
    relativePath: "api/fixtures/risk.json",
    schemaMap: {
      riskConfirmationRequest: riskConfirmationRequestSchema,
      riskConfirmationResponse: riskConfirmationResponseSchema,
      riskStatusRequest: riskStatusRequestSchema,
      riskStatusResponse: riskStatusResponseSchema
    }
  },
  {
    relativePath: "api/fixtures/export.json",
    schemaMap: {
      reportExportRequest: reportExportRequestSchema,
      reportExportResponse: reportExportResponseSchema,
      batchExportRequest: batchExportRequestSchema,
      batchExportResponse: batchExportResponseSchema,
      historyRequest: historyRequestSchema,
      historyResponse: historyResponseSchema
    }
  },
  {
    relativePath: "api/fixtures/health.json",
    schemaMap: {
      systemHealthRequest: systemHealthRequestSchema,
      systemHealthResponse: systemHealthResponseSchema,
      systemStatusRequest: systemStatusRequestSchema,
      systemStatusResponse: systemStatusResponseSchema,
      workflowStatusRequest: workflowStatusRequestSchema,
      workflowStatusResponse: workflowStatusResponseSchema
    }
  }
];

const reportFixtureSpecs = [
  {
    relativePath: "reports/fixtures/counseling-report.json",
    schema: counselingReportSchema
  },
  {
    relativePath: "reports/fixtures/simulation-report.json",
    schema: simulationReportSchema
  },
  {
    relativePath: "reports/fixtures/resonance-report.json",
    schema: resonanceReportSchema
  }
];

function loadJson(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function formatIssues(issues) {
  return issues
    .map((issue) => {
      const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `${issuePath}: ${issue.message}`;
    })
    .join("; ");
}

function validateNamedFixtures(relativePath, schemaMap) {
  const payload = loadJson(relativePath);
  const actualKeys = Object.keys(payload).sort();
  const expectedKeys = Object.keys(schemaMap).sort();

  if (actualKeys.join("|") !== expectedKeys.join("|")) {
    throw new Error(
      `${relativePath} keys mismatch. expected=[${expectedKeys.join(", ")}] actual=[${actualKeys.join(", ")}]`
    );
  }

  for (const [fixtureName, schema] of Object.entries(schemaMap)) {
    const result = schema.safeParse(payload[fixtureName]);
    if (!result.success) {
      throw new Error(`${relativePath} -> ${fixtureName} invalid: ${formatIssues(result.error.issues)}`);
    }
  }

  console.log(`validated ${relativePath} (${expectedKeys.length} fixtures)`);
}

function validateSingleFixture(relativePath, schema) {
  const payload = loadJson(relativePath);
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(`${relativePath} invalid: ${formatIssues(result.error.issues)}`);
  }

  console.log(`validated ${relativePath}`);
}

for (const spec of apiFixtureSpecs) {
  validateNamedFixtures(spec.relativePath, spec.schemaMap);
}

for (const spec of reportFixtureSpecs) {
  validateSingleFixture(spec.relativePath, spec.schema);
}

console.log("all fixtures validated successfully");
