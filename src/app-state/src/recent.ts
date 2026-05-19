import {
  entityIdSchema,
  isoDateTimeSchema,
  workflowKindSchema,
  type WorkflowKind
} from "@psyai/shared";

import { assertSchemaValue } from "./validation.js";

// ---------------------------------------------------------------------------
// ReportPointer — lightweight reference to the last-opened report
// ---------------------------------------------------------------------------

export interface ReportPointer {
  reportId: string;
  workflow: WorkflowKind;
  label?: string;
  openedAt: string;
}

// ---------------------------------------------------------------------------
// RecentWorkflowEntry — a single recently-accessed workflow
// ---------------------------------------------------------------------------

export interface RecentWorkflowEntry {
  workflow: WorkflowKind;
  lastAccessedAt: string;
  lastEntityId?: string;
  lastEntityLabel?: string;
}

// ---------------------------------------------------------------------------
// AppRecentState — last-opened report + recent workflow list
// ---------------------------------------------------------------------------

export interface AppRecentState {
  lastOpenedReport: ReportPointer | null;
  recentWorkflows: RecentWorkflowEntry[];
}

export const emptyAppRecentState: AppRecentState = {
  lastOpenedReport: null,
  recentWorkflows: []
};

export const MAX_RECENT_WORKFLOWS = 5;

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

function assertPointerLabel(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must not be empty when provided`);
  }
}

function assertWorkflowKind(value: WorkflowKind, fieldName: string): void {
  assertSchemaValue(
    workflowKindSchema,
    value,
    `${fieldName} must match a shared workflow kind`
  );
}

function assertEntityId(id: string, fieldName: string): void {
  assertSchemaValue(entityIdSchema, id, `${fieldName} must match shared entity id rules`);
}

function assertIsoDateTime(value: string, fieldName: string): void {
  assertSchemaValue(
    isoDateTimeSchema,
    value,
    `${fieldName} must be a valid ISO datetime with offset`
  );
}

export function assertReportPointer(value: ReportPointer): asserts value is ReportPointer {
  assertEntityId(value.reportId, "reportPointer.reportId");
  assertWorkflowKind(value.workflow, "reportPointer.workflow");
  assertIsoDateTime(value.openedAt, "reportPointer.openedAt");

  if (value.label !== undefined) {
    assertPointerLabel(value.label, "reportPointer.label");
  }
}

export function assertRecentWorkflowEntry(
  value: RecentWorkflowEntry
): asserts value is RecentWorkflowEntry {
  assertWorkflowKind(value.workflow, "recentWorkflowEntry.workflow");
  assertIsoDateTime(value.lastAccessedAt, "recentWorkflowEntry.lastAccessedAt");

  if (value.lastEntityId !== undefined) {
    assertEntityId(value.lastEntityId, "recentWorkflowEntry.lastEntityId");
  }

  if (value.lastEntityLabel !== undefined) {
    assertPointerLabel(value.lastEntityLabel, "recentWorkflowEntry.lastEntityLabel");
  }
}

export function assertAppRecentState(
  value: AppRecentState
): asserts value is AppRecentState {
  if (value.lastOpenedReport !== null) {
    assertReportPointer(value.lastOpenedReport);
  }

  if (!Array.isArray(value.recentWorkflows)) {
    throw new Error("recent.recentWorkflows must be an array");
  }

  if (value.recentWorkflows.length > MAX_RECENT_WORKFLOWS) {
    throw new Error(
      `recent.recentWorkflows must not exceed ${MAX_RECENT_WORKFLOWS} entries`
    );
  }

  for (const entry of value.recentWorkflows) {
    assertRecentWorkflowEntry(entry);
  }
}
