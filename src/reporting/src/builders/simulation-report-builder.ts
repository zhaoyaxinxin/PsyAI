import {
  simulationReportSchema,
  type ReportHistoryEntry,
  type ReportSummaryHighlight,
  type SimulationReport
} from "@psyai/contracts";
import type { SimulationReportInput } from "@psyai/simulation";

import { createReportBase } from "./report-base.js";

export interface BuildSimulationReportOptions {
  reportId: string;
  reportInput: SimulationReportInputWithStageData;
  generatedAt: string;
  reportVersion: string;
}

interface SimulationReportInputWithStageData extends SimulationReportInput {
  preparation: {
    scenarioTitle: string;
    playerSummary: string;
    npcSummaries: string[];
    environmentSummary: string;
    sourceNotes: string[];
  };
  turnOutcomes: Array<{
    turnId: string;
    turnIndex: number;
    playerActionLabel: string;
    consequenceSummary: string;
    reactions: string[];
    dialogueLines: string[];
    interactionBeats: string[];
  }>;
  relationshipShiftSummary: Array<{
    agentId: string;
    displayName: string;
    shiftSummary: string;
  }>;
  environmentPressureLine: Array<{
    turnIndex: number;
    label: string;
    summary: string;
  }>;
}

function buildTitle(reportInput: SimulationReportInputWithStageData): string {
  return `${reportInput.overview.scenarioTitle} 情境模拟报告`;
}

function buildSummary(reportInput: SimulationReportInputWithStageData): string {
  return `围绕“${reportInput.overview.scenarioTitle}”生成的路线复盘，覆盖关键选择、角色状态变化与情境压力演变。`;
}

function createHighlights(
  reportInput: SimulationReportInputWithStageData
): ReportSummaryHighlight[] {
  return [
    {
      highlightId: "sim-highlight-001",
      label: "经过节点",
      value: String(reportInput.overview.routeSummary.visitedNodeCount)
    },
    {
      highlightId: "sim-highlight-002",
      label: "决策次数",
      value: String(reportInput.overview.routeSummary.branchDecisionCount)
    }
  ];
}

function createHistoryItems(
  reportInput: SimulationReportInputWithStageData
): ReportHistoryEntry[] {
  return reportInput.timeline.map((item) => ({
    entryId: item.entryId,
    occurredAt: item.occurredAt,
    title: item.title,
    summary: item.selectedBranchLabel
      ? `${item.summary} 选择分支：${item.selectedBranchLabel}。`
      : item.summary,
    relatedEntityId: item.nodeId
  }));
}

export function buildSimulationReport(
  options: BuildSimulationReportOptions
): SimulationReport {
  const report = {
    ...createReportBase({
      reportId: options.reportId,
      workflow: "simulation",
      title: buildTitle(options.reportInput),
      summary: options.reportInput.overview.scenarioSummary,
      sourceEntityId: options.reportInput.runId,
      generatedAt: options.generatedAt,
      reportVersion: options.reportVersion
    }),
    summary: {
      title: buildTitle(options.reportInput),
      summary: buildSummary(options.reportInput),
      highlights: createHighlights(options.reportInput)
    },
    detail: {
      scenarioId: options.reportInput.scenarioId,
      runId: options.reportInput.runId,
      preparation: {
        scenarioTitle: options.reportInput.preparation.scenarioTitle,
        playerSummary: options.reportInput.preparation.playerSummary,
        npcSummaries: options.reportInput.preparation.npcSummaries,
        environmentSummary: options.reportInput.preparation.environmentSummary,
        sourceNotes: options.reportInput.preparation.sourceNotes
      },
      overview: {
        scenarioTitle: options.reportInput.overview.scenarioTitle,
        scenarioSummary: options.reportInput.overview.scenarioSummary,
        startedAt: options.reportInput.overview.startedAt,
        ...(options.reportInput.overview.completedAt
          ? { completedAt: options.reportInput.overview.completedAt }
          : {}),
        routeSummary: {
          visitedNodeCount: options.reportInput.overview.routeSummary.visitedNodeCount,
          branchDecisionCount: options.reportInput.overview.routeSummary.branchDecisionCount,
          ...(options.reportInput.overview.routeSummary.endingNodeId
            ? { endingNodeId: options.reportInput.overview.routeSummary.endingNodeId }
            : {})
        }
      },
      keyNodes: options.reportInput.keyNodes.map((node) => ({
        nodeId: node.nodeId,
        title: node.title,
        kind: node.kind,
        impactSummary: node.impactSummary,
        ...(node.operatorRationale
          ? { operatorRationale: node.operatorRationale }
          : {})
      })),
      actorStateChanges: options.reportInput.actorStateChanges.map((change) => ({
        actorId: change.actorId,
        actorName: change.actorName,
        beforeState: change.beforeState,
        afterState: change.afterState,
        changeSummary: change.changeSummary
      })),
      turnOutcomes: options.reportInput.turnOutcomes.map((turn) => ({
        turnId: turn.turnId,
        turnIndex: turn.turnIndex,
        playerActionLabel: turn.playerActionLabel,
        consequenceSummary: turn.consequenceSummary,
        reactions: turn.reactions,
        dialogueLines: turn.dialogueLines,
        interactionBeats: turn.interactionBeats
      })),
      relationshipShiftSummary: options.reportInput.relationshipShiftSummary.map((shift) => ({
        agentId: shift.agentId,
        displayName: shift.displayName,
        shiftSummary: shift.shiftSummary
      })),
      environmentPressureLine: options.reportInput.environmentPressureLine.map((entry) => ({
        turnIndex: entry.turnIndex,
        label: entry.label,
        summary: entry.summary
      })),
      timeline: options.reportInput.timeline.map((item) => ({
        entryId: item.entryId,
        occurredAt: item.occurredAt,
        nodeId: item.nodeId,
        title: item.title,
        summary: item.summary,
        ...(item.selectedBranchLabel
          ? { selectedBranchLabel: item.selectedBranchLabel }
          : {})
      })),
      boundaryNotice:
        "本报告由 AI 根据本局模拟过程自动生成，用于复盘情境演化，不替代真实督导、专业评估或临床判断。"
    },
    history: {
      items: createHistoryItems(options.reportInput)
    }
  };

  return simulationReportSchema.parse(report);
}
