import { z } from "zod";

import { entityIdSchema, isoDateTimeSchema } from "../shared.js";
import {
  reportBaseSchema,
  reportExportMetadataSchema,
  reportHistorySchema,
  reportSourceSchema,
  reportSummarySchema
} from "./shared.js";

export const simulationReportNodeKindSchema = z.enum([
  "entry",
  "decision",
  "event",
  "ending"
]);

export const simulationTimelineEntrySchema = z.object({
  entryId: entityIdSchema,
  occurredAt: isoDateTimeSchema,
  nodeId: entityIdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  selectedBranchLabel: z.string().min(1).optional(),
  actionLabel: z.string().min(1).optional(),
  consequenceSummary: z.string().min(1).optional()
});

export const simulationKeyNodeSchema = z.object({
  nodeId: entityIdSchema,
  title: z.string().min(1),
  kind: simulationReportNodeKindSchema,
  impactSummary: z.string().min(1),
  operatorRationale: z.string().min(1).optional()
});

export const simulationReportActorStateChangeSchema = z.object({
  actorId: entityIdSchema,
  actorName: z.string().min(1),
  beforeState: z.string().min(1),
  afterState: z.string().min(1),
  changeSummary: z.string().min(1)
});

export const simulationReportPreparationSchema = z.object({
  scenarioTitle: z.string().min(1),
  playerSummary: z.string().min(1),
  npcSummaries: z.array(z.string().min(1)).min(1),
  environmentSummary: z.string().min(1),
  sourceNotes: z.array(z.string().min(1))
});

export const simulationReportTurnOutcomeSchema = z.object({
  turnId: entityIdSchema,
  turnIndex: z.number().int().nonnegative(),
  playerActionLabel: z.string().min(1),
  consequenceSummary: z.string().min(1),
  reactions: z.array(z.string().min(1)).min(1),
  dialogueLines: z.array(z.string().min(1)).min(1),
  interactionBeats: z.array(z.string().min(1)).min(1)
});

export const simulationRelationshipShiftSchema = z.object({
  agentId: entityIdSchema,
  displayName: z.string().min(1),
  shiftSummary: z.string().min(1)
});

export const simulationEnvironmentPressureEntrySchema = z.object({
  turnIndex: z.number().int().nonnegative(),
  label: z.string().min(1),
  summary: z.string().min(1)
});

export const simulationReportDetailSchema = z.object({
  scenarioId: entityIdSchema,
  runId: entityIdSchema,
  preparation: simulationReportPreparationSchema,
  overview: z.object({
    scenarioTitle: z.string().min(1),
    scenarioSummary: z.string().min(1),
    startedAt: isoDateTimeSchema,
    completedAt: isoDateTimeSchema.optional(),
    routeSummary: z.object({
      visitedNodeCount: z.number().int().positive(),
      branchDecisionCount: z.number().int().nonnegative(),
      endingNodeId: entityIdSchema.optional()
    })
  }),
  keyNodes: z.array(simulationKeyNodeSchema).min(1),
  actorStateChanges: z.array(simulationReportActorStateChangeSchema).min(1),
  turnOutcomes: z.array(simulationReportTurnOutcomeSchema).min(1),
  relationshipShiftSummary: z.array(simulationRelationshipShiftSchema).min(1),
  environmentPressureLine: z.array(simulationEnvironmentPressureEntrySchema).min(1),
  timeline: z.array(simulationTimelineEntrySchema).optional(),
  boundaryNotice: z.string().min(1)
});

export const simulationReportSchema = z.object({
  base: reportBaseSchema.extend({
    reportType: z.literal("simulation")
  }),
  source: reportSourceSchema.extend({
    workflow: z.literal("simulation")
  }),
  summary: reportSummarySchema,
  detail: simulationReportDetailSchema,
  history: reportHistorySchema,
  exportMeta: reportExportMetadataSchema
});

export type SimulationReportNodeKind = z.infer<typeof simulationReportNodeKindSchema>;
export type SimulationTimelineEntry = z.infer<typeof simulationTimelineEntrySchema>;
export type SimulationKeyNode = z.infer<typeof simulationKeyNodeSchema>;
export type SimulationReportActorStateChange = z.infer<typeof simulationReportActorStateChangeSchema>;
export type SimulationReportPreparation = z.infer<typeof simulationReportPreparationSchema>;
export type SimulationReportTurnOutcome = z.infer<typeof simulationReportTurnOutcomeSchema>;
export type SimulationRelationshipShift = z.infer<typeof simulationRelationshipShiftSchema>;
export type SimulationEnvironmentPressureEntry = z.infer<typeof simulationEnvironmentPressureEntrySchema>;
export type SimulationReportDetail = z.infer<typeof simulationReportDetailSchema>;
export type SimulationReport = z.infer<typeof simulationReportSchema>;
