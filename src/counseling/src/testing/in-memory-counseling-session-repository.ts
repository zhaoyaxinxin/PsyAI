import type {
  CounselingSessionListQuery,
  CounselingSessionListResult,
  CounselingSessionRepository
} from "../ports/counseling-session-repository.js";
import type { CounselingSession } from "../session/counseling-session.js";

export class InMemoryCounselingSessionRepository
  implements CounselingSessionRepository
{
  readonly #sessions = new Map<string, CounselingSession>();

  async save(session: CounselingSession): Promise<void> {
    this.#sessions.set(session.sessionId, structuredClone(session));
  }

  async getById(sessionId: string): Promise<CounselingSession | null> {
    const session = this.#sessions.get(sessionId);
    return session ? structuredClone(session) : null;
  }

  async list(query: CounselingSessionListQuery): Promise<CounselingSessionListResult> {
    let filtered = [...this.#sessions.values()];

    if (query.status) {
      filtered = filtered.filter((s) => s.status === query.status);
    }

    filtered.sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt)
    );

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const startIndex = (page - 1) * pageSize;
    const items = filtered
      .slice(startIndex, startIndex + pageSize)
      .map((s) => structuredClone(s));

    return { items, totalItems: filtered.length };
  }

  async getMostRecentActive(): Promise<CounselingSession | null> {
    const active = [...this.#sessions.values()]
      .filter((s) => s.status === "active")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const mostRecent = active[0];
    return mostRecent ? structuredClone(mostRecent) : null;
  }

  snapshot(sessionId: string): CounselingSession | null {
    const session = this.#sessions.get(sessionId);
    return session ? structuredClone(session) : null;
  }
}
