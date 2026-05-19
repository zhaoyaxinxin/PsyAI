import { isoDateTimeSchema } from "@psyai/shared";

import { assertSchemaValue } from "./validation.js";

/**
 * Lightweight consent state for disclaimer acceptance and risk prompt acknowledgement.
 *
 * Persistence is delegated to infrastructure-core via the store interface pattern —
 * no real storage implementation is included in this package.
 */
export interface AppConsentState {
  /** Whether the user has accepted the product disclaimer. */
  disclaimerAccepted: boolean;
  /** ISO datetime when the disclaimer was accepted, or null if not yet accepted. */
  disclaimerAcceptedAt: string | null;
  /** Whether the user has acknowledged the risk prompt. */
  riskPromptAcknowledged: boolean;
  /** ISO datetime when the risk prompt was acknowledged, or null if not yet acknowledged. */
  riskPromptAcknowledgedAt: string | null;
  /** Version identifier of the consent documents last accepted. Used for upgrade re-prompt. */
  consentVersion: string | null;
}

export interface AppConsentPatch extends Partial<AppConsentState> {}

/**
 * Persistence interface for loading, saving and resetting consent state.
 *
 * Real storage implementations (file system, SQLite, browser localStorage)
 * belong in infrastructure-core and must satisfy this contract.
 * This package only declares the interface — it never ships a concrete store.
 */
export interface AppConsentStore {
  load(): Promise<AppConsentState>;
  save(next: AppConsentState): Promise<AppConsentState>;
  patch(patch: AppConsentPatch): Promise<AppConsentState>;
  reset(): Promise<AppConsentState>;
}

export const CURRENT_CONSENT_VERSION = "v1" as const;

export const defaultAppConsentState: AppConsentState = {
  disclaimerAccepted: false,
  disclaimerAcceptedAt: null,
  riskPromptAcknowledged: false,
  riskPromptAcknowledgedAt: null,
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

export function assertAppConsentState(
  value: AppConsentState
): asserts value is AppConsentState {
  if (typeof value.disclaimerAccepted !== "boolean") {
    throw new Error("consent.disclaimerAccepted must be boolean");
  }

  assertIsoDateTimeOrNull(
    value.disclaimerAcceptedAt,
    "consent.disclaimerAcceptedAt"
  );

  if (value.disclaimerAccepted && value.disclaimerAcceptedAt === null) {
    throw new Error(
      "consent.disclaimerAcceptedAt must be set when disclaimerAccepted is true"
    );
  }

  if (!value.disclaimerAccepted && value.disclaimerAcceptedAt !== null) {
    throw new Error(
      "consent.disclaimerAcceptedAt must be null when disclaimerAccepted is false"
    );
  }

  if (typeof value.riskPromptAcknowledged !== "boolean") {
    throw new Error("consent.riskPromptAcknowledged must be boolean");
  }

  assertIsoDateTimeOrNull(
    value.riskPromptAcknowledgedAt,
    "consent.riskPromptAcknowledgedAt"
  );

  if (value.riskPromptAcknowledged && value.riskPromptAcknowledgedAt === null) {
    throw new Error(
      "consent.riskPromptAcknowledgedAt must be set when riskPromptAcknowledged is true"
    );
  }

  if (
    !value.riskPromptAcknowledged &&
    value.riskPromptAcknowledgedAt !== null
  ) {
    throw new Error(
      "consent.riskPromptAcknowledgedAt must be null when riskPromptAcknowledged is false"
    );
  }

  if (
    value.consentVersion !== null &&
    typeof value.consentVersion !== "string"
  ) {
    throw new Error("consent.consentVersion must be a string when set");
  }
}

export function createDefaultAppConsentState(
  overrides: AppConsentPatch = {}
): AppConsentState {
  const next: AppConsentState = {
    ...defaultAppConsentState,
    ...overrides
  };

  assertAppConsentState(next);
  return next;
}
