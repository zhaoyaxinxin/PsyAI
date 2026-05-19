import type {
  SimulationAdvanceRequest,
  SimulationAdvanceResponse,
  SimulationFinishRequest,
  SimulationFinishResponse,
  SimulationNodeRequest,
  SimulationNodeResponse,
  SimulationPrepareRequest,
  SimulationPrepareResponse,
  SimulationReportRequest,
  SimulationReportResponse,
  SimulationRunRequest,
  SimulationRunResponse,
  SimulationScenarioRequest,
  SimulationScenarioResponse
} from "@psyai/contracts";

import {
  SimulationRunNotFoundError,
  SimulationScenarioNotFoundError
} from "../errors.js";
import type { SimulationReportPort } from "../ports/simulation-report-port.js";
import { toSimulationReportInput } from "../reporting/simulation-report-input.js";
import type {
  SimulationRepository,
  SimulationRunListQuery
} from "../ports/simulation-repository.js";
import type { SimulationWorkflowAdapter } from "../workflow/simulation-workflow-adapter.js";
import { getAvailableBranches, getSelectedBranch } from "../rules/branch-rule-engine.js";
import {
  advanceSimulationRun,
  attachSimulationReportReference,
  createSimulationPreparation,
  createSimulationRun,
  finishSimulationRun,
  getCurrentNode,
  toSimulationAdvanceData,
  toSimulationFinishData,
  toSimulationNodeData,
  toSimulationPrepareData,
  toSimulationRunData,
  toSimulationScenarioData,
  type SimulationActionOption,
  type SimulationPreparationSnapshot,
  type SimulationRun,
  type SimulationScenario
} from "../simulation/simulation-run.js";

type SimulationPrepareRequestOverrides = SimulationPrepareRequest & {
  playerProfile?: {
    displayName?: string;
    identity?: string;
    publicGoal?: string;
    hiddenPressure?: string;
    coreBelief?: string;
    emotionalTrait?: string;
    currentState?: string;
  };
  npcProfiles?: Array<{
    displayName?: string;
    identity?: string;
    publicGoal?: string;
    hiddenPressure?: string;
    coreBelief?: string;
    emotionalTrait?: string;
    currentState?: string;
  }>;
  environmentProfile?: {
    displayName?: string;
    era?: string;
    location?: string;
    socialRule?: string;
    pressureSource?: string;
    eventBias?: string;
    currentState?: string;
  };
};

type SimulationAdvanceRequestOverrides = SimulationAdvanceRequest & {
  customActionText?: string;
};

export interface SimulationIdGenerator {
  nextRunId(): string;
  nextTimelineEntryId(): string;
  nextPrepareId?(): string;
}

export interface SimulationRunListItem {
  runId: string;
  scenarioId: string;
  scenarioTitle: string;
  status: string;
  stage?: string;
  currentTurnIndex?: number;
  currentNodeId: string;
  currentNodeTitle: string;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
  reportReady: boolean;
}

export interface SimulationUseCases {
  getScenario(
    request: SimulationScenarioRequest
  ): Promise<SimulationScenarioResponse["data"]>;
  prepareScenario(
    request: SimulationPrepareRequest,
    occurredAt?: string
  ): Promise<SimulationPrepareResponse["data"]>;
  createRun(
    request: SimulationRunRequest,
    occurredAt?: string
  ): Promise<SimulationRunResponse["data"]>;
  getRun(runId: string): Promise<SimulationRunResponse["data"]>;
  getNode(
    request: SimulationNodeRequest
  ): Promise<SimulationNodeResponse["data"]>;
  advanceRun(
    request: SimulationAdvanceRequest,
    occurredAt?: string
  ): Promise<SimulationAdvanceResponse["data"]>;
  finishRun(
    request: SimulationFinishRequest,
    occurredAt?: string
  ): Promise<SimulationFinishResponse["data"]>;
  getReportStatus(
    request: SimulationReportRequest
  ): Promise<SimulationReportResponse["data"]>;
  listRuns(query?: SimulationRunListQuery): Promise<{
    items: SimulationRunListItem[];
    totalItems: number;
  }>;
  getResumableRun(): Promise<SimulationRunListItem | null>;
}

export interface CreateSimulationUseCasesOptions {
  repository: SimulationRepository;
  workflow: SimulationWorkflowAdapter;
  reportPort?: SimulationReportPort;
  ids?: SimulationIdGenerator;
  now?: () => string;
}

function createDefaultIdGenerator(): SimulationIdGenerator {
  let runCounter = 0;
  let timelineCounter = 0;
  let prepareCounter = 0;

  return {
    nextRunId() {
      runCounter += 1;
      return `sim-run-${String(runCounter).padStart(3, "0")}`;
    },
    nextTimelineEntryId() {
      timelineCounter += 1;
      return `sim-timeline-${String(timelineCounter).padStart(3, "0")}`;
    },
    nextPrepareId() {
      prepareCounter += 1;
      return `sim-prepare-${String(prepareCounter).padStart(3, "0")}`;
    }
  };
}

async function loadScenarioOrThrow(
  repository: SimulationRepository,
  scenarioId: string
): Promise<SimulationScenario> {
  const scenario = await repository.getScenarioById(scenarioId);

  if (scenario === null) {
    throw new SimulationScenarioNotFoundError(scenarioId);
  }

  return scenario;
}

async function loadRunOrThrow(
  repository: SimulationRepository,
  runId: string
): Promise<SimulationRun> {
  const run = await repository.getRunById(runId);

  if (run === null) {
    throw new SimulationRunNotFoundError(runId);
  }

  return run;
}

async function loadRunAndScenarioOrThrow(
  repository: SimulationRepository,
  runId: string
): Promise<{
  run: SimulationRun;
  scenario: SimulationScenario;
}> {
  const run = await loadRunOrThrow(repository, runId);
  const scenario = await loadScenarioOrThrow(repository, run.scenarioId);

  return {
    run,
    scenario
  };
}

function toPreparationActorStates(
  preparation: SimulationPreparationSnapshot,
  occurredAt: string
) {
  return [
    {
      actorId: preparation.cast.player.agentId,
      actorName: preparation.cast.player.displayName,
      currentState: preparation.cast.player.currentState,
      updatedAt: occurredAt
    },
    ...preparation.cast.npcs.map((npc) => ({
      actorId: npc.agentId,
      actorName: npc.displayName,
      currentState: npc.currentState,
      updatedAt: occurredAt
    }))
  ];
}

function toActionFromBranch(run: SimulationRun, branchId: string): SimulationActionOption | undefined {
  return run.activeOptions.find((option) => option.actionId === branchId);
}

function applyCustomActionText(
  action: SimulationActionOption,
  customActionText: string | undefined
): SimulationActionOption {
  const trimmed = customActionText?.trim();
  if (!trimmed) {
    return action;
  }

  return {
    ...action,
    label: trimmed,
    intent: trimmed
  };
}

function applyBranchFlags(currentFlags: readonly string[], branch: { clearFlags?: string[]; setFlags?: string[] }): string[] {
  const nextFlags = new Set(currentFlags);

  for (const flag of branch.clearFlags ?? []) {
    nextFlags.delete(flag);
  }

  for (const flag of branch.setFlags ?? []) {
    nextFlags.add(flag);
  }

  return [...nextFlags];
}

function buildActionsForNode(
  scenario: SimulationScenario,
  run: SimulationRun,
  nodeId: string,
  routeFlags: readonly string[]
): SimulationActionOption[] {
  const branches = getAvailableBranches(scenario, { ...run, currentNodeId: nodeId, routeFlags: [...routeFlags] }, nodeId);
  return branches.map((branch) => ({
    actionId: branch.branchId,
    label: branch.label,
    intent: `推进到 ${branch.nextNodeId}`,
    riskHint: "该行动会把局势推向新的节点。"
  }));
}

function isDuplicateLatestBranchSelection(
  run: SimulationRun,
  selectedBranchId: string
): boolean {
  const latestTimelineEntry = run.timeline[run.timeline.length - 1];
  if (!latestTimelineEntry) {
    return false;
  }

  return (
    latestTimelineEntry.nodeId === run.currentNodeId &&
    latestTimelineEntry.selectedBranchId === selectedBranchId
  );
}

export function createSimulationUseCases(
  options: CreateSimulationUseCasesOptions
): SimulationUseCases {
  const ids = options.ids ?? createDefaultIdGenerator();
  const now = options.now ?? (() => new Date().toISOString());
  const preparations = new Map<string, SimulationPreparationSnapshot>();

  return {
    async getScenario(request) {
      const scenario = await loadScenarioOrThrow(options.repository, request.scenarioId);
      return toSimulationScenarioData(scenario);
    },

    async prepareScenario(request, occurredAt = now()) {
      const prepareRequest = request as SimulationPrepareRequestOverrides;
      const scenario = await loadScenarioOrThrow(options.repository, request.scenarioId);
      const prepareId =
        ids.nextPrepareId?.() ?? `sim-prepare-${request.scenarioId}-${occurredAt}`;
      let preparation = createSimulationPreparation({
          scenario,
          occurredAt,
          prepareId,
          ...(prepareRequest.sourceNotes ? { sourceNotes: prepareRequest.sourceNotes } : {}),
          ...(prepareRequest.playerName ? { playerName: prepareRequest.playerName } : {}),
          ...(prepareRequest.playerProfile ? { playerProfile: prepareRequest.playerProfile } : {}),
          ...(prepareRequest.npcProfiles ? { npcProfiles: prepareRequest.npcProfiles } : {}),
          ...(prepareRequest.environmentProfile ? { environmentProfile: prepareRequest.environmentProfile } : {})
        });

      if (options.workflow.prepare) {
        const runtimePreparation = await options.workflow.prepare({
          scenarioId: scenario.scenarioId,
          scenarioTitle: scenario.title,
          occurredAt,
          ...(prepareRequest.sourceNotes ? { sourceNotes: prepareRequest.sourceNotes } : {}),
          ...(request.operatorNote ? { operatorNote: request.operatorNote } : {})
        });

        if (runtimePreparation.summary) {
          preparation = {
            ...preparation,
            summary: runtimePreparation.summary
          };
        }
      }

      preparations.set(prepareId, structuredClone(preparation));
      return toSimulationPrepareData(scenario, preparation);
    },

    async createRun(request, occurredAt = now()) {
      const scenario = await loadScenarioOrThrow(options.repository, request.scenarioId);
      const runId = ids.nextRunId();
      const entryId = ids.nextTimelineEntryId();
      const prepareId =
        request.prepareId ?? ids.nextPrepareId?.() ?? `${runId}-prepare`;
      const preparation =
        (request.prepareId ? preparations.get(request.prepareId) : undefined) ??
        createSimulationPreparation({
          scenario,
          occurredAt,
          prepareId
        });

      preparations.set(prepareId, structuredClone(preparation));
      const runtimeSeedStates = toPreparationActorStates(preparation, occurredAt);
      const initialRun = createSimulationRun({
        runId,
        scenario,
        occurredAt,
        entryId,
        prepareId,
        preparation,
        ...(request.operatorNote ? { operatorNote: request.operatorNote } : {})
      });
      const entryNode = getCurrentNode(scenario, initialRun);
      const runtimeOutput = await options.workflow.start({
        scenarioId: scenario.scenarioId,
        scenarioTitle: scenario.title,
        currentNodeId: entryNode.nodeId,
        currentNodeTitle: entryNode.title,
        currentNodeSummary: entryNode.summary,
        occurredAt,
        ...(request.operatorNote ? { operatorNote: request.operatorNote } : {}),
        actorStates: runtimeSeedStates,
        preparation,
        activeOptions: initialRun.activeOptions
      });
      let run = createSimulationRun({
        runId,
        scenario,
        occurredAt,
        entryId,
        prepareId,
        preparation,
        ...(request.operatorNote ? { operatorNote: request.operatorNote } : {}),
        ...(runtimeOutput.actorStates
          ? { initialActorStates: runtimeOutput.actorStates }
          : {}),
        ...(runtimeOutput.activeOptions ? { activeOptions: runtimeOutput.activeOptions } : {}),
        ...(runtimeOutput.environmentState ? { environmentState: runtimeOutput.environmentState } : {})
      });

      if (run.status === "completed" && options.reportPort) {
        const reportInput = toSimulationReportInput(scenario, run);
        const reportReference = await options.reportPort.createReportReference({
          scenario,
          run,
          reportInput
        });

        if (reportReference) {
          run = attachSimulationReportReference(run, reportReference);
        }
      }

      await options.repository.saveRun(run);
      return toSimulationRunData(scenario, run);
    },

    async getRun(runId) {
      const { run, scenario } = await loadRunAndScenarioOrThrow(options.repository, runId);
      return toSimulationRunData(scenario, run);
    },

    async getNode(request) {
      const { run, scenario } = await loadRunAndScenarioOrThrow(
        options.repository,
        request.runId
      );

      return toSimulationNodeData(scenario, run, request.nodeId);
    },

    async advanceRun(request, occurredAt = now()) {
      const advanceRequest = request as SimulationAdvanceRequestOverrides;
      const { run, scenario } = await loadRunAndScenarioOrThrow(
        options.repository,
        request.runId
      );
      const previousNode = getCurrentNode(scenario, run);
      const selectedBranchId = advanceRequest.branchId ?? advanceRequest.actionId;
      if (!selectedBranchId) {
        throw new Error("Simulation advance request requires branchId or actionId");
      }
      if (isDuplicateLatestBranchSelection(run, selectedBranchId)) {
        return toSimulationAdvanceData(scenario, previousNode.nodeId, run);
      }
      const branch = getSelectedBranch(scenario, run, selectedBranchId);
      const nextNode = getCurrentNode(scenario, {
        ...run,
        currentNodeId: branch.nextNodeId
      });
      const nextRouteFlags = applyBranchFlags(run.routeFlags, branch);
      const scenarioNextActions = buildActionsForNode(scenario, run, nextNode.nodeId, nextRouteFlags);
      const selectedAction =
        applyCustomActionText(
          run.activeOptions.find((option) => option.actionId === selectedBranchId) ??
            toActionFromBranch(run, branch.branchId) ?? {
              actionId: branch.branchId,
              label: branch.label,
              intent: branch.nextNodeId,
              riskHint: "由旧分支兼容映射生成。"
            },
          advanceRequest.customActionText
        );
      const runtimeOutput = await options.workflow.advance({
        scenarioId: scenario.scenarioId,
        runId: run.runId,
        previousNodeId: previousNode.nodeId,
        previousNodeTitle: previousNode.title,
        nextNodeId: nextNode.nodeId,
        nextNodeTitle: nextNode.title,
        selectedBranchId: branch.branchId,
        selectedBranchLabel: branch.label,
        occurredAt,
        ...(advanceRequest.rationale ? { rationale: advanceRequest.rationale } : {}),
        actorStates: run.actorStates,
        currentTurnIndex: run.currentTurnIndex,
        selectedAction,
        nextActionOptions:
          scenarioNextActions.length > 0
            ? scenarioNextActions
            : run.activeOptions,
        ...(run.environmentState ? { environmentState: run.environmentState } : {}),
        ...(run.preparation ? { preparation: run.preparation } : {})
      });
      let nextRun = advanceSimulationRun({
        scenario,
        run,
        branch,
        occurredAt,
        entryId: ids.nextTimelineEntryId(),
        ...(advanceRequest.rationale ? { rationale: advanceRequest.rationale } : {}),
        ...(runtimeOutput.actorStates ? { actorStates: runtimeOutput.actorStates } : {}),
        ...((runtimeOutput.activeOptions && runtimeOutput.activeOptions.length > 0)
          ? { nextActionOptions: runtimeOutput.activeOptions }
          : scenarioNextActions.length > 0
            ? { nextActionOptions: scenarioNextActions }
            : {}),
        ...(runtimeOutput.environmentState ? { environmentState: runtimeOutput.environmentState } : {}),
        ...(runtimeOutput.turnOutcome ? { turnOutcome: runtimeOutput.turnOutcome } : {}),
        selectedAction
      });

      if (nextRun.status === "completed" && options.reportPort) {
        const reportInput = toSimulationReportInput(scenario, nextRun);
        const reportReference = await options.reportPort.createReportReference({
          scenario,
          run: nextRun,
          reportInput
        });

        if (reportReference) {
          nextRun = attachSimulationReportReference(nextRun, reportReference);
        }
      }

      await options.repository.saveRun(nextRun);
      return toSimulationAdvanceData(scenario, previousNode.nodeId, nextRun);
    },

    async finishRun(request, occurredAt = now()) {
      const { run, scenario } = await loadRunAndScenarioOrThrow(
        options.repository,
        request.runId
      );
      let finishedRun = finishSimulationRun({
        run,
        occurredAt
      });

      if (!finishedRun.reportReference && options.reportPort) {
        const reportInput = toSimulationReportInput(scenario, finishedRun);
        const reportReference = await options.reportPort.createReportReference({
          scenario,
          run: finishedRun,
          reportInput
        });

        if (reportReference) {
          finishedRun = attachSimulationReportReference(finishedRun, reportReference);
        }
      }

      await options.repository.saveRun(finishedRun);
      return toSimulationFinishData(finishedRun);
    },

    async getReportStatus(request) {
      const { run } = await loadRunAndScenarioOrThrow(options.repository, request.runId);

      return {
        runId: run.runId,
        ready: Boolean(run.reportReference),
        ...(run.reportReference ? { reportReference: run.reportReference } : {})
      };
    },

    async listRuns(query) {
      const result = await options.repository.listRuns(query ?? {});
      const items: SimulationRunListItem[] = [];
      for (const run of result.items) {
        const scenario = await options.repository.getScenarioById(run.scenarioId);
        items.push(toRunListItem(run, scenario));
      }
      return { items, totalItems: result.totalItems };
    },

    async getResumableRun() {
      const run = await options.repository.getMostRecentActive();
      if (!run) return null;
      const scenario = await options.repository.getScenarioById(run.scenarioId);
      return toRunListItem(run, scenario);
    }
  };
}

function toRunListItem(
  run: SimulationRun,
  scenario: SimulationScenario | null
): SimulationRunListItem {
  const currentNodeId = run.currentNodeId;
  const currentNodeTitle = scenario?.nodes.find((n) => n.nodeId === currentNodeId)?.title ?? currentNodeId;

  return {
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioTitle: scenario?.title ?? run.scenarioId,
    status: run.status,
    stage: run.stage,
    currentTurnIndex: run.currentTurnIndex,
    currentNodeId,
    currentNodeTitle,
    nodeCount: run.timeline.length,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    reportReady: Boolean(run.reportReference)
  };
}
