import { type WorkflowKind } from "@psyai/shared";

import { assertNonEmptyString, assertOneOf } from "./validation.js";

export const appThemeValues = ["system", "light", "dark"] as const;
export const appLanguageValues = ["zh-CN", "en-US"] as const;

export type AppTheme = (typeof appThemeValues)[number];
export type AppLanguage = (typeof appLanguageValues)[number];

export interface AppModelSelection {
  provider: string;
  modelId: string;
}

export interface AppSettings {
  theme: AppTheme;
  language: AppLanguage;
  workspaceRoot: string;
  dataRoot: string;
  exportDirectory: string;
  modelSelection: AppModelSelection;
}

export interface AppFeatureFlags {
  enableLocalIndexing: boolean;
  enableExperimentalScenes: boolean;
}

export interface AppSettingsPatch extends Partial<Omit<AppSettings, "modelSelection">> {
  modelSelection?: Partial<AppModelSelection>;
}

/**
 * Persistence interface for loading, saving and resetting app settings.
 *
 * Real storage implementations (file system, SQLite, browser localStorage)
 * belong in infrastructure-core and must satisfy this contract.
 * This package only declares the interface — it never ships a concrete store.
 */

export interface AppSettingsStore {
  load(): Promise<AppSettings>;
  save(next: AppSettings): Promise<AppSettings>;
  patch(patch: AppSettingsPatch): Promise<AppSettings>;
  reset(): Promise<AppSettings>;
}

export const defaultAppSettings: AppSettings = {
  theme: "system",
  language: "zh-CN",
  workspaceRoot: "src",
  dataRoot: "data",
  exportDirectory: "exports",
  modelSelection: {
    provider: "deepseek",
    modelId: "deepseek-v4-flash"
  }
};

export const defaultAppFeatureFlags: AppFeatureFlags = {
  enableLocalIndexing: true,
  enableExperimentalScenes: false
};

function assertSettingsLike(value: AppSettings): void {
  assertOneOf(value.theme, appThemeValues, "settings.theme");
  assertOneOf(value.language, appLanguageValues, "settings.language");
  assertNonEmptyString(value.workspaceRoot, "settings.workspaceRoot");
  assertNonEmptyString(value.dataRoot, "settings.dataRoot");
  assertNonEmptyString(value.exportDirectory, "settings.exportDirectory");
  assertNonEmptyString(value.modelSelection.provider, "settings.modelSelection.provider");
  assertNonEmptyString(value.modelSelection.modelId, "settings.modelSelection.modelId");
}

function assertFeatureFlagsLike(value: AppFeatureFlags): void {
  if (typeof value.enableLocalIndexing !== "boolean") {
    throw new Error("featureFlags.enableLocalIndexing must be boolean");
  }

  if (typeof value.enableExperimentalScenes !== "boolean") {
    throw new Error("featureFlags.enableExperimentalScenes must be boolean");
  }
}

export function assertAppSettings(value: AppSettings): asserts value is AppSettings {
  assertSettingsLike(value);
}

export function assertAppFeatureFlags(value: AppFeatureFlags): asserts value is AppFeatureFlags {
  assertFeatureFlagsLike(value);
}

export function createDefaultAppSettings(overrides: AppSettingsPatch = {}): AppSettings {
  const next: AppSettings = {
    ...defaultAppSettings,
    ...overrides,
    modelSelection: {
      ...defaultAppSettings.modelSelection,
      ...overrides.modelSelection
    }
  };

  assertAppSettings(next);
  return next;
}

export type AppWorkflowPreference = WorkflowKind;
