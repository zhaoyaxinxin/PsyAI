function findLastSentenceBoundary(value: string): number {
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const char = value[index];
    if (char && /[。！？!?]/u.test(char)) {
      return index + 1;
    }
  }

  return -1;
}

function normalizeSimulationNarrativeText(content: string): string {
  return content
    .replace(/^\[[^\]]+\]\s*/u, "")
    .replace(/^(?:COORDINATOR|SUMMARY|OBSERVATION|ENVIRONMENT|NARRATIVE)\s*[:：]\s*/gimu, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildSimulationNarrativeSnippet(
  content: string,
  maxLength: number,
  fallback: string
): string {
  const cleaned = normalizeSimulationNarrativeText(content);
  const fallbackText = fallback.trim();

  if (!cleaned) {
    return fallbackText;
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const clipped = cleaned.slice(0, maxLength);
  const sentenceBoundary = findLastSentenceBoundary(clipped);
  if (sentenceBoundary >= Math.floor(maxLength * 0.45)) {
    return cleaned.slice(0, sentenceBoundary).trim();
  }

  const softBoundary = Math.max(
    clipped.lastIndexOf("\n"),
    clipped.lastIndexOf(" "),
    clipped.lastIndexOf("，"),
    clipped.lastIndexOf("。"),
    clipped.lastIndexOf(",")
  );
  if (softBoundary >= Math.floor(maxLength * 0.6)) {
    return `${cleaned.slice(0, softBoundary).trim()}...`;
  }

  return `${clipped.trim()}...`;
}
