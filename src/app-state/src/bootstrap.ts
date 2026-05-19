import {
  dataDirectorySchema,
  dataDirectoryValues,
  hostInitializationErrorKindSchema,
  sceneIdSchema,
  workflowKindSchema,
  type DataDirectory,
  type HostInitializationErrorKind,
  type SceneId,
  type WorkflowKind
} from "@psyai/shared";

import {
  assertAppFeatureFlags,
  assertAppSettings,
  createDefaultAppSettings,
  defaultAppFeatureFlags,
  type AppFeatureFlags,
  type AppSettings,
  type AppSettingsPatch
} from "./settings.js";
import {
  assertAppActivePointers,
  emptyAppActivePointers,
  type AppActivePointers
} from "./pointers.js";
import {
  assertAppRecentState,
  emptyAppRecentState,
  type AppRecentState
} from "./recent.js";
import {
  assertAppConsentState,
  createDefaultAppConsentState,
  type AppConsentPatch,
  type AppConsentState
} from "./consent.js";
import {
  assertAppProviderConfig,
  createDefaultAppProviderConfig,
  type AppProviderConfig,
  type AppProviderConfigPatch
} from "./provider-config.js";
import {
  assertAppStartupState,
  createDefaultAppStartupState,
  type AppStartupState,
  type AppStartupStatePatch
} from "./startup.js";
import {
  assertAppWorkspaceRecoveryState,
  createDefaultAppWorkspaceRecoveryState,
  type AppWorkspaceRecoveryPatch,
  type AppWorkspaceRecoveryState
} from "./workspace.js";
import { assertNonEmptyString, assertSchemaValue } from "./validation.js";

export interface AppHostInitializationState {
  ready: boolean;
  error: HostInitializationErrorKind | null;
}

export type AppBootstrapDataDirectories = Record<DataDirectory, string>;

export interface AppBootstrapStorageState {
  workspaceRoot: string;
  exportDirectory: string;
  dataDirectories: AppBootstrapDataDirectories;
}

export interface AppBootstrapStoragePatch
  extends Partial<Omit<AppBootstrapStorageState, "dataDirectories">> {
  dataDirectories?: Partial<AppBootstrapDataDirectories>;
}

export interface AppBootstrapState {
  defaultScene: SceneId;
  defaultWorkflow: WorkflowKind;
  hostInitialization: AppHostInitializationState;
  storage: AppBootstrapStorageState;
  settings: AppSettings;
  featureFlags: AppFeatureFlags;
  consent: AppConsentState;
  activePointers: AppActivePointers;
  recent: AppRecentState;
  providerConfig: AppProviderConfig;
  startup: AppStartupState;
  workspaceRecovery: AppWorkspaceRecoveryState;
  lastActiveWorkflow: WorkflowKind | null;
}

export interface AppBootstrapStatePatch
  extends Partial<
    Omit<
      AppBootstrapState,
      "settings" | "featureFlags" | "consent" | "activePointers" | "recent" | "hostInitialization" | "storage" | "providerConfig" | "startup" | "workspaceRecovery"
    >
  > {
  settings?: AppSettingsPatch;
  featureFlags?: Partial<AppFeatureFlags>;
  consent?: AppConsentPatch;
  activePointers?: Partial<AppActivePointers>;
  recent?: Partial<AppRecentState>;
  hostInitialization?: Partial<AppHostInitializationState>;
  storage?: AppBootstrapStoragePatch;
  providerConfig?: AppProviderConfigPatch;
  startup?: AppStartupStatePatch;
  workspaceRecovery?: AppWorkspaceRecoveryPatch;
}

export const defaultAppHostInitializationState: AppHostInitializationState = {
  ready: false,
  error: null
};

export const defaultAppBootstrapDataDirectories: AppBootstrapDataDirectories = {
  uploads: "uploads",
  snapshots: "snapshots",
  exports: "exports",
  db: "db",
  indexes: "indexes"
};

export const defaultAppBootstrapScene: SceneId = "entry";
export const defaultAppBootstrapWorkflow: WorkflowKind = "counseling";

function assertWorkflowKind(value: WorkflowKind, fieldName: string): void {
  assertSchemaValue(
    workflowKindSchema,
    value,
    `${fieldName} must match a shared workflow kind`
  );
}

function assertSceneId(value: SceneId, fieldName: string): void {
  assertSchemaValue(sceneIdSchema, value, `${fieldName} must match a shared scene id`);
}

function assertHostInitializationError(
  value: HostInitializationErrorKind,
  fieldName: string
): void {
  assertSchemaValue(
    hostInitializationErrorKindSchema,
    value,
    `${fieldName} must match a shared host initialization error kind`
  );
}

export function assertAppHostInitializationState(
  value: AppHostInitializationState
): asserts value is AppHostInitializationState {
  if (typeof value.ready !== "boolean") {
    throw new Error("hostInitialization.ready must be boolean");
  }

  if (value.error !== null) {
    assertHostInitializationError(value.error, "hostInitialization.error");
  }

  if (value.ready && value.error !== null) {
    throw new Error("hostInitialization.error must be null when hostInitialization.ready is true");
  }
}

export function assertAppBootstrapDataDirectories(
  value: AppBootstrapDataDirectories
): asserts value is AppBootstrapDataDirectories {
  for (const key of dataDirectoryValues) {
    assertSchemaValue(dataDirectorySchema, key, "storage.dataDirectories key must be a shared data directory");
    assertNonEmptyString(value[key], `storage.dataDirectories.${key}`);
  }
}

export function assertAppBootstrapStorageState(
  value: AppBootstrapStorageState
): asserts value is AppBootstrapStorageState {
  assertNonEmptyString(value.workspaceRoot, "storage.workspaceRoot");
  assertNonEmptyString(value.exportDirectory, "storage.exportDirectory");
  assertAppBootstrapDataDirectories(value.dataDirectories);

  if (value.dataDirectories.exports !== value.exportDirectory) {
    throw new Error("storage.dataDirectories.exports must match storage.exportDirectory");
  }
}

export function assertAppBootstrapState(value: AppBootstrapState): asserts value is AppBootstrapState {
  assertSceneId(value.defaultScene, "defaultScene");
  assertWorkflowKind(value.defaultWorkflow, "defaultWorkflow");
  assertAppHostInitializationState(value.hostInitialization);
  assertAppBootstrapStorageState(value.storage);
  assertAppSettings(value.settings);
  assertAppFeatureFlags(value.featureFlags);
  assertAppConsentState(value.consent);
  assertAppActivePointers(value.activePointers);
  assertAppRecentState(value.recent);
  assertAppProviderConfig(value.providerConfig);
  assertAppStartupState(value.startup);
  assertAppWorkspaceRecoveryState(value.workspaceRecovery);

  if (value.settings.workspaceRoot !== value.storage.workspaceRoot) {
    throw new Error("settings.workspaceRoot must match storage.workspaceRoot");
  }

  if (value.settings.exportDirectory !== value.storage.exportDirectory) {
    throw new Error("settings.exportDirectory must match storage.exportDirectory");
  }

  if (value.providerConfig.provider !== value.settings.modelSelection.provider) {
    throw new Error("providerConfig.provider must match settings.modelSelection.provider");
  }

  if (value.providerConfig.modelId !== value.settings.modelSelection.modelId) {
    throw new Error("providerConfig.modelId must match settings.modelSelection.modelId");
  }

  if (value.lastActiveWorkflow !== null) {
    assertWorkflowKind(value.lastActiveWorkflow, "lastActiveWorkflow");
  }
}

function createSettingsFromBootstrapOverrides(
  settingsOverrides: AppSettingsPatch = {},
  storageOverrides: AppBootstrapStoragePatch = {}
): AppSettings {
  if (
    settingsOverrides.workspaceRoot !== undefined &&
    storageOverrides.workspaceRoot !== undefined &&
    settingsOverrides.workspaceRoot !== storageOverrides.workspaceRoot
  ) {
    throw new Error("settings.workspaceRoot must match storage.workspaceRoot when both are provided");
  }

  if (
    settingsOverrides.exportDirectory !== undefined &&
    storageOverrides.exportDirectory !== undefined &&
    settingsOverrides.exportDirectory !== storageOverrides.exportDirectory
  ) {
    throw new Error("settings.exportDirectory must match storage.exportDirectory when both are provided");
  }

  const nextSettingsOverrides: AppSettingsPatch = {
    ...settingsOverrides
  };

  if (storageOverrides.workspaceRoot !== undefined) {
    nextSettingsOverrides.workspaceRoot = storageOverrides.workspaceRoot;
  }

  if (storageOverrides.exportDirectory !== undefined) {
    nextSettingsOverrides.exportDirectory = storageOverrides.exportDirectory;
  }

  return createDefaultAppSettings(nextSettingsOverrides);
}

export function createDefaultAppBootstrapStorageState(
  settings: AppSettings,
  overrides: AppBootstrapStoragePatch = {}
): AppBootstrapStorageState {
  const exportDirectory = overrides.exportDirectory ?? settings.exportDirectory;
  const next: AppBootstrapStorageState = {
    workspaceRoot: overrides.workspaceRoot ?? settings.workspaceRoot,
    exportDirectory,
    dataDirectories: {
      ...defaultAppBootstrapDataDirectories,
      exports: exportDirectory,
      ...overrides.dataDirectories
    }
  };

  assertAppBootstrapStorageState(next);
  return next;
}

export function createDefaultAppBootstrapState(
  overrides: AppBootstrapStatePatch = {}
): AppBootstrapState {
  const settings = createSettingsFromBootstrapOverrides(
    overrides.settings,
    overrides.storage
  );
  const providerConfig = createDefaultAppProviderConfig(
    overrides.providerConfig ?? {
      provider: settings.modelSelection.provider,
      modelId: settings.modelSelection.modelId
    }
  );
  const next: AppBootstrapState = {
    defaultScene: overrides.defaultScene ?? defaultAppBootstrapScene,
    defaultWorkflow: overrides.defaultWorkflow ?? defaultAppBootstrapWorkflow,
    hostInitialization: {
      ...defaultAppHostInitializationState,
      ...overrides.hostInitialization
    },
    storage: createDefaultAppBootstrapStorageState(settings, overrides.storage),
    settings,
    featureFlags: {
      ...defaultAppFeatureFlags,
      ...overrides.featureFlags
    },
    consent: createDefaultAppConsentState(overrides.consent),
    activePointers: {
      ...emptyAppActivePointers,
      ...overrides.activePointers
    },
    recent: {
      ...emptyAppRecentState,
      ...overrides.recent
    },
    providerConfig,
    startup: createDefaultAppStartupState(overrides.startup),
    workspaceRecovery: createDefaultAppWorkspaceRecoveryState(overrides.workspaceRecovery),
    lastActiveWorkflow: overrides.lastActiveWorkflow ?? null
  };

  assertAppBootstrapState(next);
  return next;
}
