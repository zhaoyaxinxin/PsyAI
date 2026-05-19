import {
  counselingFinishRequestSchema,
  counselingFinishResponseSchema,
  counselingGetRequestSchema,
  counselingGetResponseSchema,
  counselingListRequestSchema,
  counselingListResponseSchema,
  counselingReportSchema,
  counselingReportRequestSchema,
  counselingReportResponseSchema,
  counselingReplyRequestSchema,
  counselingReplyResponseSchema,
  counselingStartRequestSchema,
  counselingStartResponseSchema,
  resonanceCompareRequestSchema,
  resonanceCompareResponseSchema,
  resonanceDetailRequestSchema,
  resonanceDetailResponseSchema,
  resonanceAnalyzeRequestSchema,
  resonanceAnalyzeResponseSchema,
  resonanceFinishRequestSchema,
  resonanceFinishResponseSchema,
  resonanceInputRequestSchema,
  resonanceInputResponseSchema,
  resonanceListRequestSchema,
  resonanceListResponseSchema,
  resonanceMatchesRequestSchema,
  resonanceMatchesResponseSchema,
  resonanceReportSchema,
  resonanceReportRequestSchema,
  resonanceReportResponseSchema,
  simulationAdvanceRequestSchema,
  simulationAdvanceResponseSchema,
  simulationFinishRequestSchema,
  simulationFinishResponseSchema,
  simulationListRequestSchema,
  simulationListResponseSchema,
  simulationNodeRequestSchema,
  simulationNodeResponseSchema,
  simulationPrepareRequestSchema,
  simulationPrepareResponseSchema,
  simulationReportSchema,
  simulationReportRequestSchema,
  simulationReportResponseSchema,
  simulationRunRequestSchema,
  simulationRunResponseSchema,
  simulationScenarioRequestSchema,
  simulationScenarioResponseSchema,
  type CounselingFinishRequest,
  type CounselingFinishResponse,
  type CounselingGetRequest,
  type CounselingGetResponse,
  type CounselingListRequest,
  type CounselingListResponse,
  type CounselingReport,
  type CounselingReportRequest,
  type CounselingReportResponse,
  type CounselingReplyRequest,
  type CounselingReplyResponse,
  type CounselingStartRequest,
  type CounselingStartResponse,
  type ResonanceCompareRequest,
  type ResonanceCompareResponse,
  type ResonanceDetailRequest,
  type ResonanceDetailResponse,
  type ResonanceAnalyzeRequest,
  type ResonanceAnalyzeResponse,
  type ResonanceFinishRequest,
  type ResonanceFinishResponse,
  type ResonanceInputRequest,
  type ResonanceInputResponse,
  type ResonanceListRequest,
  type ResonanceListResponse,
  type ResonanceMatchesRequest,
  type ResonanceMatchesResponse,
  type ResonanceReport,
  type ResonanceReportRequest,
  type ResonanceReportResponse,
  type SimulationAdvanceRequest,
  type SimulationAdvanceResponse,
  type SimulationFinishRequest,
  type SimulationFinishResponse,
  type SimulationListRequest,
  type SimulationListResponse,
  type SimulationNodeRequest,
  type SimulationNodeResponse,
  type SimulationPrepareRequest,
  type SimulationPrepareResponse,
  type SimulationReport,
  type SimulationReportRequest,
  type SimulationReportResponse,
  type SimulationRunRequest,
  type SimulationRunResponse,
  type SimulationScenarioRequest,
  type SimulationScenarioResponse
} from "@psyai/contracts";
import { frontendFixtureBundle } from "./frontend-fixture-bundle.js";

export interface FrontendApiFixtures {
  counseling: {
    startRequest: CounselingStartRequest;
    startResponse: CounselingStartResponse;
    replyRequest: CounselingReplyRequest;
    replyResponse: CounselingReplyResponse;
    finishRequest: CounselingFinishRequest;
    finishResponse: CounselingFinishResponse;
    getRequest: CounselingGetRequest;
    getResponse: CounselingGetResponse;
    listRequest: CounselingListRequest;
    listResponse: CounselingListResponse;
    reportRequest: CounselingReportRequest;
    reportResponse: CounselingReportResponse;
  };
  simulation: {
    scenarioRequest: SimulationScenarioRequest;
    scenarioResponse: SimulationScenarioResponse;
    prepareRequest: SimulationPrepareRequest;
    prepareResponse: SimulationPrepareResponse;
    runRequest: SimulationRunRequest;
    runResponse: SimulationRunResponse;
    nodeRequest: SimulationNodeRequest;
    nodeResponse: SimulationNodeResponse;
    advanceRequest: SimulationAdvanceRequest;
    advanceResponse: SimulationAdvanceResponse;
    finishRequest: SimulationFinishRequest;
    finishResponse: SimulationFinishResponse;
    listRequest: SimulationListRequest;
    listResponse: SimulationListResponse;
    reportRequest: SimulationReportRequest;
    reportResponse: SimulationReportResponse;
  };
  resonance: {
    inputRequest: ResonanceInputRequest;
    inputResponse: ResonanceInputResponse;
    analyzeRequest: ResonanceAnalyzeRequest;
    analyzeResponse: ResonanceAnalyzeResponse;
    compareRequest: ResonanceCompareRequest;
    compareResponse: ResonanceCompareResponse;
    matchesRequest: ResonanceMatchesRequest;
    matchesResponse: ResonanceMatchesResponse;
    finishRequest: ResonanceFinishRequest;
    finishResponse: ResonanceFinishResponse;
    detailRequest: ResonanceDetailRequest;
    detailResponse: ResonanceDetailResponse;
    listRequest: ResonanceListRequest;
    listResponse: ResonanceListResponse;
    reportRequest: ResonanceReportRequest;
    reportResponse: ResonanceReportResponse;
  };
}

export interface FrontendReportFixtures {
  counseling: CounselingReport;
  simulation: SimulationReport;
  resonance: ResonanceReport;
}

export interface FrontendFixtureBundle {
  api: FrontendApiFixtures;
  reports: FrontendReportFixtures;
}

function cloneValue<TValue>(value: TValue): TValue {
  return JSON.parse(JSON.stringify(value)) as TValue;
}

let cachedBundle: FrontendFixtureBundle | null = null;

export function loadFrontendFixtureBundle(): FrontendFixtureBundle {
  if (cachedBundle) {
    return cloneValue(cachedBundle);
  }
  const counselingApi = frontendFixtureBundle.api.counseling;
  const simulationApi = frontendFixtureBundle.api.simulation;
  const resonanceApi = frontendFixtureBundle.api.resonance;

  cachedBundle = {
    api: {
      counseling: {
        startRequest: counselingStartRequestSchema.parse(counselingApi.startRequest),
        startResponse: counselingStartResponseSchema.parse(counselingApi.startResponse),
        replyRequest: counselingReplyRequestSchema.parse(counselingApi.replyRequest),
        replyResponse: counselingReplyResponseSchema.parse(counselingApi.replyResponse),
        finishRequest: counselingFinishRequestSchema.parse(counselingApi.finishRequest),
        finishResponse: counselingFinishResponseSchema.parse(counselingApi.finishResponse),
        getRequest: counselingGetRequestSchema.parse(counselingApi.getRequest),
        getResponse: counselingGetResponseSchema.parse(counselingApi.getResponse),
        listRequest: counselingListRequestSchema.parse(counselingApi.listRequest),
        listResponse: counselingListResponseSchema.parse(counselingApi.listResponse),
        reportRequest: counselingReportRequestSchema.parse(counselingApi.reportRequest),
        reportResponse: counselingReportResponseSchema.parse(counselingApi.reportResponse)
      },
      simulation: {
        scenarioRequest: simulationScenarioRequestSchema.parse(simulationApi.scenarioRequest),
        scenarioResponse: simulationScenarioResponseSchema.parse(simulationApi.scenarioResponse),
        prepareRequest: simulationPrepareRequestSchema.parse(simulationApi.prepareRequest),
        prepareResponse: simulationPrepareResponseSchema.parse(simulationApi.prepareResponse),
        runRequest: simulationRunRequestSchema.parse(simulationApi.runRequest),
        runResponse: simulationRunResponseSchema.parse(simulationApi.runResponse),
        nodeRequest: simulationNodeRequestSchema.parse(simulationApi.nodeRequest),
        nodeResponse: simulationNodeResponseSchema.parse(simulationApi.nodeResponse),
        advanceRequest: simulationAdvanceRequestSchema.parse(simulationApi.advanceRequest),
        advanceResponse: simulationAdvanceResponseSchema.parse(simulationApi.advanceResponse),
        finishRequest: simulationFinishRequestSchema.parse(simulationApi.finishRequest),
        finishResponse: simulationFinishResponseSchema.parse(simulationApi.finishResponse),
        listRequest: simulationListRequestSchema.parse(simulationApi.listRequest),
        listResponse: simulationListResponseSchema.parse(simulationApi.listResponse),
        reportRequest: simulationReportRequestSchema.parse(simulationApi.reportRequest),
        reportResponse: simulationReportResponseSchema.parse(simulationApi.reportResponse)
      },
      resonance: {
        inputRequest: resonanceInputRequestSchema.parse(resonanceApi.inputRequest),
        inputResponse: resonanceInputResponseSchema.parse(resonanceApi.inputResponse),
        analyzeRequest: resonanceAnalyzeRequestSchema.parse(resonanceApi.analyzeRequest),
        analyzeResponse: resonanceAnalyzeResponseSchema.parse(resonanceApi.analyzeResponse),
        compareRequest: resonanceCompareRequestSchema.parse(resonanceApi.compareRequest),
        compareResponse: resonanceCompareResponseSchema.parse(resonanceApi.compareResponse),
        matchesRequest: resonanceMatchesRequestSchema.parse(resonanceApi.matchesRequest),
        matchesResponse: resonanceMatchesResponseSchema.parse(resonanceApi.matchesResponse),
        finishRequest: resonanceFinishRequestSchema.parse(resonanceApi.finishRequest),
        finishResponse: resonanceFinishResponseSchema.parse(resonanceApi.finishResponse),
        detailRequest: resonanceDetailRequestSchema.parse(resonanceApi.detailRequest),
        detailResponse: resonanceDetailResponseSchema.parse(resonanceApi.detailResponse),
        listRequest: resonanceListRequestSchema.parse(resonanceApi.listRequest),
        listResponse: resonanceListResponseSchema.parse(resonanceApi.listResponse),
        reportRequest: resonanceReportRequestSchema.parse(resonanceApi.reportRequest),
        reportResponse: resonanceReportResponseSchema.parse(resonanceApi.reportResponse)
      }
    },
    reports: {
      counseling: counselingReportSchema.parse(frontendFixtureBundle.reports.counseling),
      simulation: simulationReportSchema.parse(frontendFixtureBundle.reports.simulation),
      resonance: resonanceReportSchema.parse(frontendFixtureBundle.reports.resonance)
    }
  };

  return cloneValue(cachedBundle);
}
