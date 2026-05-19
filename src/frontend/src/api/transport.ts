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
  counselingStartResponseSchema,
  resonanceAnalyzeRequestSchema,
  resonanceAnalyzeResponseSchema,
  resonanceCompareRequestSchema,
  resonanceCompareResponseSchema,
  resonanceDetailRequestSchema,
  resonanceDetailResponseSchema,
  resonanceInputRequestSchema,
  resonanceInputResponseSchema,
  resonanceListRequestSchema,
  resonanceListResponseSchema,
  resonanceMatchesRequestSchema,
  resonanceMatchesResponseSchema,
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
  type CounselingReplyRequest,
  type CounselingReplyResponse,
  type CounselingReportRequest,
  type CounselingReportResponse,
  type CounselingStartRequest,
  type CounselingStartResponse,
  type ResonanceAnalyzeRequest,
  type ResonanceAnalyzeResponse,
  type ResonanceCompareRequest,
  type ResonanceCompareResponse,
  type ResonanceDetailRequest,
  type ResonanceDetailResponse,
  type ResonanceInputRequest,
  type ResonanceInputResponse,
  type ResonanceListRequest,
  type ResonanceListResponse,
  type ResonanceMatchesRequest,
  type ResonanceMatchesResponse,
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
  type SimulationReportRequest,
  type SimulationReportResponse,
  type SimulationRunRequest,
  type SimulationRunResponse,
  type SimulationScenarioRequest,
  type SimulationScenarioResponse
} from "@psyai/contracts";

export const frontendApiOperationValues = [
  "counseling.start",
  "counseling.reply",
  "counseling.finish",
  "counseling.get",
  "counseling.list",
  "counseling.report",
  "simulation.scenario",
  "simulation.prepare",
  "simulation.run",
  "simulation.node",
  "simulation.advance",
  "simulation.finish",
  "simulation.list",
  "simulation.report",
  "resonance.input",
  "resonance.analyze",
  "resonance.compare",
  "resonance.matches",
  "resonance.detail",
  "resonance.list",
  "resonance.report"
] as const;

export type FrontendApiOperation = (typeof frontendApiOperationValues)[number];

export interface FrontendTransport {
  send(operation: FrontendApiOperation, payload: unknown): Promise<unknown>;
}

export interface CounselingApiClient {
  start(request: CounselingStartRequest): Promise<CounselingStartResponse>;
  reply(request: CounselingReplyRequest): Promise<CounselingReplyResponse>;
  finish(request: CounselingFinishRequest): Promise<CounselingFinishResponse>;
  get(request: CounselingGetRequest): Promise<CounselingGetResponse>;
  list(request: CounselingListRequest): Promise<CounselingListResponse>;
  getReportStatus(request: CounselingReportRequest): Promise<CounselingReportResponse>;
}

export interface SimulationApiClient {
  getScenario(request: SimulationScenarioRequest): Promise<SimulationScenarioResponse>;
  prepare(request: SimulationPrepareRequest): Promise<SimulationPrepareResponse>;
  startRun(request: SimulationRunRequest): Promise<SimulationRunResponse>;
  getNode(request: SimulationNodeRequest): Promise<SimulationNodeResponse>;
  advance(request: SimulationAdvanceRequest): Promise<SimulationAdvanceResponse>;
  finish(request: SimulationFinishRequest): Promise<SimulationFinishResponse>;
  list(request: SimulationListRequest): Promise<SimulationListResponse>;
  getReportStatus(request: SimulationReportRequest): Promise<SimulationReportResponse>;
}

export interface ResonanceApiClient {
  submitInput(request: ResonanceInputRequest): Promise<ResonanceInputResponse>;
  analyzeInput(request: ResonanceAnalyzeRequest): Promise<ResonanceAnalyzeResponse>;
  compare(request: ResonanceCompareRequest): Promise<ResonanceCompareResponse>;
  getMatches(request: ResonanceMatchesRequest): Promise<ResonanceMatchesResponse>;
  getDetail(request: ResonanceDetailRequest): Promise<ResonanceDetailResponse>;
  list(request: ResonanceListRequest): Promise<ResonanceListResponse>;
  getReportStatus(request: ResonanceReportRequest): Promise<ResonanceReportResponse>;
}

export interface FrontendApiClients {
  counseling: CounselingApiClient;
  simulation: SimulationApiClient;
  resonance: ResonanceApiClient;
}

async function sendValidated<TRequest, TResponse>(
  transport: FrontendTransport,
  operation: FrontendApiOperation,
  requestSchema: { parse(value: unknown): TRequest },
  responseSchema: { parse(value: unknown): TResponse },
  payload: TRequest
): Promise<TResponse> {
  const parsedPayload = requestSchema.parse(payload);
  const response = await transport.send(operation, parsedPayload);
  return responseSchema.parse(response);
}

export function createApiClients(transport: FrontendTransport): FrontendApiClients {
  return {
    counseling: {
      start(request) {
        return sendValidated(
          transport,
          "counseling.start",
          counselingStartRequestSchema,
          counselingStartResponseSchema,
          request
        );
      },
      reply(request) {
        return sendValidated(
          transport,
          "counseling.reply",
          counselingReplyRequestSchema,
          counselingReplyResponseSchema,
          request
        );
      },
      finish(request) {
        return sendValidated(
          transport,
          "counseling.finish",
          counselingFinishRequestSchema,
          counselingFinishResponseSchema,
          request
        );
      },
      get(request) {
        return sendValidated(
          transport,
          "counseling.get",
          counselingGetRequestSchema,
          counselingGetResponseSchema,
          request
        );
      },
      list(request) {
        return sendValidated(
          transport,
          "counseling.list",
          counselingListRequestSchema,
          counselingListResponseSchema,
          request
        );
      },
      getReportStatus(request) {
        return sendValidated(
          transport,
          "counseling.report",
          counselingReportRequestSchema,
          counselingReportResponseSchema,
          request
        );
      }
    },
    simulation: {
      getScenario(request) {
        return sendValidated(
          transport,
          "simulation.scenario",
          simulationScenarioRequestSchema,
          simulationScenarioResponseSchema,
          request
        );
      },
      prepare(request) {
        return sendValidated(
          transport,
          "simulation.prepare",
          simulationPrepareRequestSchema,
          simulationPrepareResponseSchema,
          request
        );
      },
      startRun(request) {
        return sendValidated(
          transport,
          "simulation.run",
          simulationRunRequestSchema,
          simulationRunResponseSchema,
          request
        );
      },
      getNode(request) {
        return sendValidated(
          transport,
          "simulation.node",
          simulationNodeRequestSchema,
          simulationNodeResponseSchema,
          request
        );
      },
      advance(request) {
        return sendValidated(
          transport,
          "simulation.advance",
          simulationAdvanceRequestSchema,
          simulationAdvanceResponseSchema,
          request
        );
      },
      finish(request) {
        return sendValidated(
          transport,
          "simulation.finish",
          simulationFinishRequestSchema,
          simulationFinishResponseSchema,
          request
        );
      },
      list(request) {
        return sendValidated(
          transport,
          "simulation.list",
          simulationListRequestSchema,
          simulationListResponseSchema,
          request
        );
      },
      getReportStatus(request) {
        return sendValidated(
          transport,
          "simulation.report",
          simulationReportRequestSchema,
          simulationReportResponseSchema,
          request
        );
      }
    },
    resonance: {
      submitInput(request) {
        return sendValidated(
          transport,
          "resonance.input",
          resonanceInputRequestSchema,
          resonanceInputResponseSchema,
          request
        );
      },
      analyzeInput(request) {
        return sendValidated(
          transport,
          "resonance.analyze",
          resonanceAnalyzeRequestSchema,
          resonanceAnalyzeResponseSchema,
          request
        );
      },
      compare(request) {
        return sendValidated(
          transport,
          "resonance.compare",
          resonanceCompareRequestSchema,
          resonanceCompareResponseSchema,
          request
        );
      },
      getMatches(request) {
        return sendValidated(
          transport,
          "resonance.matches",
          resonanceMatchesRequestSchema,
          resonanceMatchesResponseSchema,
          request
        );
      },
      getDetail(request) {
        return sendValidated(
          transport,
          "resonance.detail",
          resonanceDetailRequestSchema,
          resonanceDetailResponseSchema,
          request
        );
      },
      list(request) {
        return sendValidated(
          transport,
          "resonance.list",
          resonanceListRequestSchema,
          resonanceListResponseSchema,
          request
        );
      },
      getReportStatus(request) {
        return sendValidated(
          transport,
          "resonance.report",
          resonanceReportRequestSchema,
          resonanceReportResponseSchema,
          request
        );
      }
    }
  };
}
