import {
  type SimulationNodeKind,
  type SimulationRun,
  type SimulationScenario,
  type SimulationTimelineEntry
} from "../simulation/simulation-run.js";
import { getScenarioNode } from "../rules/branch-rule-engine.js";

export interface SimulationReportTimelineItem {
  entryId: string;
  occurredAt: string;
  nodeId: string;
  title: string;
  summary: string;
  selectedBranchLabel?: string;
}

export interface SimulationReportKeyNode {
  nodeId: string;
  title: string;
  kind: SimulationNodeKind;
  impactSummary: string;
  operatorRationale?: string;
}

export interface SimulationActorStateChange {
  actorId: string;
  actorName: string;
  beforeState: string;
  afterState: string;
  changeSummary: string;
}

export interface SimulationReportPreparation {
  scenarioTitle: string;
  playerSummary: string;
  npcSummaries: string[];
  environmentSummary: string;
  sourceNotes: string[];
}

export interface SimulationReportTurnOutcome {
  turnId: string;
  turnIndex: number;
  playerActionLabel: string;
  consequenceSummary: string;
  reactions: string[];
  dialogueLines: string[];
  interactionBeats: string[];
}

export interface SimulationRelationshipShift {
  agentId: string;
  displayName: string;
  shiftSummary: string;
}

export interface SimulationEnvironmentPressureEntry {
  turnIndex: number;
  label: string;
  summary: string;
}

export interface SimulationReportInput {
  scenarioId: string;
  runId: string;
  preparation: SimulationReportPreparation;
  overview: {
    scenarioTitle: string;
    scenarioSummary: string;
    startedAt: string;
    completedAt?: string;
    routeSummary: {
      visitedNodeCount: number;
      branchDecisionCount: number;
      endingNodeId?: string;
    };
  };
  timeline: SimulationReportTimelineItem[];
  keyNodes: SimulationReportKeyNode[];
  actorStateChanges: SimulationActorStateChange[];
  turnOutcomes: SimulationReportTurnOutcome[];
  relationshipShiftSummary: SimulationRelationshipShift[];
  environmentPressureLine: SimulationEnvironmentPressureEntry[];
}

function toTimelineItem(entry: SimulationTimelineEntry): SimulationReportTimelineItem {
  return {
    entryId: entry.entryId,
    occurredAt: entry.occurredAt,
    nodeId: entry.nodeId,
    title: entry.title,
    summary: entry.summary,
    ...(entry.selectedBranchLabel
      ? { selectedBranchLabel: entry.selectedBranchLabel }
      : {})
  };
}

function createImpactSummary(
  entry: SimulationTimelineEntry,
  index: number,
  total: number
): string {
  if (index === 0) {
    return "开启本局情境，并固定初始处境。";
  }

  if (index === total - 1) {
    return entry.selectedBranchLabel
      ? `在选择“${entry.selectedBranchLabel}”后收束本局走向。`
      : "完成路线收束，并固定最终结果。";
  }

  return entry.selectedBranchLabel
    ? `在选择“${entry.selectedBranchLabel}”后，形成一次关键路线偏转。`
    : "记录一次推进过程中的关键节点。";
}

function createKeyNodes(
  scenario: SimulationScenario,
  timeline: readonly SimulationTimelineEntry[]
): SimulationReportKeyNode[] {
  if (timeline.length === 0) {
    return [];
  }

  const seenNodeIds = new Set<string>();
  const keyNodes: SimulationReportKeyNode[] = [];

  timeline.forEach((entry, index) => {
    const node = getScenarioNode(scenario, entry.nodeId);
    const isKeyNode =
      index === 0 ||
      index === timeline.length - 1 ||
      node.kind === "decision" ||
      node.kind === "ending" ||
      Boolean(entry.operatorRationale);

    if (!isKeyNode || seenNodeIds.has(node.nodeId)) {
      return;
    }

    seenNodeIds.add(node.nodeId);
    keyNodes.push({
      nodeId: node.nodeId,
      title: node.title,
      kind: node.kind,
      impactSummary: createImpactSummary(entry, index, timeline.length),
      ...(entry.operatorRationale
        ? { operatorRationale: entry.operatorRationale }
        : {})
    });
  });

  if (keyNodes.length > 0) {
    return keyNodes;
  }

  const firstEntry = timeline[0];
  if (!firstEntry) {
    return [];
  }
  const firstNode = getScenarioNode(scenario, firstEntry.nodeId);

  return [
    {
      nodeId: firstNode.nodeId,
      title: firstNode.title,
      kind: firstNode.kind,
      impactSummary: createImpactSummary(firstEntry, 0, timeline.length)
    }
  ];
}

function createActorStateChanges(
  scenario: SimulationScenario,
  run: SimulationRun
): SimulationActorStateChange[] {
  const changesFromScenarioSeeds = scenario.actorSeeds.flatMap((actorSeed) => {
    const finalState = run.actorStates.find(
      (actorState) => actorState.actorId === actorSeed.actorId
    );

    if (!finalState || finalState.currentState === actorSeed.initialState) {
      return [];
    }

    return [
      {
        actorId: actorSeed.actorId,
        actorName: actorSeed.actorName,
        beforeState: actorSeed.initialState,
        afterState: finalState.currentState,
        changeSummary: `${actorSeed.actorName} 从“${actorSeed.initialState}”变化为“${finalState.currentState}”。`
      }
    ];
  });

  if (changesFromScenarioSeeds.length > 0) {
    return changesFromScenarioSeeds;
  }

  const latestTurnHistoryChanges = (run.turnHistory ?? []).flatMap((turn) =>
    turn.actorStateChanges.map((change) => ({
      actorId: change.agentId,
      actorName: change.displayName,
      beforeState: change.beforeState,
      afterState: change.afterState,
      changeSummary: change.summary
    }))
  );

  if (latestTurnHistoryChanges.length > 0) {
    return latestTurnHistoryChanges;
  }

  return run.actorStates.map((state) => ({
    actorId: state.actorId,
    actorName: state.actorName,
    beforeState: state.currentState,
    afterState: state.currentState,
    changeSummary: `${state.actorName} 的当前状态为“${state.currentState}”。`
  }));
}

function createPreparationInput(
  scenario: SimulationScenario,
  run: SimulationRun
): SimulationReportPreparation {
  const player = run.preparation?.cast.player;
  const npcs = run.preparation?.cast.npcs ?? [];
  const environment = run.preparation?.cast.environment;

  return {
    scenarioTitle: scenario.title,
    playerSummary: player
      ? `${player.displayName}：${player.persona.identity}；当前状态为“${player.currentState}”。`
      : "本局玩家角色已载入。",
    npcSummaries:
      npcs.length > 0
        ? npcs.map(
            (npc) => `${npc.displayName}：${npc.persona.identity}；当前状态为“${npc.currentState}”。`
          )
        : ["当前未补充其他角色画像。"],
    environmentSummary: environment
      ? `${environment.location}，压力来源为“${environment.pressureSource}”，当前状态为“${environment.currentState}”。`
      : scenario.description,
    sourceNotes: run.preparation?.sourceNotes ?? []
  };
}

function createTurnOutcomes(run: SimulationRun): SimulationReportTurnOutcome[] {
  const turnHistory = run.turnHistory ?? [];
  if (turnHistory.length === 0) {
    return [
      {
        turnId: run.timeline[run.timeline.length - 1]?.entryId ?? `${run.runId}-turn-000`,
        turnIndex: run.currentTurnIndex ?? 0,
        playerActionLabel: run.timeline[run.timeline.length - 1]?.selectedBranchLabel ?? "未记录行动",
        consequenceSummary:
          run.latestOutcome?.consequenceSummary ??
          run.timeline[run.timeline.length - 1]?.summary ??
          "当前运行记录没有提供回合结果。",
        reactions: [
          run.environmentState
            ? `环境：${run.environmentState}`
            : "环境：当前运行记录没有提供环境反馈。"
        ],
        dialogueLines: ["当前运行记录没有保存完整发言序列。"],
        interactionBeats: ["当前运行记录没有保存完整互动走势。"]
      }
    ];
  }

  return turnHistory.map((turn) => ({
    turnId: turn.turnId,
    turnIndex: turn.turnIndex,
    playerActionLabel: turn.playerAction.label,
    consequenceSummary: turn.consequenceSummary,
    reactions: [
      ...turn.npcReactions.map(
        (reaction) => `${reaction.displayName}：${reaction.summary}`
      ),
      `环境：${turn.environmentReaction.summary}`
    ],
    dialogueLines: turn.dialogueSequence.map(
      (line) => `${line.displayName}：${line.content}`
    ),
    interactionBeats: turn.interactionBeats.map(
      (beat) => `${beat.title}：${beat.summary}`
    )
  }));
}

function createRelationshipShiftSummary(
  run: SimulationRun
): SimulationRelationshipShift[] {
  const latestActorChangeById = new Map<
    string,
    {
      agentId: string;
      displayName: string;
      summary: string;
    }
  >();

  (run.turnHistory ?? []).forEach((turn) => {
    turn.actorStateChanges.forEach((change) => {
      latestActorChangeById.set(change.agentId, {
        agentId: change.agentId,
        displayName: change.displayName,
        summary: change.summary
      });
    });
  });

  if (latestActorChangeById.size === 0) {
    return run.actorStates.map((state) => ({
      agentId: state.actorId,
      displayName: state.actorName,
      shiftSummary: `${state.actorName} 当前状态为“${state.currentState}”。`
    }));
  }

  return Array.from(latestActorChangeById.values()).map((item) => ({
    agentId: item.agentId,
    displayName: item.displayName,
    shiftSummary: item.summary
  }));
}

function createEnvironmentPressureLine(
  run: SimulationRun
): SimulationEnvironmentPressureEntry[] {
  const turnHistory = run.turnHistory ?? [];
  if (turnHistory.length === 0) {
    return [
      {
        turnIndex: 0,
        label: "初始压力",
        summary: run.environmentState ?? "当前运行记录没有提供环境压力线。"
      }
    ];
  }

  return turnHistory.map((turn) => ({
    turnIndex: turn.turnIndex,
    label: `第 ${turn.turnIndex} 回合`,
    summary: turn.environmentReaction.summary
  }));
}

export function toSimulationReportInput(
  scenario: SimulationScenario,
  run: SimulationRun
): SimulationReportInput {
  const timeline = run.timeline.map(toTimelineItem);
  const lastTimelineEntry = run.timeline[run.timeline.length - 1];
  const endingNodeId =
    run.status === "completed" ? lastTimelineEntry?.nodeId : undefined;

  return {
    scenarioId: scenario.scenarioId,
    runId: run.runId,
    preparation: createPreparationInput(scenario, run),
    overview: {
      scenarioTitle: scenario.title,
      scenarioSummary: scenario.description,
      startedAt: run.createdAt,
      ...(run.finishedAt ? { completedAt: run.finishedAt } : {}),
      routeSummary: {
        visitedNodeCount: timeline.length,
        branchDecisionCount: Math.max(timeline.length - 1, 0),
        ...(endingNodeId ? { endingNodeId } : {})
      }
    },
    timeline,
    keyNodes: createKeyNodes(scenario, run.timeline),
    actorStateChanges: createActorStateChanges(scenario, run),
    turnOutcomes: createTurnOutcomes(run),
    relationshipShiftSummary: createRelationshipShiftSummary(run),
    environmentPressureLine: createEnvironmentPressureLine(run)
  };
}
