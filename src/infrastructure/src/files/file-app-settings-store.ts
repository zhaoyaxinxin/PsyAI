import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type {
  AppSettingsLike,
  AppSettingsPatchLike,
  AppSettingsStoreLike
} from "../compatibility.js";
import { cloneValue } from "../common/clone.js";

export interface FileAppSettingsStoreOptions<TSettings extends AppSettingsLike = AppSettingsLike> {
  filePath: string;
  defaults: TSettings;
}

function mergeAppSettings<TSettings extends AppSettingsLike>(
  base: TSettings,
  patch: AppSettingsPatchLike
): TSettings {
  return {
    ...base,
    ...patch,
    modelSelection: {
      ...base.modelSelection,
      ...patch.modelSelection
    }
  };
}

function isMissingFileError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}

export class FileAppSettingsStore<TSettings extends AppSettingsLike = AppSettingsLike>
  implements AppSettingsStoreLike<TSettings>
{
  readonly #filePath: string;
  readonly #defaults: TSettings;

  constructor(options: FileAppSettingsStoreOptions<TSettings>) {
    this.#filePath = resolve(options.filePath);
    this.#defaults = cloneValue(options.defaults);
  }

  async load(): Promise<TSettings> {
    try {
      const content = await readFile(this.#filePath, { encoding: "utf8" });
      return cloneValue(JSON.parse(content) as TSettings);
    } catch (error) {
      if (isMissingFileError(error)) {
        await this.save(this.#defaults);
        return cloneValue(this.#defaults);
      }

      throw error;
    }
  }

  async save(next: TSettings): Promise<TSettings> {
    await mkdir(dirname(this.#filePath), { recursive: true });
    await writeFile(this.#filePath, `${JSON.stringify(next, null, 2)}\n`, {
      encoding: "utf8"
    });
    return cloneValue(next);
  }

  async patch(patch: AppSettingsPatchLike): Promise<TSettings> {
    const current = await this.load();
    return this.save(mergeAppSettings(current, patch));
  }

  async reset(): Promise<TSettings> {
    return this.save(this.#defaults);
  }
}
