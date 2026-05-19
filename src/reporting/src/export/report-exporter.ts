import type {
  CounselingReport,
  ReportExportFormat,
  ReportExportMetadata,
  ResonanceReport,
  SimulationReport
} from "@psyai/contracts";

import { ReportExportUnsupportedFormatError } from "../errors.js";
import type {
  ReportExportData,
  ReportingReport
} from "../reporting-types.js";

function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash * 31 + content.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function getBoundaryNotice(report: ReportingReport): string {
  if ("detail" in report && typeof report.detail === "object" && report.detail !== null) {
    const detail = report.detail as Record<string, unknown>;
    if (typeof detail["boundaryNotice"] === "string") {
      return detail["boundaryNotice"];
    }
  }
  return "This report is AI-generated and is not a substitute for professional assessment.";
}

function isSimulationReport(report: ReportingReport): report is SimulationReport {
  return report.base.reportType === "simulation";
}

function isCounselingReport(report: ReportingReport): report is CounselingReport {
  return report.base.reportType === "counseling";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createMarkdownForSimulationReport(
  report: SimulationReport
): string {
  const lines = [
    `# ${report.summary.title}`,
    "",
    report.summary.summary,
    "",
    "## Overview",
    `- Scenario: ${report.detail.overview.scenarioTitle}`,
    `- Started At: ${report.detail.overview.startedAt}`,
    ...(report.detail.overview.completedAt
      ? [`- Completed At: ${report.detail.overview.completedAt}`]
      : []),
    `- Visited Nodes: ${report.detail.overview.routeSummary.visitedNodeCount}`,
    `- Branch Decisions: ${report.detail.overview.routeSummary.branchDecisionCount}`,
    ...(report.detail.overview.routeSummary.endingNodeId
      ? [`- Ending Node: ${report.detail.overview.routeSummary.endingNodeId}`]
      : []),
    "",
    "## Timeline",
    ...report.history.items.flatMap((item) => [
      `### ${item.title}`,
      ...(item.relatedEntityId ? [`- Related Entity: ${item.relatedEntityId}`] : []),
      `- Occurred At: ${item.occurredAt}`,
      `- Summary: ${item.summary}`,
      ""
    ]),
    "## Key Nodes",
    ...report.detail.keyNodes.flatMap((node) => [
      `### ${node.title}`,
      `- Node: ${node.nodeId}`,
      `- Kind: ${node.kind}`,
      `- Impact: ${node.impactSummary}`,
      ...(node.operatorRationale
        ? [`- Operator Rationale: ${node.operatorRationale}`]
        : []),
      ""
    ]),
    "## Actor State Changes",
    ...(report.detail.actorStateChanges.length > 0
      ? report.detail.actorStateChanges.flatMap((change) => [
          `- ${change.actorName}: ${change.beforeState} -> ${change.afterState}`,
          `  ${change.changeSummary}`
        ])
      : ["- No actor state changes were recorded."])
  ];

  return lines.join("\n");
}

function createMarkdownForResonanceReport(
  report: ResonanceReport
): string {
  const lines = [
    `# ${report.summary.title}`,
    "",
    report.summary.summary,
    "",
    "## Input",
    `- Input ID: ${report.detail.input.inputId}`,
    `- Source Type: ${report.detail.input.sourceType}`,
    `- Submitted At: ${report.detail.input.submittedAt}`,
    `- Summary: ${report.detail.input.summary}`,
    `- Tags: ${report.detail.input.tags.join(", ")}`,
    "",
    "## Matched Cases",
    ...report.detail.matchedCases.flatMap((match) => [
      `### ${match.title}`,
      `- Case ID: ${match.caseId}`,
      `- Score: ${match.score}`,
      `- Why Matched: ${match.whyMatched}`,
      ...(match.whyNotFullyMatched
        ? [`- Why Not Fully Matched: ${match.whyNotFullyMatched}`]
        : []),
      ...(match.uncertainty ? [`- Uncertainty: ${match.uncertainty}`] : []),
      `- Matched Signals: ${match.matchedSignals.join(", ")}`,
      ...(match.mismatchSignals.length > 0
        ? [`- Mismatch Signals: ${match.mismatchSignals.join(", ")}`]
        : []),
      ...(match.sharedThemes.length > 0
        ? [`- Shared Themes: ${match.sharedThemes.join(", ")}`]
        : []),
      ...(match.excerpt ? [`- Excerpt: ${match.excerpt}`] : []),
      ""
    ]),
    "## Fragment Comparisons",
    ...(report.detail.fragmentComparisons.length > 0
      ? report.detail.fragmentComparisons.flatMap((comparison) => [
          `### ${comparison.comparisonId}`,
          `- Input Excerpt: ${comparison.inputExcerpt}`,
          `- Case Excerpt: ${comparison.caseExcerpt}`,
          `- Interpretation: ${comparison.interpretation}`,
          `- Why Matched: ${comparison.whyMatched}`,
          ...(comparison.whyNotFullyMatched
            ? [`- Why Not Fully Matched: ${comparison.whyNotFullyMatched}`]
            : []),
          ...(comparison.uncertainty
            ? [`- Uncertainty: ${comparison.uncertainty}`]
            : []),
          `- Matched Signals: ${comparison.matchedSignals.join(", ")}`,
          ...(comparison.mismatchSignals.length > 0
            ? [`- Mismatch Signals: ${comparison.mismatchSignals.join(", ")}`]
            : []),
          ""
        ])
      : ["- No fragment comparisons were produced.", ""]),
    "## Theme Interpretations",
    ...report.detail.themeInterpretations.flatMap((theme) => [
      `### ${theme.theme}`,
      `- Theme ID: ${theme.themeId}`,
      `- Confidence: ${theme.confidence}`,
      `- Explanation: ${theme.explanation}`,
      `- Why Matched: ${theme.whyMatched}`,
      ...(theme.whyNotFullyMatched
        ? [`- Why Not Fully Matched: ${theme.whyNotFullyMatched}`]
        : []),
      ...(theme.uncertainty ? [`- Uncertainty: ${theme.uncertainty}`] : []),
      `- Supporting Cases: ${theme.supportingCaseIds.join(", ")}`,
      ""
    ])
  ];

  return lines.join("\n");
}

function createMarkdownForCounselingReport(
  report: CounselingReport
): string {
  const lines = [
    `# ${report.summary.title}`,
    "",
    report.summary.summary,
    "",
    "## Overview",
    `- Concern: ${report.detail.overview.concernSummary}`,
    `- Risk Level: ${report.detail.overview.riskLevel}`,
    `- Dominant Stage: ${report.detail.overview.dominantStage}`,
    `- Started At: ${report.detail.overview.startedAt}`,
    ...(report.detail.overview.finishedAt
      ? [`- Finished At: ${report.detail.overview.finishedAt}`]
      : []),
    "",
    "## Stage Snapshots",
    ...report.detail.sections.flatMap((section) => [
      `### ${section.title}`,
      `- Stage: ${section.stage}`,
      `- Summary: ${section.summary}`,
      "",
      "**Key Excerpts:**",
      ...section.keyExcerpts.flatMap((excerpt) => [
        `> [${excerpt.speaker}] ${excerpt.content}`,
        ""
      ]),
      "**Recommendations:**",
      ...section.recommendations.flatMap((rec) => [
        `- [${rec.priority}] ${rec.title}: ${rec.rationale}`,
        ""
      ]),
      ""
    ]),
    "## History",
    ...report.history.items.flatMap((item) => [
      `### ${item.title}`,
      `- Occurred At: ${item.occurredAt}`,
      `- Summary: ${item.summary}`,
      ...(item.relatedEntityId ? [`- Related: ${item.relatedEntityId}`] : []),
      ""
    ]),
    ...(report.detail.closingNote
      ? [
          "## Closing Note",
          "",
          report.detail.closingNote,
          ""
        ]
      : [])
  ];

  return lines.join("\n");
}

function toMarkdown(report: ReportingReport): string {
  if (isSimulationReport(report)) {
    return createMarkdownForSimulationReport(report);
  }
  if (isCounselingReport(report)) {
    return createMarkdownForCounselingReport(report);
  }
  return createMarkdownForResonanceReport(report);
}

function createMetadata(
  report: ReportingReport,
  format: ReportExportFormat,
  exportedAt: string
): ReportExportMetadata {
  const extensionByFormat: Record<ReportExportFormat, string> = {
    json: "json",
    markdown: "md",
    html: "html",
    pdf: "pdf"
  };
  const mimeTypeByFormat: Record<ReportExportFormat, string> = {
    json: "application/json",
    markdown: "text/markdown",
    html: "text/html",
    pdf: "application/pdf"
  };

  return {
    format,
    fileName: `${report.base.reportType}-${report.base.reportId}.${extensionByFormat[format]}`,
    mimeType: mimeTypeByFormat[format],
    exportedAt,
    generatorVersion: report.base.reportVersion,
    templateVersion: report.base.templateVersion ?? "v1",
    formatVersion: "v1",
    sanitized: report.base.sanitized,
    exportedBy: "psyai-reporting"
  };
}

export function createReportExport(
  report: ReportingReport,
  format: ReportExportFormat,
  exportedAt: string
): ReportExportData {
  if (format === "pdf") {
    throw new ReportExportUnsupportedFormatError(format);
  }

  const metadata = createMetadata(report, format, exportedAt);
  const boundaryNotice = getBoundaryNotice(report);
  const sanitized = report.base.sanitized;
  let content: string;

  if (format === "json") {
    content = JSON.stringify(
      { ...report, _export: { boundaryNotice, sanitized, exportedAt, checksum: "" } },
      null,
      2
    );
  } else if (format === "markdown") {
    content = toMarkdown(report);
    if (boundaryNotice) {
      content += `\n\n---\n> **Notice:** ${boundaryNotice}\n`;
    }
    if (sanitized) {
      content += `\n> This report has been sanitized for safe sharing.\n`;
    }
  } else {
    content = [
      "<!doctype html>",
      "<html>",
      "<head>",
      "<meta charset=\"utf-8\">",
      `<title>${escapeHtml(report.summary.title)}</title>`,
      "<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:1rem;}</style>",
      "</head>",
      "<body>",
      `<pre>${escapeHtml(toMarkdown(report))}</pre>`,
      ...(boundaryNotice
        ? [
            "<hr>",
            `<p style=\"color:#666;font-style:italic\">${escapeHtml(boundaryNotice)}</p>`
          ]
        : []),
      ...(sanitized
        ? ["<p style=\"color:#999;font-size:0.85rem\">This report has been sanitized for safe sharing.</p>"]
        : []),
      "</body>",
      "</html>"
    ].join("");
  }

  const checksum = computeChecksum(content);

  return {
    reportId: report.base.reportId,
    workflow: report.base.reportType,
    format,
    metadata: {
      ...metadata,
      ...(checksum ? { consistencyToken: checksum } : {})
    },
    content
  };
}
