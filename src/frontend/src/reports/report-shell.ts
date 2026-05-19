import type {
  CounselingReport,
  ResonanceReport,
  SimulationReport
} from "@psyai/contracts";

export type FrontendReportDocument =
  | CounselingReport
  | SimulationReport
  | ResonanceReport;

export interface ReportPanelViewModel {
  panelId: string;
  heading: string;
  lines: string[];
}

export interface ReportShellViewModel {
  reportId: string;
  workflow: "counseling" | "simulation" | "resonance";
  title: string;
  summary: string;
  generatedAt: string;
  exportLabel: string;
  panels: ReportPanelViewModel[];
}

function sanitizeDisplayText(value: string): string {
  return value
    .replace(/^PsyAI:\s*/gmu, "")
    .replace(/^Continue structured observation\s*$/gmu, "")
    .replace(/\[(.*?)\]\((.*?)\)/gu, "$1")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\*\*(.*?)\*\*/gu, "$1")
    .replace(/__(.*?)__/gu, "$1")
    .replace(/\*\*/gu, "")
    .replace(/__/gu, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function uniqueLines(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const sanitized = sanitizeDisplayText(value);
    if (!sanitized || seen.has(sanitized)) {
      continue;
    }
    seen.add(sanitized);
    result.push(sanitized);
  }

  return result;
}

function isCounselingReport(
  report: FrontendReportDocument
): report is CounselingReport {
  return report.base.reportType === "counseling";
}

function isSimulationReport(
  report: FrontendReportDocument
): report is SimulationReport {
  return report.base.reportType === "simulation";
}

function getCounselingStageLabel(stage: string): string {
  switch (stage) {
    case "intake":
      return "初始接入";
    case "exploration":
      return "深入澄清";
    case "stabilization":
      return "稳定支持";
    case "closure":
      return "收束整理";
    default:
      return stage;
  }
}

function getSpeakerLabel(speaker: string): string {
  switch (speaker) {
    case "user":
      return "来访者";
    case "assistant":
      return "咨询助手";
    default:
      return speaker;
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "now":
      return "立即处理";
    case "soon":
      return "尽快安排";
    case "later":
      return "后续关注";
    default:
      return priority;
  }
}

function createCounselingPanels(report: CounselingReport): ReportPanelViewModel[] {
  return report.detail.sections.map((section) => ({
    panelId: section.sectionId,
    heading: sanitizeDisplayText(`${section.title}｜${getCounselingStageLabel(section.stage)}`),
    lines: uniqueLines([
      section.summary,
      ...section.keyExcerpts.map(
        (excerpt) => `${getSpeakerLabel(excerpt.speaker)}｜${excerpt.content}`
      ),
      ...section.recommendations.map(
        (recommendation) =>
          `${getPriorityLabel(recommendation.priority)}｜${recommendation.title}`
      )
    ])
  }));
}

function createSimulationPanels(report: SimulationReport): ReportPanelViewModel[] {
  return [
    {
      panelId: "preparation",
      heading: "本局准备",
      lines: uniqueLines([
        report.detail.preparation.playerSummary,
        ...report.detail.preparation.npcSummaries,
        report.detail.preparation.environmentSummary,
        ...report.detail.preparation.sourceNotes.map((note) => `补充线索｜${note}`)
      ])
    },
    {
      panelId: "overview",
      heading: "路线概览",
      lines: uniqueLines([
        report.detail.overview.scenarioSummary,
        `已访问节点：${report.detail.overview.routeSummary.visitedNodeCount}`,
        `分支决策：${report.detail.overview.routeSummary.branchDecisionCount}`,
        ...report.detail.keyNodes.map((node) => `${node.title}｜${node.impactSummary}`)
      ])
    },
    {
      panelId: "turn-outcomes",
      heading: "回合结果",
      lines: uniqueLines(
        report.detail.turnOutcomes.flatMap((turn) => [
          `第 ${turn.turnIndex} 回合｜${turn.playerActionLabel}`,
          `结果｜${turn.consequenceSummary}`,
          ...turn.dialogueLines.map((line) => `发言｜${line}`),
          ...turn.interactionBeats.map((beat) => `走势｜${beat}`),
          ...turn.reactions.map((reaction) => `反馈｜${reaction}`)
        ])
      )
    },
    {
      panelId: "relationship-shifts",
      heading: "关系与状态变化",
      lines: uniqueLines([
        ...report.detail.relationshipShiftSummary.map(
          (shift) => `${shift.displayName}｜${shift.shiftSummary}`
        ),
        ...report.detail.actorStateChanges.map(
          (change) =>
            `${change.actorName}｜${change.beforeState} → ${change.afterState}`
        )
      ])
    },
    {
      panelId: "pressure-line",
      heading: "环境压力线",
      lines: uniqueLines([
        ...report.detail.environmentPressureLine.map(
          (entry) => `${entry.label}｜${entry.summary}`
        ),
        report.detail.boundaryNotice
      ])
    }
  ];
}

function createResonancePanels(report: ResonanceReport): ReportPanelViewModel[] {
  const matchedCaseLines = uniqueLines(
    report.detail.matchedCases.flatMap((match, index) => [
      `案例 ${String(index + 1).padStart(2, "0")}｜${match.title}`,
      `匹配分｜${Math.round(match.score * 100)}%`,
      `为什么匹配｜${match.whyMatched}`,
      ...(match.whyNotFullyMatched ? [`为什么不完全匹配｜${match.whyNotFullyMatched}`] : []),
      ...(match.uncertainty ? [`不确定性｜${match.uncertainty}`] : []),
      ...(match.matchedSignals.length > 0
        ? [`命中线索｜${match.matchedSignals.join("、")}`]
        : []),
      ...(match.mismatchSignals.length > 0
        ? [`未完全覆盖｜${match.mismatchSignals.join("、")}`]
        : []),
      ...(match.excerpt ? [`检索案例内容｜${match.excerpt}`] : [])
    ])
  );

  const fragmentLines = uniqueLines(
    report.detail.fragmentComparisons.flatMap((comparison, index) => [
      `片段 ${String(index + 1).padStart(2, "0")}｜输入片段`,
      comparison.inputExcerpt,
      `片段 ${String(index + 1).padStart(2, "0")}｜案例片段`,
      comparison.caseExcerpt,
      `比较说明｜${comparison.whyMatched}`,
      ...(comparison.whyNotFullyMatched ? [`覆盖不足｜${comparison.whyNotFullyMatched}`] : []),
      ...(comparison.uncertainty ? [`不确定性｜${comparison.uncertainty}`] : [])
    ])
  );

  const themeLines = uniqueLines(
    report.detail.themeInterpretations.flatMap((theme, index) => [
      `线索 ${String(index + 1).padStart(2, "0")}｜${theme.theme}`,
      `解释｜${theme.explanation}`,
      `为什么匹配｜${theme.whyMatched}`,
      ...(theme.whyNotFullyMatched ? [`为什么不完全匹配｜${theme.whyNotFullyMatched}`] : []),
      ...(theme.uncertainty ? [`不确定性｜${theme.uncertainty}`] : []),
      `置信度｜${Math.round(theme.confidence * 100)}%`
    ])
  );

  return [
    {
      panelId: "matched-cases",
      heading: "检索案例内容",
      lines: matchedCaseLines
    },
    {
      panelId: "fragment-comparisons",
      heading: "输入与案例对照",
      lines: fragmentLines
    },
    {
      panelId: "themes",
      heading: "核心线索解释",
      lines: themeLines
    }
  ];
}

export interface ReportListItemViewModel {
  reportId: string;
  workflow: "counseling" | "simulation" | "resonance";
  title: string;
  generatedAt: string;
  status: "ready" | "loading";
}

export function mapReportToListItem(
  report: FrontendReportDocument
): ReportListItemViewModel {
  return {
    reportId: report.base.reportId,
    workflow: report.base.reportType,
    title: sanitizeDisplayText(report.summary.title),
    generatedAt: report.base.generatedAt,
    status: "ready"
  };
}

function getExportLabel(format: string, fileName: string): string {
  return `${format.toUpperCase()}｜${fileName}`;
}

export function mapReportToShellViewModel(
  report: FrontendReportDocument
): ReportShellViewModel {
  if (isCounselingReport(report)) {
    return {
      reportId: report.base.reportId,
      workflow: "counseling",
      title: sanitizeDisplayText(report.summary.title),
      summary: sanitizeDisplayText(report.summary.summary),
      generatedAt: report.base.generatedAt,
      exportLabel: getExportLabel(report.exportMeta.format, report.exportMeta.fileName),
      panels: createCounselingPanels(report)
    };
  }

  if (isSimulationReport(report)) {
    return {
      reportId: report.base.reportId,
      workflow: "simulation",
      title: sanitizeDisplayText(report.summary.title),
      summary: sanitizeDisplayText(report.summary.summary),
      generatedAt: report.base.generatedAt,
      exportLabel: getExportLabel(report.exportMeta.format, report.exportMeta.fileName),
      panels: createSimulationPanels(report)
    };
  }

  return {
    reportId: report.base.reportId,
    workflow: "resonance",
    title: sanitizeDisplayText(report.summary.title),
    summary: sanitizeDisplayText(report.summary.summary),
    generatedAt: report.base.generatedAt,
    exportLabel: getExportLabel(report.exportMeta.format, report.exportMeta.fileName),
    panels: createResonancePanels(report)
  };
}
