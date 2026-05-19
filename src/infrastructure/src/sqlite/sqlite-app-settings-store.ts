import { SqliteDatabase } from "./sqlite-database.js";

export interface SqliteAppSettingsStoreOptions {
  database: SqliteDatabase;
  defaults: Record<string, unknown>;
}

export class SqliteAppSettingsStore {
  readonly #db: SqliteDatabase;
  readonly #defaults: Record<string, unknown>;

  constructor(options: SqliteAppSettingsStoreOptions) {
    this.#db = options.database;
    this.#defaults = { ...options.defaults };
  }

  static ensureSchema(database: SqliteDatabase): void {
    database.run(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      )
    `);
  }

  async load(): Promise<Record<string, unknown>> {
    const row = this.#db.getOne(
      "SELECT value_json FROM app_settings WHERE key = :key",
      { ":key": "main" }
    );

    if (!row) {
      await this.save(this.#defaults);
      return { ...this.#defaults };
    }

    return JSON.parse(row.value_json as string) as Record<string, unknown>;
  }

  async save(settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    const existing = this.#db.getOne(
      "SELECT key FROM app_settings WHERE key = :key",
      { ":key": "main" }
    );

    if (existing) {
      this.#db.run(
        "UPDATE app_settings SET value_json = :value, updated_at = :updatedAt WHERE key = :key",
        { ":key": "main", ":value": JSON.stringify(settings), ":updatedAt": now }
      );
    } else {
      this.#db.run(
        "INSERT INTO app_settings (key, value_json, updated_at) VALUES (:key, :value, :updatedAt)",
        { ":key": "main", ":value": JSON.stringify(settings), ":updatedAt": now }
      );
    }

    return { ...settings };
  }

  async patch(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const current = await this.load();
    return this.save({ ...current, ...patch });
  }

  async reset(): Promise<Record<string, unknown>> {
    return this.save({ ...this.#defaults });
  }
}
