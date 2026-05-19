import { z } from "zod";

import {
  createSuccessEnvelopeSchema,
  entityIdSchema,
  hostBootstrapSummarySchema,
  isoDateTimeSchema,
  pageInfoSchema,
  reportReferenceSchema
} from "./shared.js";

export const simulationRunStatusSchema = z.enum([
  "pending",
  "prepared",
  "running",
  "paused",
  "completed"
]);

export const simulationRouteStageSchema = z.enum([
  "prepare",
  "turn",
  "outcome",
  "completed"
]);

export const simulationNodeKindSchema = z.enum([
  "entry",
  "decision",
  "event",
  "ending"
]);

export const simulationAgentRoleSchema = z.enum([
  "player",
  "npc"
]);

export const simulationAgentPersonaSchema = z.object({
  identity: z.string().min(1),
  relationshipToPlayer: z.string().min(1),
  publicGoal: z.string().min(1),
  hiddenPressure: z.string().min(1),
  coreBelief: z.string().min(1),
  emotionalTrait: z.string().min(1)
});

export const simulationBehaviorConfigSchema = z.object({
  initiative: z.number().int().min(0).max(100),
  aggression: z.number().int().min(0).max(100),
  avoidance: z.number().int().min(0).max(100),
  compliance: z.number().int().min(0).max(100),
  emotionalVolatility: z.number().int().min(0).max(100),
  empathy: z.number().int().min(0).max(100)
});

export const simulationAgentProfileSchema = z.object({
  agentId: entityIdSchema,
  displayName: z.string().min(1),
  role: simulationAgentRoleSchema,
  persona: simulationAgentPersonaSchema,
  behavior: simulationBehaviorConfigSchema,
  currentState: z.string().min(1)
});

export const simulationEnvironmentProfileSchema = z.object({
  agentId: entityIdSchema,
  displayName: z.string().min(1),
  era: z.string().min(1),
  location: z.string().min(1),
  socialRule: z.string().min(1),
  pressureSource: z.string().min(1),
  eventBias: z.string().min(1),
  currentState: z.string().min(1)
});

export const simulationActionOptionSchema = z.object({
  actionId: entityIdSchema,
  label: z.string().min(1),
  intent: z.string().min(1),
  riskHint: z.string().min(1),
  disabled: z.boolean().optional()
});

export const simulationDialogueToneSchema = z.enum([
  "probe",
  "defend",
  "align",
  "retreat",
  "observe"
]);

export const simulationInteractionBeatTypeSchema = z.enum([
  "conflict",
  "alliance",
  "retreat"
]);

export const simulationDialogueLineSchema = z.object({
  lineId: entityIdSchema,
  sequence: z.number().int().positive(),
  agentId: entityIdSchema,
  displayName: z.string().min(1),
  role: z.enum(["player", "npc", "environment"]),
  tone: simulationDialogueToneSchema,
  content: z.string().min(1)
});

export const simulationInteractionBeatSchema = z.object({
  beatId: entityIdSchema,
  type: simulationInteractionBeatTypeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  agentIds: z.array(entityIdSchema).min(1)
});

export const simulationAgentReactionTypeSchema = z.enum([
  "speech",
  "emotion",
  "action",
  "withdrawal"
]);

export const simulationAgentReactionSchema = z.object({
  agentId: entityIdSchema,
  displayName: z.string().min(1),
  reactionType: simulationAgentReactionTypeSchema,
  summary: z.string().min(1),
  stateAfter: z.string().min(1)
});

export const simulationEnvironmentReactionSchema = z.object({
  summary: z.string().min(1),
  stateAfter: z.string().min(1)
});

export const simulationActorStateChangeSchema = z.object({
  agentId: entityIdSchema,
  displayName: z.string().min(1),
  beforeState: z.string().min(1),
  afterState: z.string().min(1),
  summary: z.string().min(1)
});

export const simulationTurnOutcomeSchema = z.object({
  turnId: entityIdSchema,
  turnIndex: z.number().int().nonnegative(),
  playerAction: z.object({
    actionId: entityIdSchema,
    label: z.string().min(1),
    rationale: z.string().min(1).optional()
  }),
  dialogueSequence: z.array(simulationDialogueLineSchema).min(1),
  interactionBeats: z.array(simulationInteractionBeatSchema).min(1),
  npcReactions: z.array(simulationAgentReactionSchema),
  environmentReaction: simulationEnvironmentReactionSchema,
  consequenceSummary: z.string().min(1),
  nextActionOptions: z.array(simulationActionOptionSchema),
  actorStateChanges: z.array(simulationActorStateChangeSchema),
  createdAt: isoDateTimeSchema
});

export const simulationRuntimeTimelineEntrySchema = z.object({
  entryId: entityIdSchema,
  nodeId: entityIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  occurredAt: isoDateTimeSchema,
  selectedBranchId: entityIdSchema.optional(),
  selectedBranchLabel: z.string().min(1).optional(),
  operatorRationale: z.string().min(1).optional()
});

export const simulationPreparationCastSchema = z.object({
  player: simulationAgentProfileSchema,
  npcs: z.array(simulationAgentProfileSchema),
  environment: simulationEnvironmentProfileSchema
});

export const simulationPreparationSnapshotSchema = z.object({
  prepareId: entityIdSchema,
  scenarioId: entityIdSchema,
  cast: simulationPreparationCastSchema,
  sourceNotes: z.array(z.string().min(1)),
  summary: z.string().min(1),
  createdAt: isoDateTimeSchema
});

export const simulationAgentSeedSchema = z.object({
  agentId: entityIdSchema,
  displayName: z.string().min(1),
  persona: simulationAgentPersonaSchema,
  behavior: simulationBehaviorConfigSchema,
  initialState: z.string().min(1)
});

export const simulationEnvironmentSeedSchema = z.object({
  agentId: entityIdSchema,
  displayName: z.string().min(1),
  era: z.string().min(1),
  location: z.string().min(1),
  socialRule: z.string().min(1),
  pressureSource: z.string().min(1),
  eventBias: z.string().min(1),
  initialState: z.string().min(1)
});

export const simulationScenarioOpeningSchema = z.object({
  sceneTitle: z.string().min(1),
  sceneSummary: z.string().min(1),
  playerGoal: z.string().min(1)
});

export const simulationPrepareAgentOverrideSchema = z.object({
  displayName: z.string().min(1).optional(),
  identity: z.string().min(1).optional(),
  publicGoal: z.string().min(1).optional(),
  hiddenPressure: z.string().min(1).optional(),
  coreBelief: z.string().min(1).optional(),
  emotionalTrait: z.string().min(1).optional(),
  currentState: z.string().min(1).optional()
});

export const simulationPrepareEnvironmentOverrideSchema = z.object({
  displayName: z.string().min(1).optional(),
  era: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  socialRule: z.string().min(1).optional(),
  pressureSource: z.string().min(1).optional(),
  eventBias: z.string().min(1).optional(),
  currentState: z.string().min(1).optional()
});

export const simulationBranchSchema = z.object({
  branchId: entityIdSchema,
  label: z.string().min(1),
  nextNodeId: entityIdSchema,
  disabled: z.boolean().optional()
});

export const simulationNodeSchema = z.object({
  nodeId: entityIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  kind: simulationNodeKindSchema,
  availableBranches: z.array(simulationBranchSchema),
  availableActions: z.array(simulationActionOptionSchema).optional(),
  latestOutcome: simulationTurnOutcomeSchema.optional()
});

export const simulationScenarioRequestSchema = z.object({
  scenarioId: entityIdSchema
});

export const simulationScenarioResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    scenarioId: entityIdSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    entryNodeId: entityIdSchema,
    opening: simulationScenarioOpeningSchema,
    playerSeed: simulationAgentSeedSchema,
    npcSeeds: z.array(simulationAgentSeedSchema),
    environmentSeed: simulationEnvironmentSeedSchema,
    defaultActionSeeds: z.array(simulationActionOptionSchema),
    nodes: z.array(
      z.object({
        nodeId: entityIdSchema,
        title: z.string().min(1),
        kind: simulationNodeKindSchema
      })
    ).min(1)
  })
);

export const simulationPrepareRequestSchema = z.object({
  scenarioId: entityIdSchema,
  sourceNotes: z.array(z.string().min(1)).optional(),
  playerName: z.string().min(1).optional(),
  playerProfile: simulationPrepareAgentOverrideSchema.optional(),
  npcProfiles: z.array(simulationPrepareAgentOverrideSchema).optional(),
  environmentProfile: simulationPrepareEnvironmentOverrideSchema.optional(),
  operatorNote: z.string().min(1).optional()
});

export const simulationPrepareResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    prepareId: entityIdSchema,
    scenarioId: entityIdSchema,
    preparation: simulationPreparationSnapshotSchema
  })
);

export const simulationRunRequestSchema = z.object({
  scenarioId: entityIdSchema,
  prepareId: entityIdSchema.optional(),
  operatorNote: z.string().min(1).optional()
});

const simulationRuntimeDataSchema = z.object({
  stage: simulationRouteStageSchema,
  currentTurnIndex: z.number().int().nonnegative(),
  activeOptions: z.array(simulationActionOptionSchema),
  cast: simulationPreparationCastSchema,
  preparation: simulationPreparationSnapshotSchema.optional(),
  latestOutcome: simulationTurnOutcomeSchema.optional(),
  turnHistory: z.array(simulationTurnOutcomeSchema).optional(),
  timeline: z.array(simulationRuntimeTimelineEntrySchema).min(1).optional(),
  environmentState: z.string().min(1).optional()
});

export const simulationRunResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    runId: entityIdSchema,
    scenarioId: entityIdSchema,
    prepareId: entityIdSchema.optional(),
    status: simulationRunStatusSchema,
    bootstrap: hostBootstrapSummarySchema,
    currentNode: simulationNodeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema
  }).merge(simulationRuntimeDataSchema)
);

export const simulationNodeRequestSchema = z.object({
  runId: entityIdSchema,
  nodeId: entityIdSchema.optional()
});

export const simulationNodeResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    runId: entityIdSchema,
    status: simulationRunStatusSchema,
    currentNode: simulationNodeSchema,
    updatedAt: isoDateTimeSchema
  }).merge(simulationRuntimeDataSchema)
);

export const simulationAdvanceRequestSchema = z.object({
  runId: entityIdSchema,
  branchId: entityIdSchema.optional(),
  actionId: entityIdSchema.optional(),
  customActionText: z.string().min(1).optional(),
  rationale: z.string().min(1).optional()
}).refine((value) => Boolean(value.branchId || value.actionId), {
  message: "Either branchId or actionId is required",
  path: ["actionId"]
});

export const simulationAdvanceResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    runId: entityIdSchema,
    previousNodeId: entityIdSchema,
    status: simulationRunStatusSchema,
    currentNode: simulationNodeSchema,
    updatedAt: isoDateTimeSchema,
    reportReference: reportReferenceSchema.optional()
  }).merge(simulationRuntimeDataSchema)
);

export const simulationReportRequestSchema = z.object({
  runId: entityIdSchema
});

export const simulationReportResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    runId: entityIdSchema,
    ready: z.boolean(),
    reportReference: reportReferenceSchema.optional()
  })
);

export const simulationFinishReasonSchema = z.enum([
  "user_completed",
  "user_cancelled",
  "all_endings_reached",
  "stopped_midway",
  "story_resolved"
]);

export const simulationFinishRequestSchema = z.object({
  runId: entityIdSchema,
  reason: simulationFinishReasonSchema
});

export const simulationFinishResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    runId: entityIdSchema,
    status: z.literal("completed"),
    finishedAt: isoDateTimeSchema,
    reportReference: reportReferenceSchema.optional()
  })
);

export const simulationListRequestSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional(),
  status: simulationRunStatusSchema.optional(),
  scenarioId: entityIdSchema.optional(),
  dateFrom: isoDateTimeSchema.optional(),
  dateTo: isoDateTimeSchema.optional()
});

export const simulationListItemSchema = z.object({
  runId: entityIdSchema,
  scenarioId: entityIdSchema,
  scenarioTitle: z.string().min(1),
  status: simulationRunStatusSchema,
  currentNodeTitle: z.string().min(1).optional(),
  currentTurnIndex: z.number().int().nonnegative().optional(),
  stage: simulationRouteStageSchema.optional(),
  nodeCount: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  reportReference: reportReferenceSchema.optional()
});

export const simulationListResponseSchema = createSuccessEnvelopeSchema(
  z.object({
    items: z.array(simulationListItemSchema),
    pageInfo: pageInfoSchema
  })
);

export type SimulationRouteStage = z.infer<typeof simulationRouteStageSchema>;
export type SimulationAgentPersona = z.infer<typeof simulationAgentPersonaSchema>;
export type SimulationBehaviorConfig = z.infer<typeof simulationBehaviorConfigSchema>;
export type SimulationAgentProfile = z.infer<typeof simulationAgentProfileSchema>;
export type SimulationEnvironmentProfile = z.infer<typeof simulationEnvironmentProfileSchema>;
export type SimulationActionOption = z.infer<typeof simulationActionOptionSchema>;
export type SimulationAgentReaction = z.infer<typeof simulationAgentReactionSchema>;
export type SimulationEnvironmentReaction = z.infer<typeof simulationEnvironmentReactionSchema>;
export type SimulationActorStateChange = z.infer<typeof simulationActorStateChangeSchema>;
export type SimulationTurnOutcome = z.infer<typeof simulationTurnOutcomeSchema>;
export type SimulationPreparationSnapshot = z.infer<typeof simulationPreparationSnapshotSchema>;
export type SimulationAgentSeed = z.infer<typeof simulationAgentSeedSchema>;
export type SimulationEnvironmentSeed = z.infer<typeof simulationEnvironmentSeedSchema>;
export type SimulationPrepareAgentOverride = z.infer<typeof simulationPrepareAgentOverrideSchema>;
export type SimulationPrepareEnvironmentOverride = z.infer<typeof simulationPrepareEnvironmentOverrideSchema>;
export type SimulationBranch = z.infer<typeof simulationBranchSchema>;
export type SimulationNode = z.infer<typeof simulationNodeSchema>;
export type SimulationScenarioRequest = z.infer<typeof simulationScenarioRequestSchema>;
export type SimulationScenarioResponse = z.infer<typeof simulationScenarioResponseSchema>;
export type SimulationPrepareRequest = z.infer<typeof simulationPrepareRequestSchema>;
export type SimulationPrepareResponse = z.infer<typeof simulationPrepareResponseSchema>;
export type SimulationRunRequest = z.infer<typeof simulationRunRequestSchema>;
export type SimulationRunResponse = z.infer<typeof simulationRunResponseSchema>;
export type SimulationNodeRequest = z.infer<typeof simulationNodeRequestSchema>;
export type SimulationNodeResponse = z.infer<typeof simulationNodeResponseSchema>;
export type SimulationAdvanceRequest = z.infer<typeof simulationAdvanceRequestSchema>;
export type SimulationAdvanceResponse = z.infer<typeof simulationAdvanceResponseSchema>;
export type SimulationReportRequest = z.infer<typeof simulationReportRequestSchema>;
export type SimulationReportResponse = z.infer<typeof simulationReportResponseSchema>;
export type SimulationFinishRequest = z.infer<typeof simulationFinishRequestSchema>;
export type SimulationFinishResponse = z.infer<typeof simulationFinishResponseSchema>;
export type SimulationListRequest = z.infer<typeof simulationListRequestSchema>;
export type SimulationListItem = z.infer<typeof simulationListItemSchema>;
export type SimulationListResponse = z.infer<typeof simulationListResponseSchema>;
