import {
  counselingReportSchema,
  type CounselingReport,
  type ReportHistoryEntry,
  type ReportSummaryHighlight
} from "@psyai/contracts";
import type { CounselingReportInput } from "@psyai/counseling";

import { createReportBase } from "./report-base.js";

export interface BuildCounselingReportOptions {
  reportId: string;
  reportInput: CounselingReportInput;
  generatedAt: string;
  reportVersion: string;
}

function buildTitle(reportInput: CounselingReportInput): string {
  return reportInput.title;
}

function buildSummary(reportInput: CounselingReportInput): string {
  return reportInput.summary;
}

function createHighlights(
  reportInput: CounselingReportInput
): ReportSummaryHighlight[] {
  return [
    {
      highlightId: "csl-highlight-001",
      label: "风险等级",
      value: reportInput.overview.riskLevel
    },
    {
      highlightId: "csl-highlight-002",
      label: "主导阶段",
      value: reportInput.overview.dominantStage
    }
  ];
}

function createHistoryItems(
  reportInput: CounselingReportInput
): ReportHistoryEntry[] {
  const entries: ReportHistoryEntry[] = [
    {
      entryId: `csl-history-start-${reportInput.sessionId}`,
      occurredAt: reportInput.overview.startedAt,
      title: "会话开始",
      summary: `咨询会话 ${reportInput.sessionId} 已于 ${reportInput.overview.startedAt} 开始。`,
      relatedEntityId: reportInput.sessionId
    }
  ];

  for (const section of reportInput.sections) {
    entries.push({
      entryId: `csl-history-${section.sectionId}`,
      occurredAt:
        section.keyExcerpts[section.keyExcerpts.length - 1]?.notedAt ??
        reportInput.overview.startedAt,
      title: `${section.stage} 阶段检查点`,
      summary: section.summary,
      relatedEntityId: section.sectionId
    });
  }

  if (reportInput.overview.finishedAt) {
    entries.push({
      entryId: `csl-history-end-${reportInput.sessionId}`,
      occurredAt: reportInput.overview.finishedAt,
      title: "会话结束",
      summary:
        reportInput.closingNote ??
        `咨询会话 ${reportInput.sessionId} 已完成。`,
      relatedEntityId: reportInput.sessionId
    });
  }

  return entries;
}

export function buildCounselingReport(
  options: BuildCounselingReportOptions
): CounselingReport {
  const report = {
    ...createReportBase({
      reportId: options.reportId,
      workflow: "counseling",
      title: buildTitle(options.reportInput),
      summary: buildSummary(options.reportInput),
      sourceEntityId: options.reportInput.sessionId,
      generatedAt: options.generatedAt,
      reportVersion: options.reportVersion
    }),
    summary: {
      title: buildTitle(options.reportInput),
      summary: buildSummary(options.reportInput),
      highlights: createHighlights(options.reportInput)
    },
    detail: {
      sessionId: options.reportInput.sessionId,
      overview: {
        concernSummary: options.reportInput.overview.concernSummary,
        riskLevel: options.reportInput.overview.riskLevel,
        dominantStage: options.reportInput.overview.dominantStage,
        escalationLevel: options.reportInput.overview.escalationLevel ?? "none",
        startedAt: options.reportInput.overview.startedAt,
        ...(options.reportInput.overview.finishedAt
          ? { finishedAt: options.reportInput.overview.finishedAt }
          : {})
      },
      sections: options.reportInput.sections.map((section) => ({
        sectionId: section.sectionId,
        title: section.title,
        stage: section.stage,
        summary: section.summary,
        keyExcerpts: section.keyExcerpts.map((excerpt) => ({
          excerptId: excerpt.excerptId,
          speaker: excerpt.speaker,
          content: excerpt.content,
          notedAt: excerpt.notedAt
        })),
        recommendations: section.recommendations.map((rec) => ({
          recommendationId: rec.recommendationId,
          title: rec.title,
          rationale: rec.rationale,
          priority: rec.priority
        }))
      })),
      ...(options.reportInput.closingNote
        ? { closingNote: options.reportInput.closingNote }
        : {}),
      escalationSummary: options.reportInput.escalationSummary ?? "当前无需升级处置。",
      boundaryNotice: "本报告由 AI 生成，仅供整理与辅助观察之用，不能替代专业心理评估与人工判断。"
    },
    history: {
      items: createHistoryItems(options.reportInput)
    }
  };

  return counselingReportSchema.parse(report);
}
