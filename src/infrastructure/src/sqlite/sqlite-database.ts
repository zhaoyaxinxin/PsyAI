import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic, type SqlValue } from "sql.js";

let _sql: SqlJsStatic | null = null;

async function getSql(): Promise<SqlJsStatic> {
  if (_sql === null) {
    _sql = await initSqlJs();
  }
  return _sql;
}

export interface SqliteDatabaseOptions {
  filePath: string;
}

export class SqliteDatabase {
  readonly #filePath: string;
  #db: SqlJsDatabase | null = null;
  #sql: SqlJsStatic | null = null;

  constructor(options: SqliteDatabaseOptions) {
    this.#filePath = options.filePath;
  }

  async open(): Promise<void> {
    this.#sql = await getSql();

    try {
      const data = await readFile(this.#filePath);
      this.#db = new this.#sql.Database(data as unknown as Uint8Array);
    } catch {
      this.#db = new this.#sql.Database();
    }
  }

  async close(): Promise<void> {
    if (this.#db) {
      await this.#persist();
      this.#db.close();
      this.#db = null;
    }
  }

  async persist(): Promise<void> {
    await this.#persist();
  }

  async #persist(): Promise<void> {
    if (!this.#db) {
      return;
    }

    const data = this.#db.export();
    await mkdir(dirname(this.#filePath), { recursive: true });
    await writeFile(this.#filePath, new Uint8Array(data));
  }

  run(sql: string, params?: Record<string, unknown>): void {
    this.#ensureOpen();
    this.#db!.run(sql, params as Record<string, SqlValue>);
  }

  exec(sql: string, params?: Record<string, unknown>): Array<Record<string, unknown>> {
    this.#ensureOpen();
    const stmt = this.#db!.prepare(sql);

    if (params) {
      stmt.bind(params as Record<string, SqlValue>);
    }

    const rows: Array<Record<string, unknown>> = [];

    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Record<string, unknown>);
    }

    stmt.free();
    return rows;
  }

  getOne(sql: string, params?: Record<string, unknown>): Record<string, unknown> | null {
    const rows = this.exec(sql, params);
    return rows[0] ?? null;
  }

  #ensureOpen(): void {
    if (!this.#db) {
      throw new Error("SqliteDatabase is not open. Call open() first.");
    }
  }
}
