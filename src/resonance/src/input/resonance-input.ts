import type {
  HostBootstrapSummary,
  ResonanceFileReference,
  ResonanceInputRequest,
  ResonanceInputResponse
} from "@psyai/contracts";

import type { ResonanceInputAnalysis } from "../analysis/resonance-input-analysis.js";
import { normalizeTags } from "../policy/resonance-policy.js";

export type ResonanceInputSourceType = ResonanceInputRequest["sourceType"];

export interface ResonanceInput {
  inputId: string;
  sourceType: ResonanceInputSourceType;
  status: "accepted";
  receivedAt: string;
  tags: string[];
  queryText: string;
  summaryText: string;
  previewText?: string;
  file?: ResonanceFileReference;
  rawText?: string;
  analysis?: ResonanceInputAnalysis;
}

export interface CreateResonanceInputParams {
  inputId: string;
  request: ResonanceInputRequest;
  occurredAt: string;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function buildTextSummary(text: string): string {
  return truncateText(collapseWhitespace(text), 220);
}

function buildPreviewText(text: string): string {
  return truncateText(collapseWhitespace(text), 48);
}

function buildFileSummary(file: ResonanceFileReference, tags: readonly string[]): string {
  const tagSuffix = tags.length > 0 ? ` Tags: ${tags.join(", ")}.` : "";
  return `Uploaded file "${file.fileName}" for resonance comparison.${tagSuffix}`;
}

function buildFileQueryText(file: ResonanceFileReference, tags: readonly string[]): string {
  return collapseWhitespace([file.fileName, ...tags].join(" "));
}

export function createResonanceInput(
  params: CreateResonanceInputParams
): ResonanceInput {
  const tags = normalizeTags(params.request.tags);

  if (params.request.sourceType === "text") {
    const rawText = collapseWhitespace(params.request.text);

    return {
      inputId: params.inputId,
      sourceType: "text",
      status: "accepted",
      receivedAt: params.occurredAt,
      tags,
      rawText,
      queryText: rawText,
      summaryText: buildTextSummary(rawText),
      previewText: buildPreviewText(rawText)
    };
  }

  return {
    inputId: params.inputId,
    sourceType: "file",
    status: "accepted",
    receivedAt: params.occurredAt,
    tags,
    file: params.request.file,
    queryText: buildFileQueryText(params.request.file, tags),
    summaryText: buildFileSummary(params.request.file, tags)
  };
}

export function getResonanceInputExcerpt(input: ResonanceInput): string {
  return input.rawText ?? input.summaryText;
}

export function toResonanceInputData(
  input: ResonanceInput
): ResonanceInputResponse["data"] {
  return {
    inputId: input.inputId,
    sourceType: input.sourceType,
    status: input.status,
    bootstrap: createResonanceBootstrapSummary(),
    receivedAt: input.receivedAt,
    ...(input.previewText ? { previewText: input.previewText } : {}),
    ...(input.file ? { file: input.file } : {})
  };
}

function createResonanceBootstrapSummary(): HostBootstrapSummary {
  return {
    ready: true,
    workflow: "resonance",
    scene: "focus"
  };
}
