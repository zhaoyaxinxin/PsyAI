import { SqliteDatabase } from "./sqlite-database.js";

export interface SqliteReportRegistryOptions {
  database: SqliteDatabase;
}

export interface ReportListParams {
  workflow?: string;
  page: number;
  pageSize: number;
}

export class SqliteReportRegistry {
  readonly #db: SqliteDatabase;

  constructor(options: SqliteReportRegistryOptions) {
    this.#db = options.database;
  }

  static ensureSchema(database: SqliteDatabase): void {
    database.run(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id TEXT PRIMARY KEY,
        workflow TEXT NOT NULL,
        source_entity_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  async save(record: {
    reportId: string;
    workflow: string;
    sourceEntityId: string;
    status?: string;
    [key: string]: unknown;
  }): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.#db.getOne(
      "SELECT report_id FROM reports WHERE report_id = :reportId",
      { ":reportId": record.reportId }
    );

    if (existing) {
      this.#db.run(
        `UPDATE reports
         SET workflow = :workflow, status = :status, data_json = :data, updated_at = :updatedAt
         WHERE report_id = :reportId`,
        {
          ":reportId": record.reportId,
          ":workflow": record.workflow,
          ":status": record.status ?? "ready",
          ":data": JSON.stringify(record),
          ":updatedAt": now
        }
      );
    } else {
      this.#db.run(
        `INSERT INTO reports (report_id, workflow, source_entity_id, status, data_json, created_at, updated_at)
         VALUES (:reportId, :workflow, :sourceEntityId, :status, :data, :createdAt, :updatedAt)`,
        {
          ":reportId": record.reportId,
          ":workflow": record.workflow,
          ":sourceEntityId": record.sourceEntityId,
          ":status": record.status ?? "ready",
          ":data": JSON.stringify(record),
          ":createdAt": now,
          ":updatedAt": now
        }
      );
    }
  }

  async getById(reportId: string): Promise<Record<string, unknown> | null> {
    const row = this.#db.getOne(
      "SELECT data_json FROM reports WHERE report_id = :reportId",
      { ":reportId": reportId }
    );
    return row ? (JSON.parse(row.data_json as string) as Record<string, unknown>) : null;
  }

  async list(params: ReportListParams): Promise<{
    items: Array<Record<string, unknown>>;
    totalItems: number;
  }> {
    const conditions: string[] = [];
    const bindEntries: Array<[string, string | number]> = [];

    if (params.workflow) {
      conditions.push("workflow = :workflow");
      bindEntries.push([":workflow", params.workflow]);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const bindObj = Object.fromEntries(bindEntries);
    const countRow = this.#db.getOne(
      `SELECT COUNT(*) AS total FROM reports ${whereClause}`,
      bindObj
    );
    const totalItems = (countRow?.total as number) ?? 0;
    const offset = (params.page - 1) * params.pageSize;

    const rows = this.#db.exec(
      `SELECT data_json FROM reports ${whereClause}
       ORDER BY updated_at DESC
       LIMIT :limit OFFSET :offset`,
      { ...bindObj, ":limit": params.pageSize, ":offset": offset }
    );

    return {
      items: rows.map((row) => JSON.parse(row.data_json as string) as Record<string, unknown>),
      totalItems
    };
  }
}
