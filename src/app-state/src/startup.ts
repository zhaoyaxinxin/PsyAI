import { isoDateTimeSchema } from "@psyai/shared";

import { assertSchemaValue } from "./validation.js";

/**
 * Tracks the product's startup lifecycle — first-run detection,
 * consent completion, and recovery hints.
 *
 * Persistence is delegated to infrastructure-core via store interfaces.
 */
export interface AppStartupState {
  /** True until the first successful startup + consent flow completes. */
  firstRun: boolean;
  /** ISO datetime of the last completed startup, or null. */
  lastStartupCompletedAt: string | null;
  /** Whether the consent flow (disclaimer + risk prompt) was completed at least once. */
  consentCheckCompleted: boolean;
  /** ISO datetime when consent was last completed, or null. */
  consentCheckCompletedAt: string | null;
  /** Version string of the consent documents the user last accepted. */
  consentVersion: string | null;
}

export interface AppStartupStatePatch extends Partial<AppStartupState> {}

export const defaultAppStartupState: AppStartupState = {
  firstRun: true,
  lastStartupCompletedAt: null,
  consentCheckCompleted: false,
  consentCheckCompletedAt: null,
  consentVersion: null
};

function assertIsoDateTimeOrNull(
  value: string | null,
  fieldName: string
): void {
  if (value !== null) {
    assertSchemaValue(
      isoDateTimeSchema,
      value,
      `${fieldName} must be a valid ISO datetime with offset`
    );
  }
}

export function assertAppStartupState(
  value: AppStartupState
): asserts value is AppStartupState {
  if (typeof value.firstRun !== "boolean") {
    throw new Error("startup.firstRun must be boolean");
  }

  assertIsoDateTimeOrNull(value.lastStartupCompletedAt, "startup.lastStartupCompletedAt");
  assertIsoDateTimeOrNull(value.consentCheckCompletedAt, "startup.consentCheckCompletedAt");

  if (typeof value.consentCheckCompleted !== "boolean") {
    throw new Error("startup.consentCheckCompleted must be boolean");
  }

  if (value.consentCheckCompleted && value.consentCheckCompletedAt === null) {
    throw new Error(
      "startup.consentCheckCompletedAt must be set when consentCheckCompleted is true"
    );
  }

  if (!value.consentCheckCompleted && value.consentCheckCompletedAt !== null) {
    throw new Error(
      "startup.consentCheckCompletedAt must be null when consentCheckCompleted is false"
    );
  }
}

export function createDefaultAppStartupState(
  overrides: AppStartupStatePatch = {}
): AppStartupState {
  const next: AppStartupState = {
    ...defaultAppStartupState,
    ...overrides
  };

  assertAppStartupState(next);
  return next;
}
