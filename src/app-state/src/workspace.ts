import {
  sceneIdSchema,
  workflowKindSchema,
  type SceneId,
  type WorkflowKind
} from "@psyai/shared";

import { assertSchemaValue } from "./validation.js";

/**
 * Lightweight recovery snapshot — what to restore when the product reopens.
 *
 * Stores only identifiers and scene hints, never full business content.
 * Persistence is delegated to infrastructure-core via store interfaces.
 */
export interface AppWorkspaceRecoveryState {
  /** Scene to restore on next launch. */
  restoreScene: SceneId;
  /** Workflow to restore context for. */
  restoreWorkflow: WorkflowKind | null;
  /** Active entity ID for the restore workflow (session/run/input id). */
  restoreEntityId: string | null;
  /** Last-opened report ID, if any. */
  restoreReportId: string | null;
  /** ISO datetime when this snapshot was captured. */
  capturedAt: string | null;
  /** Whether there is an in-progress operation that should be resumed. */
  hasPendingOperation: boolean;
  /** Human-readable hint about what to resume (e.g. "Continue counseling session"). */
  resumeHint: string | null;
}

export interface AppWorkspaceRecoveryPatch
  extends Partial<AppWorkspaceRecoveryState> {}

export const emptyAppWorkspaceRecoveryState: AppWorkspaceRecoveryState = {
  restoreScene: "entry",
  restoreWorkflow: null,
  restoreEntityId: null,
  restoreReportId: null,
  capturedAt: null,
  hasPendingOperation: false,
  resumeHint: null
};

function assertSceneId(value: string, fieldName: string): void {
  assertSchemaValue(
    sceneIdSchema,
    value,
    `${fieldName} must match a shared scene id`
  );
}

function assertWorkflowKindOrNull(
  value: WorkflowKind | null,
  fieldName: string
): void {
  if (value !== null) {
    assertSchemaValue(
      workflowKindSchema,
      value,
      `${fieldName} must match a shared workflow kind`
    );
  }
}

export function assertAppWorkspaceRecoveryState(
  value: AppWorkspaceRecoveryState
): asserts value is AppWorkspaceRecoveryState {
  assertSceneId(value.restoreScene, "workspaceRecovery.restoreScene");
  assertWorkflowKindOrNull(value.restoreWorkflow, "workspaceRecovery.restoreWorkflow");

  if (typeof value.restoreEntityId !== "string" && value.restoreEntityId !== null) {
    throw new Error("workspaceRecovery.restoreEntityId must be a string or null");
  }

  if (typeof value.restoreReportId !== "string" && value.restoreReportId !== null) {
    throw new Error("workspaceRecovery.restoreReportId must be a string or null");
  }

  if (
    value.capturedAt !== null &&
    typeof value.capturedAt !== "string"
  ) {
    throw new Error("workspaceRecovery.capturedAt must be a string when set");
  }

  if (typeof value.hasPendingOperation !== "boolean") {
    throw new Error("workspaceRecovery.hasPendingOperation must be boolean");
  }

  if (typeof value.resumeHint !== "string" && value.resumeHint !== null) {
    throw new Error("workspaceRecovery.resumeHint must be a string or null");
  }
}

export function createDefaultAppWorkspaceRecoveryState(
  overrides: AppWorkspaceRecoveryPatch = {}
): AppWorkspaceRecoveryState {
  const next: AppWorkspaceRecoveryState = {
    ...emptyAppWorkspaceRecoveryState,
    ...overrides
  };

  assertAppWorkspaceRecoveryState(next);
  return next;
}
