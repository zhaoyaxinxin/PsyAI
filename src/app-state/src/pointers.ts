import {
  entityIdSchema,
  isoDateTimeSchema,
  workflowKindSchema,
  type WorkflowKind
} from "@psyai/shared";

import { assertSchemaValue } from "./validation.js";

interface AppEntityPointerBase {
  id: string;
  label?: string;
  updatedAt?: string;
}

export interface CounselingSessionPointer extends AppEntityPointerBase {
  workflow: "counseling";
}

export interface SimulationRunPointer extends AppEntityPointerBase {
  workflow: "simulation";
}

export interface ResonanceInputPointer extends AppEntityPointerBase {
  workflow: "resonance";
}

export interface AppActivePointers {
  counselingSession: CounselingSessionPointer | null;
  simulationRun: SimulationRunPointer | null;
  resonanceInput: ResonanceInputPointer | null;
}

export const emptyAppActivePointers: AppActivePointers = {
  counselingSession: null,
  simulationRun: null,
  resonanceInput: null
};

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

function assertPointerId(id: string, fieldName: string): void {
  assertSchemaValue(entityIdSchema, id, `${fieldName} must match shared entity id rules`);
}

function assertIsoDateTime(value: string, fieldName: string): void {
  assertSchemaValue(
    isoDateTimeSchema,
    value,
    `${fieldName} must be a valid ISO datetime with offset`
  );
}

function assertPointer<TWorkflow extends WorkflowKind>(
  value: AppEntityPointerBase & { workflow: TWorkflow },
  expectedWorkflow: TWorkflow,
  fieldName: string
): void {
  assertWorkflowKind(value.workflow, `${fieldName}.workflow`);
  if (value.workflow !== expectedWorkflow) {
    throw new Error(`${fieldName}.workflow must be ${expectedWorkflow}`);
  }

  assertPointerId(value.id, `${fieldName}.id`);

  if (value.label !== undefined) {
    assertPointerLabel(value.label, `${fieldName}.label`);
  }

  if (value.updatedAt !== undefined) {
    assertIsoDateTime(value.updatedAt, `${fieldName}.updatedAt`);
  }
}

export function assertAppActivePointers(value: AppActivePointers): asserts value is AppActivePointers {
  if (value.counselingSession !== null) {
    assertPointer(value.counselingSession, "counseling", "activePointers.counselingSession");
  }

  if (value.simulationRun !== null) {
    assertPointer(value.simulationRun, "simulation", "activePointers.simulationRun");
  }

  if (value.resonanceInput !== null) {
    assertPointer(value.resonanceInput, "resonance", "activePointers.resonanceInput");
  }
}
