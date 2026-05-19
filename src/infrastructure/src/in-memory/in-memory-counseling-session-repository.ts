import type { CounselingSessionLike } from "../compatibility.js";
import { cloneValue } from "../common/clone.js";

export class InMemoryCounselingSessionRepository<
  TSession extends CounselingSessionLike = CounselingSessionLike
> {
  readonly #sessions = new Map<string, TSession>();

  async save(session: TSession): Promise<void> {
    this.#sessions.set(session.sessionId, cloneValue(session));
  }

  async getById(sessionId: string): Promise<TSession | null> {
    const session = this.#sessions.get(sessionId);
    return session ? cloneValue(session) : null;
  }
}
