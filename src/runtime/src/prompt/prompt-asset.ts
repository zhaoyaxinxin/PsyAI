import type { RuntimeWorkflowKind } from "../common.js";

// ── Core types ──────────────────────────────────────────────────────

export interface PromptAssetSelection {
  packId: string;
  version: string;
  promptKey: string;
}

export interface PromptTemplate {
  key: string;
  template: string;
  checksum: string;
  tags: string[];
  variables: string[];
}

export interface PromptPack {
  packId: string;
  version: string;
  workflow: RuntimeWorkflowKind;
  prompts: PromptTemplate[];
  metadata?: Record<string, string>;
}

export interface PromptPackValidationResult {
  valid: boolean;
  issues: string[];
}

// ── Version constraint ──────────────────────────────────────────────

export type PromptVersionConstraint =
  | { kind: "exact"; version: string }
  | { kind: "compatible"; version: string }
  | { kind: "latest" };

// ── Pack summary (lightweight listing without full templates) ──────

export interface PromptPackSummary {
  packId: string;
  version: string;
  workflow: RuntimeWorkflowKind;
  promptCount: number;
  promptKeys: string[];
  metadata?: Record<string, string>;
}

// ── Fallback strategy ───────────────────────────────────────────────

export interface PromptFallbackStrategy {
  /** Priority-ordered version resolution steps. Default: ["patch", "minor", "major"]. */
  order: ("exact" | "patch" | "minor" | "major" | "latest")[];
  /** Maximum versions to attempt before giving up. */
  maxAttempts: number;
}

export const DEFAULT_FALLBACK_STRATEGY: PromptFallbackStrategy = {
  order: ["exact", "patch", "minor", "latest"],
  maxAttempts: 5
};

// ── Loader interfaces ───────────────────────────────────────────────

export interface PromptAssetLoader {
  loadPromptPack(selection: Omit<PromptAssetSelection, "promptKey">): Promise<PromptPack>;
  loadPromptTemplate(selection: PromptAssetSelection): Promise<PromptTemplate>;
}

/**
 * Extended loader that can enumerate available packs.
 * InMemoryPromptAssetLoader implements this; simple loaders only need PromptAssetLoader.
 */
export interface PromptPackCatalog extends PromptAssetLoader {
  listPromptPacks(): Promise<PromptPackSummary[]>;
}

const PROMPT_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function createPromptTemplate(
  key: string,
  template: string,
  options: { tags?: string[] } = {}
): PromptTemplate {
  return {
    key,
    template,
    checksum: computePromptChecksum(template),
    tags: options.tags ? [...options.tags] : [],
    variables: extractPromptVariables(template)
  };
}

export function extractPromptVariables(template: string): string[] {
  const variables = new Set<string>();

  for (const match of template.matchAll(PROMPT_VARIABLE_PATTERN)) {
    const variable = match[1];

    if (variable) {
      variables.add(variable);
    }
  }

  return [...variables].sort();
}

export function validatePromptPack(pack: PromptPack): PromptPackValidationResult {
  const issues: string[] = [];

  if (!pack.packId.trim()) {
    issues.push("packId must not be empty");
  }

  if (!pack.version.trim()) {
    issues.push("version must not be empty");
  }

  if (pack.prompts.length === 0) {
    issues.push("prompt pack must include at least one prompt");
  }

  const keys = new Set<string>();

  for (const prompt of pack.prompts) {
    if (!prompt.key.trim()) {
      issues.push("prompt key must not be empty");
    }

    if (!prompt.template.trim()) {
      issues.push(`prompt '${prompt.key}' must not be empty`);
    }

    if (keys.has(prompt.key)) {
      issues.push(`prompt key '${prompt.key}' must be unique within a pack`);
    }

    keys.add(prompt.key);

    if (prompt.checksum !== computePromptChecksum(prompt.template)) {
      issues.push(`prompt '${prompt.key}' checksum does not match template contents`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function renderPromptTemplate(
  prompt: PromptTemplate,
  variables: Record<string, string | number>
): string {
  return prompt.template.replace(PROMPT_VARIABLE_PATTERN, (_match, variable: string) => {
    const value = variables[variable];

    if (value === undefined) {
      throw new Error(`Missing prompt variable '${variable}' for prompt '${prompt.key}'`);
    }

    return String(value);
  });
}

export function computePromptChecksum(input: string): string {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

// ── Version helpers ─────────────────────────────────────────────────

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const SIMPLE_VERSION_PATTERN = /^v(\d+)$/;

function parseSemver(version: string): [number, number, number] | null {
  const match = version.match(SEMVER_PATTERN);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function parseSimpleVersion(version: string): number | null {
  const match = version.match(SIMPLE_VERSION_PATTERN);
  if (!match) return null;
  return Number(match[1]);
}

/**
 * Compare two version strings.
 * Returns negative when a < b, zero when equal, positive when a > b.
 * Supports semver (1.2.3) and simple (v1, v2) formats.
 */
export function compareVersions(a: string, b: string): number {
  const semverA = parseSemver(a);
  const semverB = parseSemver(b);

  if (semverA && semverB) {
    for (let i = 0; i < 3; i += 1) {
      const diff = (semverA[i] ?? 0) - (semverB[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  const simpleA = parseSimpleVersion(a);
  const simpleB = parseSimpleVersion(b);

  if (simpleA !== null && simpleB !== null) {
    return simpleA - simpleB;
  }

  return a.localeCompare(b);
}

/**
 * Check whether a candidate version satisfies a constraint.
 */
export function checkVersionCompatibility(
  candidate: string,
  constraint: PromptVersionConstraint
): boolean {
  switch (constraint.kind) {
    case "latest":
      return true;
    case "exact":
      return candidate === constraint.version;
    case "compatible": {
      const semverC = parseSemver(candidate);
      const semverR = parseSemver(constraint.version);
      if (semverC && semverR) {
        return semverC[0] === semverR[0] && semverC[1] === semverR[1] && (semverC[2] ?? 0) >= (semverR[2] ?? 0);
      }
      const simpleC = parseSimpleVersion(candidate);
      const simpleR = parseSimpleVersion(constraint.version);
      if (simpleC !== null && simpleR !== null) {
        return simpleC === simpleR;
      }
      return candidate === constraint.version;
    }
  }
}

/**
 * Create a lightweight summary from a full pack (templates omitted).
 */
export function createPromptPackSummary(pack: PromptPack): PromptPackSummary {
  return {
    packId: pack.packId,
    version: pack.version,
    workflow: pack.workflow,
    promptCount: pack.prompts.length,
    promptKeys: pack.prompts.map((p) => p.key),
    ...(pack.metadata ? { metadata: { ...pack.metadata } } : {})
  };
}
