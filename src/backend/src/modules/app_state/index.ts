import {
  assertAppSettings,
  createDefaultAppBootstrapState,
  createDefaultAppSettings,
  type AppBootstrapState,
  type AppBootstrapStatePatch,
  type AppSettings,
  type AppSettingsPatch,
  type AppSettingsStore
} from "@psyai/app-state";

export interface BackendAppBootstrapOptions {
  settingsStore?: AppSettingsStore;
  bootstrapOverrides?: AppBootstrapStatePatch;
}

function cloneSettings(value: AppSettings): AppSettings {
  return {
    ...value,
    modelSelection: {
      ...value.modelSelection
    }
  };
}

export class InMemoryAppSettingsStore implements AppSettingsStore {
  private settings: AppSettings;

  constructor(initialSettings: AppSettingsPatch = {}) {
    this.settings = createDefaultAppSettings(initialSettings);
  }

  async load(): Promise<AppSettings> {
    return cloneSettings(this.settings);
  }

  async save(next: AppSettings): Promise<AppSettings> {
    assertAppSettings(next);
    this.settings = cloneSettings(next);
    return this.load();
  }

  async patch(patch: AppSettingsPatch): Promise<AppSettings> {
    this.settings = createDefaultAppSettings({
      ...this.settings,
      ...patch,
      modelSelection: {
        ...this.settings.modelSelection,
        ...patch.modelSelection
      }
    });

    return this.load();
  }

  async reset(): Promise<AppSettings> {
    this.settings = createDefaultAppSettings();
    return this.load();
  }
}

export async function createBackendAppBootstrapState(
  options: BackendAppBootstrapOptions = {}
): Promise<AppBootstrapState> {
  const settingsStore = options.settingsStore ?? new InMemoryAppSettingsStore();
  const settings = await settingsStore.load();

  return createDefaultAppBootstrapState({
    ...options.bootstrapOverrides,
    settings
  });
}
