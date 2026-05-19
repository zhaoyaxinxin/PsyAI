import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";

export const localFileStorageScopes = [
  "uploads",
  "snapshots",
  "exports",
  "db",
  "indexes",
  "knowledge-counseling",
  "knowledge-resonance"
] as const;

export type LocalFileStorageScope = (typeof localFileStorageScopes)[number];

export interface LocalFileStorageOptions {
  rootDirectory: string;
}

export interface FileStorageLocation {
  scope: LocalFileStorageScope;
  relativePath: string;
}

export interface FileStorageWriteTextInput extends FileStorageLocation {
  content: string;
}

export interface FileStorageWriteJsonInput<TValue> extends FileStorageLocation {
  value: TValue;
  spacing?: number;
}

function assertRelativePath(relativePath: string): string {
  const normalized = normalize(relativePath).replace(/\\/g, "/");
  if (normalized.length === 0 || normalized === "." || normalized === "/") {
    throw new Error("relativePath must not be empty");
  }

  if (isAbsolute(normalized) || normalized.startsWith("../") || normalized === "..") {
    throw new Error("relativePath must stay inside the selected storage scope");
  }

  return normalized;
}

export class LocalFileStorage {
  readonly #rootDirectory: string;

  constructor(options: LocalFileStorageOptions) {
    this.#rootDirectory = resolve(options.rootDirectory);
  }

  resolvePath(location: FileStorageLocation): string {
    const safeRelativePath = assertRelativePath(location.relativePath);
    const scopeRoot = resolve(this.#rootDirectory, location.scope);
    const absolutePath = resolve(scopeRoot, safeRelativePath);
    const scopeRelativePath = relative(scopeRoot, absolutePath);

    if (scopeRelativePath.startsWith("..")) {
      throw new Error("resolved path escaped the selected storage scope");
    }

    return absolutePath;
  }

  async writeText(input: FileStorageWriteTextInput): Promise<string> {
    const absolutePath = this.resolvePath(input);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.content, { encoding: "utf8" });
    return absolutePath;
  }

  async writeJson<TValue>(input: FileStorageWriteJsonInput<TValue>): Promise<string> {
    return this.writeText({
      scope: input.scope,
      relativePath: input.relativePath,
      content: `${JSON.stringify(input.value, null, input.spacing ?? 2)}\n`
    });
  }

  async readText(location: FileStorageLocation): Promise<string> {
    const absolutePath = this.resolvePath(location);
    return readFile(absolutePath, { encoding: "utf8" });
  }

  async readJson<TValue>(location: FileStorageLocation): Promise<TValue> {
    const content = await this.readText(location);
    return JSON.parse(content) as TValue;
  }

  async exists(location: FileStorageLocation): Promise<boolean> {
    const absolutePath = this.resolvePath(location);
    try {
      await access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(location: FileStorageLocation): Promise<void> {
    const absolutePath = this.resolvePath(location);
    await rm(absolutePath, {
      force: true
    });
  }

  getScopeRoot(scope: LocalFileStorageScope): string {
    return join(this.#rootDirectory, scope);
  }
}
