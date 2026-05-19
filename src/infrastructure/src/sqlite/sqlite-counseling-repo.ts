import { SqliteDatabase } from "./sqlite-database.js";

export interface SqliteCounselingRepositoryOptions {
  database: SqliteDatabase;
}

export class SqliteCounselingRepository {
  readonly #db: SqliteDatabase;

  constructor(options: SqliteCounselingRepositoryOptions) {
    this.#db = options.database;
  }

  static ensureSchema(database: SqliteDatabase): void {
    database.run(`
      CREATE TABLE IF NOT EXISTS counseling_sessions (
        session_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'active',
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  async save(session: { sessionId: string; [key: string]: unknown }): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.#db.getOne(
      "SELECT session_id FROM counseling_sessions WHERE session_id = :sessionId",
      { ":sessionId": session.sessionId }
    );

    if (existing) {
      this.#db.run(
        `UPDATE counseling_sessions
         SET status = :status, data_json = :data, updated_at = :updatedAt
         WHERE session_id = :sessionId`,
        {
          ":sessionId": session.sessionId,
          ":status": (session as Record<string, unknown>).status ?? "active",
          ":data": JSON.stringify(session),
          ":updatedAt": now
        }
      );
    } else {
      this.#db.run(
        `INSERT INTO counseling_sessions (session_id, status, data_json, created_at, updated_at)
         VALUES (:sessionId, :status, :data, :createdAt, :updatedAt)`,
        {
          ":sessionId": session.sessionId,
          ":status": (session as Record<string, unknown>).status ?? "active",
          ":data": JSON.stringify(session),
          ":createdAt": now,
          ":updatedAt": now
        }
      );
    }
  }

  async getById(sessionId: string): Promise<Record<string, unknown> | null> {
    const row = this.#db.getOne(
      "SELECT data_json FROM counseling_sessions WHERE session_id = :sessionId",
      { ":sessionId": sessionId }
    );

    if (!row) {
      return null;
    }

    return JSON.parse(row.data_json as string) as Record<string, unknown>;
  }
}
