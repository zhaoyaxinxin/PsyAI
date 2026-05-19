export const SHARED_VERSION = "0.1.0" as const;

// ── Compatibility tags ──────────────────────────────────────────────

export const compatTagValues = ["stable", "experimental"] as const;
export type CompatTag = (typeof compatTagValues)[number];

// ── Semver helpers ──────────────────────────────────────────────────

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(version: string): [number, number, number] | null {
  const match = version.match(SEMVER_PATTERN);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Compare two semver strings.
 * Returns negative when a < b, zero when equal, positive when a > b.
 */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a.localeCompare(b);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Check whether a candidate version satisfies a semver-compatible constraint
 * (same major.minor, patch >= constraint patch).
 */
export function isSemverCompatible(candidate: string, constraint: string): boolean {
  const pc = parseSemver(candidate);
  const pr = parseSemver(constraint);
  if (!pc || !pr) return candidate === constraint;
  return pc[0] === pr[0] && pc[1] === pr[1] && (pc[2] ?? 0) >= (pr[2] ?? 0);
}

// ── Migration status ────────────────────────────────────────────────

export const migrationStatusValues = [
  "not_started",
  "in_progress",
  "completed",
  "failed",
  "rolled_back"
] as const;
export type MigrationStatus = (typeof migrationStatusValues)[number];

// ── Release channel ─────────────────────────────────────────────────

export const releaseChannelValues = ["dev", "beta", "stable"] as const;
export type ReleaseChannel = (typeof releaseChannelValues)[number];
