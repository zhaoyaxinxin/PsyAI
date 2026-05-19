import {
  type PromptAssetLoader,
  type PromptAssetSelection,
  type PromptPack,
  type PromptPackCatalog,
  type PromptPackSummary,
  type PromptTemplate,
  createPromptPackSummary,
  validatePromptPack
} from "./prompt-asset.js";

function createPackLookupKey(packId: string, version: string): string {
  return `${packId}::${version}`;
}

export class PromptPackNotFoundError extends Error {
  constructor(packId: string, version: string) {
    super(`Prompt pack '${packId}' version '${version}' was not found.`);
    this.name = "PromptPackNotFoundError";
  }
}

export class PromptTemplateNotFoundError extends Error {
  constructor(selection: PromptAssetSelection) {
    super(
      `Prompt template '${selection.promptKey}' was not found in pack '${selection.packId}' version '${selection.version}'.`
    );
    this.name = "PromptTemplateNotFoundError";
  }
}

export class InvalidPromptPackError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Prompt pack is invalid: ${issues.join("; ")}`);
    this.name = "InvalidPromptPackError";
  }
}

export class InMemoryPromptAssetLoader implements PromptPackCatalog {
  readonly #packs = new Map<string, PromptPack>();

  constructor(packs: PromptPack[]) {
    for (const pack of packs) {
      const validation = validatePromptPack(pack);

      if (!validation.valid) {
        throw new InvalidPromptPackError(validation.issues);
      }

      this.#packs.set(createPackLookupKey(pack.packId, pack.version), structuredClone(pack));
    }
  }

  // ── PromptAssetLoader ─────────────────────────────────────────────

  async loadPromptPack(selection: Omit<PromptAssetSelection, "promptKey">): Promise<PromptPack> {
    const pack = this.#packs.get(createPackLookupKey(selection.packId, selection.version));

    if (!pack) {
      throw new PromptPackNotFoundError(selection.packId, selection.version);
    }

    return structuredClone(pack);
  }

  async loadPromptTemplate(selection: PromptAssetSelection): Promise<PromptTemplate> {
    const pack = await this.loadPromptPack(selection);
    const prompt = pack.prompts.find((item) => item.key === selection.promptKey);

    if (!prompt) {
      throw new PromptTemplateNotFoundError(selection);
    }

    return structuredClone(prompt);
  }

  // ── PromptPackCatalog ─────────────────────────────────────────────

  async listPromptPacks(): Promise<PromptPackSummary[]> {
    const summaries: PromptPackSummary[] = [];

    for (const pack of this.#packs.values()) {
      summaries.push(createPromptPackSummary(pack));
    }

    return summaries.sort((a, b) =>
      a.packId.localeCompare(b.packId) || a.version.localeCompare(b.version)
    );
  }

  /** Bulk-load all registered packs at once. */
  async loadAllPacks(): Promise<PromptPack[]> {
    return [...this.#packs.values()].map((p) => structuredClone(p));
  }
}
