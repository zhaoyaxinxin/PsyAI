import type {
  HostBootstrapSummary,
  ReportReference,
  SimulationAdvanceResponse,
  SimulationAgentProfile as SimulationAgentProfileView,
  SimulationEnvironmentProfile as SimulationEnvironmentProfileView,
  SimulationFinishResponse,
  SimulationNode as SimulationNodeView,
  SimulationNodeResponse,
  SimulationPrepareResponse,
  SimulationRouteStage as SimulationRouteStageView,
  SimulationRunResponse,
  SimulationScenarioResponse
} from "@psyai/contracts";

import { SimulationRunStateError } from "../errors.js";
import { getAvailableBranches, getScenarioNode } from "../rules/branch-rule-engine.js";

export type SimulationRunStatus = "pending" | "prepared" | "running" | "paused" | "completed";
export type SimulationRouteStage = "prepare" | "turn" | "outcome" | "completed";
export type SimulationNodeKind = "entry" | "decision" | "event" | "ending";

export interface SimulationAgentState {
  actorId: string;
  actorName: string;
  currentState: string;
  updatedAt: string;
}

export type SimulationActorState = SimulationAgentState;

export interface SimulationAgentPersona {
  identity: string;
  relationshipToPlayer: string;
  publicGoal: string;
  hiddenPressure: string;
  coreBelief: string;
  emotionalTrait: string;
}

export interface SimulationBehaviorConfig {
  initiative: number;
  aggression: number;
  avoidance: number;
  compliance: number;
  emotionalVolatility: number;
  empathy: number;
}

export interface SimulationActionOption {
  actionId: string;
  label: string;
  intent: string;
  riskHint: string;
  disabled?: boolean;
}

export interface SimulationAgentReaction {
  agentId: string;
  displayName: string;
  reactionType: "speech" | "emotion" | "action" | "withdrawal";
  summary: string;
  stateAfter: string;
}

export interface SimulationDialogueLine {
  lineId: string;
  sequence: number;
  agentId: string;
  displayName: string;
  role: "player" | "npc" | "environment";
  tone: "probe" | "defend" | "align" | "retreat" | "observe";
  content: string;
}

export interface SimulationInteractionBeat {
  beatId: string;
  type: "conflict" | "alliance" | "retreat";
  title: string;
  summary: string;
  agentIds: string[];
}

export interface SimulationEnvironmentReaction {
  summary: string;
  stateAfter: string;
}

export interface SimulationTurnActorStateChange {
  agentId: string;
  displayName: string;
  beforeState: string;
  afterState: string;
  summary: string;
}

export interface SimulationAgentProfile {
  agentId: string;
  displayName: string;
  role: "player" | "npc";
  persona: SimulationAgentPersona;
  behavior: SimulationBehaviorConfig;
  currentState: string;
}

export interface SimulationEnvironmentProfile {
  agentId: string;
  displayName: string;
  era: string;
  location: string;
  socialRule: string;
  pressureSource: string;
  eventBias: string;
  currentState: string;
}

export interface SimulationPreparationCast {
  player: SimulationAgentProfile;
  npcs: SimulationAgentProfile[];
  environment: SimulationEnvironmentProfile;
}

export interface SimulationPreparationSnapshot {
  prepareId: string;
  scenarioId: string;
  cast: SimulationPreparationCast;
  sourceNotes: string[];
  summary: string;
  createdAt: string;
}

export interface SimulationTurnOutcome {
  turnId: string;
  turnIndex: number;
  playerAction: {
    actionId: string;
    label: string;
    rationale?: string;
  };
  dialogueSequence: SimulationDialogueLine[];
  interactionBeats: SimulationInteractionBeat[];
  npcReactions: SimulationAgentReaction[];
  environmentReaction: SimulationEnvironmentReaction;
  consequenceSummary: string;
  nextActionOptions: SimulationActionOption[];
  actorStateChanges: SimulationTurnActorStateChange[];
  createdAt: string;
}

export interface SimulationBranchDefinition {
  branchId: string;
  label: string;
  nextNodeId: string;
  requiredFlags?: string[];
  blockedFlags?: string[];
  setFlags?: string[];
  clearFlags?: string[];
}

export interface SimulationScenarioNode {
  nodeId: string;
  title: string;
  summary: string;
  kind: SimulationNodeKind;
  branches: SimulationBranchDefinition[];
}

export interface SimulationScenarioActorSeed {
  actorId: string;
  actorName: string;
  initialState: string;
}

export interface SimulationScenarioAgentSeed {
  agentId: string;
  displayName: string;
  persona: SimulationAgentPersona;
  behavior: SimulationBehaviorConfig;
  initialState: string;
}

export interface SimulationScenarioEnvironmentSeed {
  agentId: string;
  displayName: string;
  era: string;
  location: string;
  socialRule: string;
  pressureSource: string;
  eventBias: string;
  initialState: string;
}

export interface SimulationScenarioOpening {
  sceneTitle: string;
  sceneSummary: string;
  playerGoal: string;
}

export interface SimulationPrepareAgentOverride {
  displayName?: string;
  identity?: string;
  publicGoal?: string;
  hiddenPressure?: string;
  coreBelief?: string;
  emotionalTrait?: string;
  currentState?: string;
}

export interface SimulationPrepareEnvironmentOverride {
  displayName?: string;
  era?: string;
  location?: string;
  socialRule?: string;
  pressureSource?: string;
  eventBias?: string;
  currentState?: string;
}

export interface SimulationScenario {
  scenarioId: string;
  title: string;
  description: string;
  entryNodeId: string;
  nodes: SimulationScenarioNode[];
  actorSeeds: SimulationScenarioActorSeed[];
  opening?: SimulationScenarioOpening;
  playerSeed?: SimulationScenarioAgentSeed;
  npcSeeds?: SimulationScenarioAgentSeed[];
  environmentSeed?: SimulationScenarioEnvironmentSeed;
  defaultActionSeeds?: SimulationActionOption[];
}

export interface SimulationTimelineEntry {
  entryId: string;
  nodeId: string;
  title: string;
  summary: string;
  occurredAt: string;
  selectedBranchId?: string;
  selectedBranchLabel?: string;
  operatorRationale?: string;
}

export interface SimulationRun {
  runId: string;
  scenarioId: string;
  status: SimulationRunStatus;
  stage: SimulationRouteStage;
  currentNodeId: string;
  currentTurnIndex: number;
  activeOptions: SimulationActionOption[];
  createdAt: string;
  updatedAt: string;
  operatorNote?: string;
  prepareId?: string;
  preparation?: SimulationPreparationSnapshot;
  environmentState?: string;
  latestOutcome?: SimulationTurnOutcome;
  turnHistory: SimulationTurnOutcome[];
  finishedAt?: string;
  reportReference?: ReportReference;
  routeFlags: string[];
  actorStates: SimulationActorState[];
  timeline: SimulationTimelineEntry[];
}

export interface CreateSimulationRunParams {
  runId: string;
  scenario: SimulationScenario;
  occurredAt: string;
  entryId: string;
  initialActorStates?: SimulationActorState[];
  operatorNote?: string;
  prepareId?: string;
  preparation?: SimulationPreparationSnapshot;
  activeOptions?: SimulationActionOption[];
  environmentState?: string;
}

export interface AdvanceSimulationRunParams {
  scenario: SimulationScenario;
  run: SimulationRun;
  branch?: SimulationBranchDefinition;
  occurredAt: string;
  entryId: string;
  actorStates?: SimulationActorState[];
  rationale?: string;
  selectedAction?: SimulationActionOption;
  nextActionOptions?: SimulationActionOption[];
  environmentState?: string;
  turnOutcome?: SimulationTurnOutcome;
}

export interface FinishSimulationRunParams {
  run: SimulationRun;
  occurredAt: string;
}

export interface CreateSimulationPreparationParams {
  scenario: SimulationScenario;
  occurredAt: string;
  prepareId: string;
  sourceNotes?: string[];
  playerName?: string;
  playerProfile?: SimulationPrepareAgentOverride;
  npcProfiles?: SimulationPrepareAgentOverride[];
  environmentProfile?: SimulationPrepareEnvironmentOverride;
}

function createTimelineEntry(
  entryId: string,
  node: SimulationScenarioNode,
  occurredAt: string,
  branch?: SimulationBranchDefinition,
  rationale?: string
): SimulationTimelineEntry {
  return {
    entryId,
    nodeId: node.nodeId,
    title: node.title,
    summary: node.summary,
    occurredAt,
    ...(branch ? { selectedBranchId: branch.branchId, selectedBranchLabel: branch.label } : {}),
    ...(rationale ? { operatorRationale: rationale } : {})
  };
}

function createDefaultPersona(actorName: string): SimulationAgentPersona {
  return {
    identity: `${actorName}在当前情境中的默认角色`,
    relationshipToPlayer: actorName === "我" ? "自己" : `与玩家相关的人物：${actorName}`,
    publicGoal: `维持与${actorName}相关的当前局面`,
    hiddenPressure: `尚未显式说明的压力仍在影响${actorName}`,
    coreBelief: `${actorName}希望局面不要继续失控`,
    emotionalTrait: "谨慎克制"
  };
}

function createDefaultBehavior(): SimulationBehaviorConfig {
  return {
    initiative: 50,
    aggression: 30,
    avoidance: 40,
    compliance: 50,
    emotionalVolatility: 45,
    empathy: 55
  };
}

function toAgentSeed(seed: SimulationScenarioActorSeed, role: "player" | "npc"): SimulationScenarioAgentSeed {
  return {
    agentId: seed.actorId,
    displayName: seed.actorName,
    persona: createDefaultPersona(seed.actorName),
    behavior: createDefaultBehavior(),
    initialState: seed.initialState
  };
}

function getPlayerSeed(scenario: SimulationScenario): SimulationScenarioAgentSeed {
  if (scenario.playerSeed) {
    return scenario.playerSeed;
  }

  const firstActor = scenario.actorSeeds[0];
  if (firstActor) {
    return toAgentSeed(firstActor, "player");
  }

  return {
    agentId: "agent-player-default",
    displayName: "我",
    persona: createDefaultPersona("我"),
    behavior: createDefaultBehavior(),
    initialState: "观察当前局势。"
  };
}

function getNpcSeeds(scenario: SimulationScenario): SimulationScenarioAgentSeed[] {
  if (scenario.npcSeeds && scenario.npcSeeds.length > 0) {
    return scenario.npcSeeds;
  }

  return scenario.actorSeeds.slice(1).map((seed) => toAgentSeed(seed, "npc"));
}

function getEnvironmentSeed(scenario: SimulationScenario): SimulationScenarioEnvironmentSeed {
  if (scenario.environmentSeed) {
    return scenario.environmentSeed;
  }

  return {
    agentId: "agent-environment-default",
    displayName: "情境环境",
    era: "未标注时代",
    location: scenario.title,
    socialRule: "当前关系规则仍在生效",
    pressureSource: "情境中的未解决压力",
    eventBias: "会放大尚未表达清楚的情绪",
    initialState: scenario.description
  };
}

function getDefaultActions(scenario: SimulationScenario): SimulationActionOption[] {
  if (scenario.defaultActionSeeds && scenario.defaultActionSeeds.length > 0) {
    return scenario.defaultActionSeeds;
  }

  const entryNode = getScenarioNode(scenario, scenario.entryNodeId);
  return entryNode.branches.map((branch) => ({
    actionId: branch.branchId,
    label: branch.label,
    intent: `推进到 ${branch.nextNodeId}`,
    riskHint: "该行动的风险尚未补充。"
  }));
}

function createInitialActorStates(
  scenario: SimulationScenario,
  occurredAt: string
): SimulationActorState[] {
  const seeds = [getPlayerSeed(scenario), ...getNpcSeeds(scenario)];
  return seeds.map((actor) => ({
    actorId: actor.agentId,
    actorName: actor.displayName,
    currentState: actor.initialState,
    updatedAt: occurredAt
  }));
}

function createActorStatesFromPreparation(
  preparation: SimulationPreparationSnapshot,
  occurredAt: string
): SimulationActorState[] {
  return [preparation.cast.player, ...preparation.cast.npcs].map((actor) => ({
    actorId: actor.agentId,
    actorName: actor.displayName,
    currentState: actor.currentState,
    updatedAt: occurredAt
  }));
}

function normalizeActorStates(
  actorStates: readonly SimulationActorState[],
  occurredAt: string
): SimulationActorState[] {
  return actorStates.map((actorState) => ({
    actorId: actorState.actorId,
    actorName: actorState.actorName,
    currentState: actorState.currentState,
    updatedAt: actorState.updatedAt || occurredAt
  }));
}

function mergeFlags(
  currentFlags: readonly string[],
  branch: SimulationBranchDefinition
): string[] {
  const nextFlags = new Set(currentFlags);

  for (const flag of branch.clearFlags ?? []) {
    nextFlags.delete(flag);
  }

  for (const flag of branch.setFlags ?? []) {
    nextFlags.add(flag);
  }

  return [...nextFlags];
}

function assertRunIsMutable(run: SimulationRun): void {
  if (run.status === "completed") {
    throw new SimulationRunStateError("Cannot advance a completed simulation run");
  }
}

function toAgentProfile(
  seed: SimulationScenarioAgentSeed,
  role: "player" | "npc"
): SimulationAgentProfile {
  return {
    agentId: seed.agentId,
    displayName: seed.displayName,
    role,
    persona: seed.persona,
    behavior: seed.behavior,
    currentState: seed.initialState
  };
}

function applyAgentOverride(
  seed: SimulationScenarioAgentSeed,
  override: SimulationPrepareAgentOverride | undefined
): SimulationScenarioAgentSeed {
  if (!override) {
    return seed;
  }

  return {
    ...seed,
    ...(override.displayName ? { displayName: override.displayName } : {}),
    persona: {
      ...seed.persona,
      ...(override.identity ? { identity: override.identity } : {}),
      ...(override.publicGoal ? { publicGoal: override.publicGoal } : {}),
      ...(override.hiddenPressure ? { hiddenPressure: override.hiddenPressure } : {}),
      ...(override.coreBelief ? { coreBelief: override.coreBelief } : {}),
      ...(override.emotionalTrait ? { emotionalTrait: override.emotionalTrait } : {})
    },
    ...(override.currentState ? { initialState: override.currentState } : {})
  };
}

function applyEnvironmentOverride(
  seed: SimulationScenarioEnvironmentSeed,
  override: SimulationPrepareEnvironmentOverride | undefined
): SimulationScenarioEnvironmentSeed {
  if (!override) {
    return seed;
  }

  return {
    ...seed,
    ...(override.displayName ? { displayName: override.displayName } : {}),
    ...(override.era ? { era: override.era } : {}),
    ...(override.location ? { location: override.location } : {}),
    ...(override.socialRule ? { socialRule: override.socialRule } : {}),
    ...(override.pressureSource ? { pressureSource: override.pressureSource } : {}),
    ...(override.eventBias ? { eventBias: override.eventBias } : {}),
    ...(override.currentState ? { initialState: override.currentState } : {})
  };
}

function createPreparationSnapshot(
  params: CreateSimulationPreparationParams
): SimulationPreparationSnapshot {
  const playerSeed = applyAgentOverride(
    {
      ...getPlayerSeed(params.scenario),
      ...(params.playerName ? { displayName: params.playerName } : {})
    },
    params.playerProfile
  );
  const baseNpcSeeds = getNpcSeeds(params.scenario);
  const npcSeeds = baseNpcSeeds.map((seed, index) => applyAgentOverride(seed, params.npcProfiles?.[index]));
  const extraNpcSeeds = (params.npcProfiles ?? []).slice(baseNpcSeeds.length).reduce<SimulationScenarioAgentSeed[]>(
    (collection, override, index) => {
      if (!override || Object.keys(override).length === 0) {
        return collection;
      }

      const displayName = override.displayName?.trim() || `新增角色${index + 1}`;
      collection.push(
        applyAgentOverride(
          {
            agentId: `agent-npc-extra-${String(index + 1).padStart(3, "0")}`,
            displayName,
            persona: {
              ...createDefaultPersona(displayName),
              relationshipToPlayer: `在本局中新增进入关系网的人物：${displayName}`
            },
            behavior: createDefaultBehavior(),
            initialState: "刚被卷入当前局势，正在观察其他人的态度。"
          },
          override
        )
      );
      return collection;
    },
    []
  );
  const environmentSeed = applyEnvironmentOverride(
    getEnvironmentSeed(params.scenario),
    params.environmentProfile
  );

  return {
    prepareId: params.prepareId,
    scenarioId: params.scenario.scenarioId,
    cast: {
      player: toAgentProfile(playerSeed, "player"),
      npcs: [...npcSeeds, ...extraNpcSeeds].map((seed) => toAgentProfile(seed, "npc")),
      environment: {
        agentId: environmentSeed.agentId,
        displayName: environmentSeed.displayName,
        era: environmentSeed.era,
        location: environmentSeed.location,
        socialRule: environmentSeed.socialRule,
        pressureSource: environmentSeed.pressureSource,
        eventBias: environmentSeed.eventBias,
        currentState: environmentSeed.initialState
      }
    },
    sourceNotes: params.sourceNotes ?? [],
    summary: `${params.scenario.title} 的本局角色与环境已经装配完成。`,
    createdAt: params.occurredAt
  };
}

function createSyntheticOutcome(
  run: SimulationRun,
  occurredAt: string,
  selectedAction: SimulationActionOption | undefined,
  nextActionOptions: SimulationActionOption[],
  actorStates: readonly SimulationActorState[],
  environmentState: string
): SimulationTurnOutcome {
  const playerState = actorStates[0];
  const playerLabel = playerState?.actorName ?? "我";
  const playerActionLabel = selectedAction?.label ?? "未命名行动";
  const dialogueSequence: SimulationDialogueLine[] = [
    {
      lineId: `line-${String(run.currentTurnIndex + 1).padStart(3, "0")}-001`,
      sequence: 1,
      agentId: playerState?.actorId ?? "player",
      displayName: playerLabel,
      role: "player",
      tone: "probe",
      content: `${playerLabel}先抛出行动：“${playerActionLabel}”。`
    },
    ...actorStates.slice(1).map((actor, index) => ({
      lineId: `line-${String(run.currentTurnIndex + 1).padStart(3, "0")}-${String(index + 2).padStart(3, "0")}`,
      sequence: index + 2,
      agentId: actor.actorId,
      displayName: actor.actorName,
      role: "npc" as const,
      tone: index % 2 === 0 ? ("defend" as const) : ("observe" as const),
      content: `${actor.actorName}围绕“${playerActionLabel}”给出了即时回应。`
    })),
    {
      lineId: `line-${String(run.currentTurnIndex + 1).padStart(3, "0")}-999`,
      sequence: actorStates.length + 1,
      agentId: "environment",
      displayName: "环境",
      role: "environment",
      tone: "observe",
      content: environmentState || "环境压力继续堆叠，所有人的表态都被放大。"
    }
  ];
  const interactionBeats: SimulationInteractionBeat[] = [
    {
      beatId: `beat-${String(run.currentTurnIndex + 1).padStart(3, "0")}-001`,
      type: "conflict",
      title: "立场试探",
      summary: `${playerLabel}的行动把原本隐性的张力推到了台前。`,
      agentIds: actorStates.map((actor) => actor.actorId)
    },
    {
      beatId: `beat-${String(run.currentTurnIndex + 1).padStart(3, "0")}-002`,
      type: "retreat",
      title: "短暂收束",
      summary: "部分角色暂时没有继续加码，而是在观察下一轮如何演化。",
      agentIds: actorStates.slice(1).map((actor) => actor.actorId)
    }
  ];
  return {
    turnId: `turn-${String(run.currentTurnIndex + 1).padStart(3, "0")}`,
    turnIndex: run.currentTurnIndex + 1,
    playerAction: {
      actionId: selectedAction?.actionId ?? "action-unknown",
      label: selectedAction?.label ?? "未命名行动",
      ...(selectedAction ? { rationale: selectedAction.intent } : {})
    },
    dialogueSequence,
    interactionBeats,
    npcReactions: actorStates.slice(1).map((actor) => ({
      agentId: actor.actorId,
      displayName: actor.actorName,
      reactionType: "emotion",
      summary: `${actor.actorName} 对当前行动作出新的情绪反应。`,
      stateAfter: actor.currentState
    })),
    environmentReaction: {
      summary: environmentState,
      stateAfter: environmentState
    },
    consequenceSummary: playerState
      ? `${playerState.actorName} 推进了一轮新的行动，局势出现了新的后果。`
      : "局势进入了一轮新的变化。",
    nextActionOptions,
    actorStateChanges: actorStates.map((actor) => ({
      agentId: actor.actorId,
      displayName: actor.actorName,
      beforeState: actor.currentState,
      afterState: actor.currentState,
      summary: `${actor.actorName} 的状态已被记录。`
    })),
    createdAt: occurredAt
  };
}

export function createSimulationPreparation(
  params: CreateSimulationPreparationParams
): SimulationPreparationSnapshot {
  return createPreparationSnapshot(params);
}

export function createSimulationRun(
  params: CreateSimulationRunParams
): SimulationRun {
  const entryNode = getScenarioNode(params.scenario, params.scenario.entryNodeId);
  const preparation =
    params.preparation ??
    createPreparationSnapshot({
      scenario: params.scenario,
      occurredAt: params.occurredAt,
      prepareId: params.prepareId ?? `${params.runId}-prepare`
    });
  const actorStates = params.initialActorStates
    ? normalizeActorStates(params.initialActorStates, params.occurredAt)
    : createActorStatesFromPreparation(preparation, params.occurredAt);
  const activeOptions = params.activeOptions ?? getDefaultActions(params.scenario);
  const environmentState = params.environmentState ?? preparation.cast.environment.currentState;

  return {
    runId: params.runId,
    scenarioId: params.scenario.scenarioId,
    status: entryNode.kind === "ending" ? "completed" : "running",
    stage: entryNode.kind === "ending" ? "completed" : "turn",
    currentNodeId: entryNode.nodeId,
    currentTurnIndex: 0,
    activeOptions,
    createdAt: params.occurredAt,
    updatedAt: params.occurredAt,
    ...(params.operatorNote ? { operatorNote: params.operatorNote } : {}),
    ...(params.prepareId ? { prepareId: params.prepareId } : {}),
    preparation,
    environmentState,
    ...(entryNode.kind === "ending" ? { finishedAt: params.occurredAt } : {}),
    turnHistory: [],
    routeFlags: [],
    actorStates,
    timeline: [createTimelineEntry(params.entryId, entryNode, params.occurredAt)]
  };
}

export function advanceSimulationRun(
  params: AdvanceSimulationRunParams
): SimulationRun {
  assertRunIsMutable(params.run);

  const nextNode = params.branch
    ? getScenarioNode(params.scenario, params.branch.nextNodeId)
    : getCurrentNode(params.scenario, params.run);
  const actorStates = params.actorStates
    ? normalizeActorStates(params.actorStates, params.occurredAt)
    : params.run.actorStates.map((actorState) => ({
        ...actorState,
        updatedAt: params.occurredAt
      }));
  const nextActionOptions =
    params.nextActionOptions ?? params.turnOutcome?.nextActionOptions ?? params.run.activeOptions;
  const environmentState = params.environmentState ?? params.run.environmentState ?? "";
  const selectedAction =
    params.selectedAction ??
    (params.branch
      ? {
          actionId: params.branch.branchId,
          label: params.branch.label,
          intent: params.branch.nextNodeId,
          riskHint: "该行动由旧分支兼容生成。"
        }
      : undefined);
  const outcome =
    params.turnOutcome ??
    createSyntheticOutcome(
      params.run,
      params.occurredAt,
      selectedAction,
      nextActionOptions,
      actorStates,
      environmentState
    );

  return {
    ...params.run,
    status: "running",
    stage: "outcome",
    currentNodeId: nextNode.nodeId,
    currentTurnIndex: params.run.currentTurnIndex + 1,
    activeOptions: nextActionOptions,
    updatedAt: params.occurredAt,
    environmentState,
    latestOutcome: outcome,
    turnHistory: [...params.run.turnHistory, outcome],
    routeFlags: params.branch ? mergeFlags(params.run.routeFlags, params.branch) : [...params.run.routeFlags],
    actorStates,
    timeline: [
      ...params.run.timeline,
      createTimelineEntry(
        params.entryId,
        nextNode,
        params.occurredAt,
        params.branch,
        params.rationale
      )
    ]
  };
}

export function attachSimulationReportReference(
  run: SimulationRun,
  reportReference: ReportReference
): SimulationRun {
  return {
    ...run,
    reportReference
  };
}

export function finishSimulationRun(
  params: FinishSimulationRunParams
): SimulationRun {
  assertRunIsMutable(params.run);

  return {
    ...params.run,
    status: "completed",
    stage: "completed",
    updatedAt: params.occurredAt,
    finishedAt: params.occurredAt
  };
}

export function getCurrentNode(
  scenario: SimulationScenario,
  run: SimulationRun
): SimulationScenarioNode {
  return getScenarioNode(scenario, run.currentNodeId);
}

function toSimulationAgentProfileView(
  profile: SimulationAgentProfile
): SimulationAgentProfileView {
  return {
    agentId: profile.agentId,
    displayName: profile.displayName,
    role: profile.role,
    persona: profile.persona,
    behavior: profile.behavior,
    currentState: profile.currentState
  };
}

function toSimulationEnvironmentProfileView(
  profile: SimulationEnvironmentProfile
): SimulationEnvironmentProfileView {
  return {
    agentId: profile.agentId,
    displayName: profile.displayName,
    era: profile.era,
    location: profile.location,
    socialRule: profile.socialRule,
    pressureSource: profile.pressureSource,
    eventBias: profile.eventBias,
    currentState: profile.currentState
  };
}

function ensurePreparation(
  scenario: SimulationScenario,
  run: SimulationRun
): SimulationPreparationSnapshot {
  return (
    run.preparation ??
    createPreparationSnapshot({
      scenario,
      occurredAt: run.createdAt,
      prepareId: run.prepareId ?? `${run.runId}-prepare`
    })
  );
}

export function toSimulationNodeView(
  scenario: SimulationScenario,
  run: SimulationRun,
  nodeId = run.currentNodeId
): SimulationNodeView {
  const node = getScenarioNode(scenario, nodeId);
  const branchSourceRun =
    nodeId === run.currentNodeId
      ? run
      : {
          ...run,
          currentNodeId: nodeId
        };

  return {
    nodeId: node.nodeId,
    title: node.title,
    summary: node.summary,
    kind: node.kind,
    availableBranches: getAvailableBranches(scenario, branchSourceRun).map((branch) => ({
      branchId: branch.branchId,
      label: branch.label,
      nextNodeId: branch.nextNodeId
    })),
    availableActions: nodeId === run.currentNodeId ? run.activeOptions.map((action) => ({ ...action })) : [],
    ...(run.latestOutcome ? { latestOutcome: structuredClone(run.latestOutcome) } : {})
  };
}

export function toSimulationScenarioData(
  scenario: SimulationScenario
): SimulationScenarioResponse["data"] {
  const playerSeed = getPlayerSeed(scenario);
  const npcSeeds = getNpcSeeds(scenario);
  const environmentSeed = getEnvironmentSeed(scenario);

  return {
    scenarioId: scenario.scenarioId,
    title: scenario.title,
    description: scenario.description,
    entryNodeId: scenario.entryNodeId,
    opening:
      scenario.opening ?? {
        sceneTitle: scenario.title,
        sceneSummary: scenario.description,
        playerGoal: "先观察局势，再决定下一步行动。"
      },
    playerSeed,
    npcSeeds,
    environmentSeed,
    defaultActionSeeds: getDefaultActions(scenario),
    nodes: scenario.nodes.map((node) => ({
      nodeId: node.nodeId,
      title: node.title,
      kind: node.kind
    }))
  };
}

export function toSimulationPrepareData(
  scenario: SimulationScenario,
  preparation: SimulationPreparationSnapshot
): SimulationPrepareResponse["data"] {
  return {
    prepareId: preparation.prepareId,
    scenarioId: scenario.scenarioId,
    preparation: structuredClone(preparation)
  };
}

function toRuntimeViewData(
  scenario: SimulationScenario,
  run: SimulationRun
) {
  const preparation = ensurePreparation(scenario, run);
  return {
    stage: run.stage as SimulationRouteStageView,
    currentTurnIndex: run.currentTurnIndex,
    activeOptions: run.activeOptions.map((action) => ({ ...action })),
    cast: {
      player: toSimulationAgentProfileView(preparation.cast.player),
      npcs: preparation.cast.npcs.map(toSimulationAgentProfileView),
      environment: toSimulationEnvironmentProfileView(preparation.cast.environment)
    },
    preparation: structuredClone(preparation),
    ...(run.latestOutcome ? { latestOutcome: structuredClone(run.latestOutcome) } : {}),
    ...(run.turnHistory.length > 0 ? { turnHistory: structuredClone(run.turnHistory) } : {}),
    ...(run.timeline.length > 0 ? { timeline: structuredClone(run.timeline) } : {}),
    ...(run.environmentState ? { environmentState: run.environmentState } : {})
  };
}

export function toSimulationRunData(
  scenario: SimulationScenario,
  run: SimulationRun
): SimulationRunResponse["data"] {
  return {
    runId: run.runId,
    scenarioId: run.scenarioId,
    ...(run.prepareId ? { prepareId: run.prepareId } : {}),
    status: run.status,
    bootstrap: createSimulationBootstrapSummary(),
    currentNode: toSimulationNodeView(scenario, run),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    ...toRuntimeViewData(scenario, run)
  };
}

export function toSimulationNodeData(
  scenario: SimulationScenario,
  run: SimulationRun,
  nodeId?: string
): SimulationNodeResponse["data"] {
  return {
    runId: run.runId,
    status: run.status,
    currentNode: toSimulationNodeView(scenario, run, nodeId),
    updatedAt: run.updatedAt,
    ...toRuntimeViewData(scenario, run)
  };
}

export function toSimulationAdvanceData(
  scenario: SimulationScenario,
  previousNodeId: string,
  run: SimulationRun
): SimulationAdvanceResponse["data"] {
  return {
    runId: run.runId,
    previousNodeId,
    status: run.status,
    currentNode: toSimulationNodeView(scenario, run),
    updatedAt: run.updatedAt,
    ...toRuntimeViewData(scenario, run),
    ...(run.reportReference ? { reportReference: run.reportReference } : {})
  };
}

export function toSimulationFinishData(
  run: SimulationRun
): SimulationFinishResponse["data"] {
  return {
    runId: run.runId,
    status: "completed",
    finishedAt: run.finishedAt ?? run.updatedAt,
    ...(run.reportReference ? { reportReference: run.reportReference } : {})
  };
}

function createSimulationBootstrapSummary(): HostBootstrapSummary {
  return {
    ready: true,
    workflow: "simulation",
    scene: "route"
  };
}
