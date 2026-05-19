import { SqliteDatabase } from "./sqlite-database.js";

export interface SqliteResonanceRepositoryOptions {
  database: SqliteDatabase;
}

export class SqliteResonanceRepository {
  readonly #db: SqliteDatabase;

  constructor(options: SqliteResonanceRepositoryOptions) {
    this.#db = options.database;
  }

  static ensureSchema(database: SqliteDatabase): void {
    database.run(`
      CREATE TABLE IF NOT EXISTS resonance_inputs (
        input_id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE IF NOT EXISTS resonance_comparisons (
        comparison_id TEXT PRIMARY KEY,
        input_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )
    `);
  }

  async saveInput(input: { inputId: string; [key: string]: unknown }): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.#db.getOne(
      "SELECT input_id FROM resonance_inputs WHERE input_id = :inputId",
      { ":inputId": input.inputId }
    );

    if (existing) {
      this.#db.run(
        "UPDATE resonance_inputs SET data_json = :data WHERE input_id = :inputId",
        { ":inputId": input.inputId, ":data": JSON.stringify(input) }
      );
    } else {
      this.#db.run(
        `INSERT INTO resonance_inputs (input_id, data_json, created_at)
         VALUES (:inputId, :data, :createdAt)`,
        { ":inputId": input.inputId, ":data": JSON.stringify(input), ":createdAt": now }
      );
    }
  }

  async getInputById(inputId: string): Promise<Record<string, unknown> | null> {
    const row = this.#db.getOne(
      "SELECT data_json FROM resonance_inputs WHERE input_id = :inputId",
      { ":inputId": inputId }
    );
    return row ? (JSON.parse(row.data_json as string) as Record<string, unknown>) : null;
  }

  async saveComparison(comparison: { comparisonId: string; inputId: string; [key: string]: unknown }): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.#db.getOne(
      "SELECT comparison_id FROM resonance_comparisons WHERE comparison_id = :comparisonId",
      { ":comparisonId": comparison.comparisonId }
    );

    if (existing) {
      this.#db.run(
        `UPDATE resonance_comparisons
         SET status = :status, data_json = :data
         WHERE comparison_id = :comparisonId`,
        {
          ":comparisonId": comparison.comparisonId,
          ":status": (comparison as Record<string, unknown>).status ?? "pending",
          ":data": JSON.stringify(comparison)
        }
      );
    } else {
      this.#db.run(
        `INSERT INTO resonance_comparisons (comparison_id, input_id, status, data_json, created_at)
         VALUES (:comparisonId, :inputId, :status, :data, :createdAt)`,
        {
          ":comparisonId": comparison.comparisonId,
          ":inputId": comparison.inputId,
          ":status": (comparison as Record<string, unknown>).status ?? "pending",
          ":data": JSON.stringify(comparison),
          ":createdAt": now
        }
      );
    }
  }

  async getComparisonById(comparisonId: string): Promise<Record<string, unknown> | null> {
    const row = this.#db.getOne(
      "SELECT data_json FROM resonance_comparisons WHERE comparison_id = :comparisonId",
      { ":comparisonId": comparisonId }
    );
    return row ? (JSON.parse(row.data_json as string) as Record<string, unknown>) : null;
  }
}
