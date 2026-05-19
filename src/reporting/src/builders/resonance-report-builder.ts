import {
  resonanceReportSchema,
  type ReportHistoryEntry,
  type ReportSummaryHighlight,
  type ResonanceReport
} from "@psyai/contracts";
import type { ResonanceReportInput } from "@psyai/resonance";

import { createReportBase } from "./report-base.js";

export interface BuildResonanceReportOptions {
  reportId: string;
  reportInput: ResonanceReportInput;
  generatedAt: string;
  reportVersion: string;
}

function createHighlights(reportInput: ResonanceReportInput): ReportSummaryHighlight[] {
  const topMatch = reportInput.matchedCases[0];
  const primarySignal = reportInput.themeInterpretations[0];

  return [
    {
      highlightId: "res-highlight-001",
      label: "最高匹配分",
      value: topMatch ? topMatch.score.toFixed(2) : "0.00"
    },
    {
      highlightId: "res-highlight-002",
      label: "核心线索",
      value: primarySignal ? primarySignal.theme : "待识别"
    },
    {
      highlightId: "res-highlight-003",
      label: "案例数量",
      value: String(reportInput.matchedCases.length)
    }
  ];
}

function createHistoryItems(reportInput: ResonanceReportInput): ReportHistoryEntry[] {
  return [
    {
      entryId: `res-history-${reportInput.input.inputId}`,
      occurredAt: reportInput.input.submittedAt,
      title: "已提交输入",
      summary: `已接收用于共振比对的${reportInput.input.sourceType === "file" ? "上传材料" : "文本叙事"}。`,
      relatedEntityId: reportInput.input.inputId
    },
    {
      entryId: `res-history-${reportInput.comparisonId}`,
      occurredAt: reportInput.input.submittedAt,
      title: "已生成比对",
      summary: reportInput.summary,
      relatedEntityId: reportInput.comparisonId
    }
  ];
}

export function buildResonanceReport(options: BuildResonanceReportOptions): ResonanceReport {
  const report = {
    ...createReportBase({
      reportId: options.reportId,
      workflow: "resonance",
      title: options.reportInput.title,
      summary: options.reportInput.summary,
      sourceEntityId: options.reportInput.comparisonId,
      generatedAt: options.generatedAt,
      reportVersion: options.reportVersion
    }),
    summary: {
      title: options.reportInput.title,
      summary: options.reportInput.summary,
      highlights: createHighlights(options.reportInput)
    },
    detail: {
      comparisonId: options.reportInput.comparisonId,
      input: {
        inputId: options.reportInput.input.inputId,
        sourceType: options.reportInput.input.sourceType,
        submittedAt: options.reportInput.input.submittedAt,
        summary: options.reportInput.input.summary,
        tags: [...options.reportInput.input.tags]
      },
      matchedCases: options.reportInput.matchedCases.map((match) => ({
        matchId: match.matchId,
        caseId: match.caseId,
        title: match.title,
        score: match.score,
        rationale: match.rationale,
        sharedThemes: [...match.sharedThemes],
        matchedSignals: [...match.matchedSignals],
        mismatchSignals: [...match.mismatchSignals],
        whyMatched: match.whyMatched,
        ...(match.whyNotFullyMatched ? { whyNotFullyMatched: match.whyNotFullyMatched } : {}),
        ...(match.uncertainty ? { uncertainty: match.uncertainty } : {}),
        ...(match.excerpt ? { excerpt: match.excerpt } : {})
      })),
      fragmentComparisons: options.reportInput.fragmentComparisons.map((item) => ({
        comparisonId: item.comparisonId,
        inputExcerpt: item.inputExcerpt,
        caseExcerpt: item.caseExcerpt,
        interpretation: item.interpretation,
        matchedSignals: [...item.matchedSignals],
        mismatchSignals: [...item.mismatchSignals],
        whyMatched: item.whyMatched,
        ...(item.whyNotFullyMatched ? { whyNotFullyMatched: item.whyNotFullyMatched } : {}),
        ...(item.uncertainty ? { uncertainty: item.uncertainty } : {})
      })),
      themeInterpretations: options.reportInput.themeInterpretations.map((theme) => ({
        themeId: theme.themeId,
        theme: theme.theme,
        explanation: theme.explanation,
        confidence: theme.confidence,
        supportingCaseIds: [...theme.supportingCaseIds],
        whyMatched: theme.whyMatched,
        ...(theme.whyNotFullyMatched ? { whyNotFullyMatched: theme.whyNotFullyMatched } : {}),
        ...(theme.uncertainty ? { uncertainty: theme.uncertainty } : {})
      })),
      boundaryNotice: "本同频共振报告由 AI 生成。相似案例比对仅供理解和参考，不构成临床诊断。"
    },
    history: {
      items: createHistoryItems(options.reportInput)
    }
  };

  return resonanceReportSchema.parse(report);
}
