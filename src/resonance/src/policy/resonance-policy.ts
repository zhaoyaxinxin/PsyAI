export const DEFAULT_RESONANCE_TOP_K = 5;
export const MAX_RESONANCE_THEME_COUNT = 8;
export const DEFAULT_MATCHES_PAGE_SIZE = 10;

export function resolveResonanceTopK(topK?: number): number {
  return topK ?? DEFAULT_RESONANCE_TOP_K;
}

export function normalizeTags(tags?: readonly string[]): string[] {
  if (!tags) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();

    if (trimmed.length === 0) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}
