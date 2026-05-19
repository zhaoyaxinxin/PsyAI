import type { CounselingSession } from "../session/counseling-session.js";

export interface CounselingSessionListResult {
  items: CounselingSession[];
  totalItems: number;
}

export interface CounselingSessionListQuery {
  status?: "active" | "finished";
  page?: number;
  pageSize?: number;
}

export interface CounselingSessionRepository {
  save(session: CounselingSession): Promise<void>;
  getById(sessionId: string): Promise<CounselingSession | null>;

  /** List sessions ordered by updatedAt descending. */
  list(query: CounselingSessionListQuery): Promise<CounselingSessionListResult>;

  /** Return the most recently updated active session, or null. */
  getMostRecentActive(): Promise<CounselingSession | null>;
}
