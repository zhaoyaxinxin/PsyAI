import type { ResonanceInput } from "../input/resonance-input.js";

export interface ResonanceRetrievalSearchCandidate {
  caseId: string;
  title: string;
  summary: string;
  excerpt?: string;
  themes: string[];
  keywords: string[];
  candidateSetId?: string;
}

export interface ResonanceRetrievalSearchInput {
  queryText: string;
  tags: string[];
  topK: number;
  candidateSetId?: string;
}

export interface ResonanceRetrievalRerankInput {
  input: ResonanceInput;
  candidates: ResonanceRetrievalSearchCandidate[];
  topK: number;
}

export interface ResonanceRetrievalRerankResult {
  caseId: string;
  title: string;
  score: number;
  rationale: string;
  sharedThemes: string[];
  inputExcerpt: string;
  caseExcerpt: string;
  interpretation: string;
  excerpt?: string;
}

export interface ResonanceRetrievalPort {
  search(input: ResonanceRetrievalSearchInput): Promise<ResonanceRetrievalSearchCandidate[]>;
  rerank(input: ResonanceRetrievalRerankInput): Promise<ResonanceRetrievalRerankResult[]>;
}
