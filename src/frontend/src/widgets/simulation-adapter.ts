import type {
  SimulationAdvanceResponse,
  SimulationNodeResponse,
  SimulationPrepareResponse,
  SimulationRouteStage,
  SimulationRunResponse,
  SimulationScenarioResponse
} from "@psyai/contracts";

export interface SimulationRouteNodeViewModel {
  routeEntryId: string;
  nodeId: string;
  title: string;
  kind: string;
  isCurrent: boolean;
  impactSummary?: string;
}

export interface SimulationBranchViewModel {
  branchId: string;
  label: string;
  nextNodeId: string;
  disabled: boolean;
}

export interface SimulationActionViewModel {
  actionId: string;
  label: string;
  intent: string;
  riskHint: string;
  disabled: boolean;
}

export interface SimulationPreparationViewModel {
  prepareId: string;
  summary: string;
  player: {
    displayName: string;
    identity: string;
    publicGoal: string;
    currentState: string;
  };
  npcs: Array<{
    displayName: string;
    identity: string;
    publicGoal: string;
    currentState: string;
  }>;
  environment: {
    displayName: string;
    location: string;
    pressureSource: string;
    currentState: string;
  };
  sourceNotes: string[];
}

export interface SimulationOutcomeViewModel {
  turnId: string;
  turnIndex: number;
  playerActionLabel: string;
  consequenceSummary: string;
  dialogueLines: string[];
  interactionBeats: string[];
  npcReactions: string[];
  actorChanges: string[];
  environmentSummary: string;
}

export interface SimulationRouteViewModel {
  runId: string | null;
  prepareId: string | null;
  scenarioId: string;
  scenarioTitle: string;
  scenarioOpeningTitle: string;
  scenarioOpeningSummary: string;
  playerGoal: string;
  status: string;
  stage: SimulationRouteStage;
  currentTurnIndex: number;
  currentNodeId: string;
  currentNodeTitle: string;
  currentNodeSummary: string;
  nodes: SimulationRouteNodeViewModel[];
  branches: SimulationBranchViewModel[];
  actions: SimulationActionViewModel[];
  preparation: SimulationPreparationViewModel | null;
  latestOutcome: SimulationOutcomeViewModel | null;
  reportReady: boolean;
}

type SimulationNodeEnvelope =
  | SimulationRunResponse["data"]
  | SimulationNodeResponse["data"]
  | SimulationAdvanceResponse["data"];

type SimulationTimelineEnvelope = SimulationNodeEnvelope & {
  timeline?: Array<{
    entryId: string;
    nodeId: string;
    title: string;
  }>;
  turnHistory?: Array<{
    consequenceSummary: string;
  }>;
};

function sanitizeDisplayText(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/gu, "$1")
    .replace(/__(.*?)__/gu, "$1")
    .replace(/\*\*/gu, "")
    .replace(/__/gu, "")
    .trim();
}

function mapPreparationView(
  preparation: SimulationPrepareResponse["data"] | null
): SimulationPreparationViewModel | null {
  if (!preparation) {
    return null;
  }

  return {
    prepareId: preparation.prepareId,
    summary: sanitizeDisplayText(preparation.preparation.summary),
    player: {
      displayName: sanitizeDisplayText(preparation.preparation.cast.player.displayName),
      identity: sanitizeDisplayText(preparation.preparation.cast.player.persona.identity),
      publicGoal: sanitizeDisplayText(preparation.preparation.cast.player.persona.publicGoal),
      currentState: sanitizeDisplayText(preparation.preparation.cast.player.currentState)
    },
    npcs: preparation.preparation.cast.npcs.map((npc) => ({
      displayName: sanitizeDisplayText(npc.displayName),
      identity: sanitizeDisplayText(npc.persona.identity),
      publicGoal: sanitizeDisplayText(npc.persona.publicGoal),
      currentState: sanitizeDisplayText(npc.currentState)
    })),
    environment: {
      displayName: sanitizeDisplayText(preparation.preparation.cast.environment.displayName),
      location: sanitizeDisplayText(preparation.preparation.cast.environment.location),
      pressureSource: sanitizeDisplayText(preparation.preparation.cast.environment.pressureSource),
      currentState: sanitizeDisplayText(preparation.preparation.cast.environment.currentState)
    },
    sourceNotes: preparation.preparation.sourceNotes.map(sanitizeDisplayText)
  };
}

function mapOutcomeView(run: SimulationNodeEnvelope | null): SimulationOutcomeViewModel | null {
  const outcome = run?.latestOutcome ?? run?.currentNode.latestOutcome;
  if (!outcome) {
    return null;
  }

  return {
    turnId: outcome.turnId,
    turnIndex: outcome.turnIndex,
    playerActionLabel: sanitizeDisplayText(outcome.playerAction.label),
    consequenceSummary: sanitizeDisplayText(outcome.consequenceSummary),
    dialogueLines: outcome.dialogueSequence.map(
      (line) => `${sanitizeDisplayText(line.displayName)}：${sanitizeDisplayText(line.content)}`
    ),
    interactionBeats: outcome.interactionBeats.map(
      (beat) => `${sanitizeDisplayText(beat.title)}：${sanitizeDisplayText(beat.summary)}`
    ),
    npcReactions: outcome.npcReactions.map(
      (reaction) => `${sanitizeDisplayText(reaction.displayName)}：${sanitizeDisplayText(reaction.summary)}`
    ),
    actorChanges: outcome.actorStateChanges.map((change) => sanitizeDisplayText(change.summary)),
    environmentSummary: sanitizeDisplayText(outcome.environmentReaction.summary)
  };
}

function mapTimelineNodes(run: SimulationTimelineEnvelope): SimulationRouteNodeViewModel[] {
  const timeline = run.timeline ?? [];
  const turnHistory = run.turnHistory ?? [];
  return timeline.map((entry, index) => ({
    routeEntryId: entry.entryId,
    nodeId: entry.nodeId,
    title: sanitizeDisplayText(entry.title),
    kind: index === timeline.length - 1 ? run.currentNode.kind : "event",
    isCurrent: index === timeline.length - 1,
    ...(index > 0 && turnHistory[index - 1]?.consequenceSummary
      ? { impactSummary: sanitizeDisplayText(turnHistory[index - 1]?.consequenceSummary ?? "") }
      : {})
  }));
}

function getFallbackNode(
  scenario: SimulationScenarioResponse["data"]
): {
  nodeId: string;
  title: string;
  summary: string;
  kind: "entry" | "decision" | "event" | "ending";
  availableBranches: Array<{
    branchId: string;
    label: string;
    nextNodeId: string;
    disabled?: boolean;
  }>;
  availableActions: Array<{
    actionId: string;
    label: string;
    intent: string;
    riskHint: string;
    disabled?: boolean;
  }>;
} {
  const entryNode = scenario.nodes.find((node) => node.nodeId === scenario.entryNodeId);
  return {
    nodeId: entryNode?.nodeId ?? scenario.entryNodeId,
    title: sanitizeDisplayText(entryNode?.title ?? scenario.opening.sceneTitle),
    summary: sanitizeDisplayText(scenario.opening.sceneSummary),
    kind: entryNode?.kind ?? "entry",
    availableBranches: [],
    availableActions: []
  };
}

export function mapSimulationRouteToView(
  scenario: SimulationScenarioResponse["data"],
  preparation: SimulationPrepareResponse["data"] | null,
  run: SimulationNodeEnvelope | null,
  reportReady = false
): SimulationRouteViewModel {
  const currentNode = run?.currentNode ?? getFallbackNode(scenario);
  const currentStage: SimulationRouteStage = run?.stage ?? "prepare";
  const preparationView = mapPreparationView(
    preparation ??
      (run?.preparation
        ? {
            prepareId: run.preparation.prepareId,
            scenarioId: run.preparation.scenarioId,
            preparation: run.preparation
          }
        : null)
  );

  return {
    runId: run?.runId ?? null,
    prepareId: preparationView?.prepareId ?? run?.preparation?.prepareId ?? null,
    scenarioId: scenario.scenarioId,
    scenarioTitle: sanitizeDisplayText(scenario.title),
    scenarioOpeningTitle: sanitizeDisplayText(scenario.opening.sceneTitle),
    scenarioOpeningSummary: sanitizeDisplayText(scenario.opening.sceneSummary),
    playerGoal: sanitizeDisplayText(scenario.opening.playerGoal),
    status: run?.status ?? (preparationView ? "prepared" : "pending"),
    stage: currentStage,
    currentTurnIndex: run?.currentTurnIndex ?? 0,
    currentNodeId: currentNode.nodeId,
    currentNodeTitle: sanitizeDisplayText(currentNode.title),
    currentNodeSummary: sanitizeDisplayText(currentNode.summary),
    nodes:
      (run as SimulationTimelineEnvelope | null)?.timeline &&
      (run as SimulationTimelineEnvelope).timeline &&
      (run as SimulationTimelineEnvelope).timeline!.length > 0
        ? mapTimelineNodes(run as SimulationTimelineEnvelope)
        : scenario.nodes.map((node) => ({
            routeEntryId: node.nodeId,
            nodeId: node.nodeId,
            title: sanitizeDisplayText(node.title),
            kind: node.kind,
            isCurrent: node.nodeId === currentNode.nodeId
          })),
    branches: currentNode.availableBranches.map((branch) => ({
      branchId: branch.branchId,
      label: sanitizeDisplayText(branch.label),
      nextNodeId: branch.nextNodeId,
      disabled: branch.disabled ?? false
    })),
    actions:
      currentNode.availableActions?.map((option) => ({
        actionId: option.actionId,
        label: sanitizeDisplayText(option.label),
        intent: sanitizeDisplayText(option.intent),
        riskHint: sanitizeDisplayText(option.riskHint),
        disabled: option.disabled ?? false
      })) ??
      currentNode.availableBranches.map((branch) => ({
        actionId: branch.branchId,
        label: sanitizeDisplayText(branch.label),
        intent: `推进到 ${branch.nextNodeId}`,
        riskHint: "该行动的风险尚未补充。",
        disabled: branch.disabled ?? false
      })),
    preparation: preparationView,
    latestOutcome: mapOutcomeView(run),
    reportReady
  };
}
