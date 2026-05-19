import type { PromptAssetLoader, PromptFallbackStrategy, PromptPack, PromptVersionConstraint } from "./prompt-asset.js";
import { compareVersions } from "./prompt-asset.js";

export class PromptPackUnavailableError extends Error {
  constructor(
    public readonly packId: string,
    public readonly attemptedVersions: string[]
  ) {
    super(
      `Prompt pack '${packId}' could not be resolved. Attempted versions: ${attemptedVersions.join(", ")}`
    );
    this.name = "PromptPackUnavailableError";
  }
}

function extractMajorMinor(version: string): string | null {
  const match = version.match(/^(\d+)\.(\d+)\.\d+$/);
  if (!match) return null;
  return `${match[1]}.${match[2]}`;
}

function generateFallbackVersions(
  targetVersion: string,
  availableVersions: string[],
  strategy: PromptFallbackStrategy
): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  for (const step of strategy.order) {
    if (results.length >= strategy.maxAttempts) break;

    switch (step) {
      case "exact": {
        if (!seen.has(targetVersion)) {
          seen.add(targetVersion);
          results.push(targetVersion);
        }
        break;
      }
      case "patch": {
        const base = extractMajorMinor(targetVersion);
        if (base) {
          const candidates = availableVersions
            .filter(
              (v) => v.startsWith(base + ".") && v !== targetVersion && !seen.has(v)
            )
            .sort((a, b) => compareVersions(b, a));
          for (const c of candidates.slice(0, strategy.maxAttempts - results.length)) {
            seen.add(c);
            results.push(c);
          }
        }
        break;
      }
      case "minor": {
        const majorMatch = targetVersion.match(/^(\d+)\.\d+\.\d+$/);
        if (majorMatch) {
          const major = majorMatch[1] ?? "";
          const candidates = availableVersions
            .filter(
              (v) =>
                v.startsWith(major + ".") &&
                !v.startsWith((extractMajorMinor(targetVersion) ?? "") + ".") &&
                v !== targetVersion &&
                !seen.has(v)
            )
            .sort((a, b) => compareVersions(b, a));
          for (const c of candidates.slice(0, strategy.maxAttempts - results.length)) {
            seen.add(c);
            results.push(c);
          }
        }
        break;
      }
      case "major": {
        const candidates = availableVersions
          .filter((v) => v !== targetVersion && !seen.has(v))
          .sort((a, b) => compareVersions(b, a));
        for (const c of candidates.slice(0, strategy.maxAttempts - results.length)) {
          seen.add(c);
          results.push(c);
        }
        break;
      }
      case "latest": {
        const candidates = availableVersions
          .filter((v) => !seen.has(v))
          .sort((a, b) => compareVersions(b, a));
        const best = candidates[0];
        if (best) {
          seen.add(best);
          results.push(best);
        }
        break;
      }
    }
  }

  return results.slice(0, strategy.maxAttempts);
}

/**
 * Resolve a prompt pack from a loader with fallback across versions.
 *
 * Tries the constraint's primary version first. On failure, generates
 * fallback candidates from the loader's available packs (if it supports
 * listing) or from the provided availableVersions list, ordered by the
 * fallback strategy.
 */
export async function resolvePromptPackWithFallback(
  loader: PromptAssetLoader,
  constraint: PromptVersionConstraint,
  packId: string,
  strategy: PromptFallbackStrategy,
  options?: { availableVersions?: string[] }
): Promise<PromptPack> {
  const attempted: string[] = [];

  const primaryVersion =
    constraint.kind === "exact" || constraint.kind === "compatible"
      ? constraint.version
      : undefined;

  let availableVersions: string[] = options?.availableVersions ?? [];

  if (availableVersions.length === 0 && "listPromptPacks" in loader) {
    const catalog = loader as { listPromptPacks(): Promise<{ version: string }[]> };
    const summaries = await catalog.listPromptPacks();
    availableVersions = summaries
      .filter((s) => s.version)
      .map((s) => s.version);
  }

  const candidates = primaryVersion
    ? generateFallbackVersions(primaryVersion, availableVersions, strategy)
    : availableVersions.sort((a, b) => compareVersions(b, a)).slice(0, strategy.maxAttempts);

  if (candidates.length === 0 && primaryVersion) {
    candidates.push(primaryVersion);
  }

  for (const version of candidates) {
    attempted.push(version);

    try {
      return await loader.loadPromptPack({ packId, version });
    } catch (error) {
      if (error instanceof Error && error.name === "PromptPackNotFoundError") {
        continue;
      }
      throw error;
    }
  }

  throw new PromptPackUnavailableError(packId, attempted);
}

/**
 * Build a fallback chain: given a target version and available versions,
 * return the ordered list of versions to attempt per the strategy.
 */
export function buildFallbackChain(
  targetVersion: string,
  availableVersions: string[],
  strategy: PromptFallbackStrategy
): string[] {
  return generateFallbackVersions(targetVersion, availableVersions, strategy);
}
