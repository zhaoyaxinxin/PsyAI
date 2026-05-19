import { SqliteDatabase } from "./sqlite-database.js";

export interface SqliteSimulationRepositoryOptions {
  database: SqliteDatabase;
}

export class SqliteSimulationRepository {
  readonly #db: SqliteDatabase;

  constructor(options: SqliteSimulationRepositoryOptions) {
    this.#db = options.database;
  }

  static ensureSchema(database: SqliteDatabase): void {
    database.run(`
      CREATE TABLE IF NOT EXISTS simulation_scenarios (
        scenario_id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      )
    `);
    database.run(`
      CREATE TABLE IF NOT EXISTS simulation_runs (
        run_id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  async saveScenario(scenario: { scenarioId: string; [key: string]: unknown }): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.#db.getOne(
      "SELECT scenario_id FROM simulation_scenarios WHERE scenario_id = :scenarioId",
      { ":scenarioId": scenario.scenarioId }
    );

    if (existing) {
      this.#db.run(
        "UPDATE simulation_scenarios SET data_json = :data WHERE scenario_id = :scenarioId",
        { ":scenarioId": scenario.scenarioId, ":data": JSON.stringify(scenario) }
      );
    } else {
      this.#db.run(
        `INSERT INTO simulation_scenarios (scenario_id, data_json, created_at)
         VALUES (:scenarioId, :data, :createdAt)`,
        { ":scenarioId": scenario.scenarioId, ":data": JSON.stringify(scenario), ":createdAt": now }
      );
    }
  }

  async getScenarioById(scenarioId: string): Promise<Record<string, unknown> | null> {
    const row = this.#db.getOne(
      "SELECT data_json FROM simulation_scenarios WHERE scenario_id = :scenarioId",
      { ":scenarioId": scenarioId }
    );
    return row ? (JSON.parse(row.data_json as string) as Record<string, unknown>) : null;
  }

  async saveRun(run: { runId: string; scenarioId: string; [key: string]: unknown }): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.#db.getOne(
      "SELECT run_id FROM simulation_runs WHERE run_id = :runId",
      { ":runId": run.runId }
    );

    if (existing) {
      this.#db.run(
        `UPDATE simulation_runs
         SET status = :status, data_json = :data, updated_at = :updatedAt
         WHERE run_id = :runId`,
        {
          ":runId": run.runId,
          ":status": (run as Record<string, unknown>).status ?? "running",
          ":data": JSON.stringify(run),
          ":updatedAt": now
        }
      );
    } else {
      this.#db.run(
        `INSERT INTO simulation_runs (run_id, scenario_id, status, data_json, created_at, updated_at)
         VALUES (:runId, :scenarioId, :status, :data, :createdAt, :updatedAt)`,
        {
          ":runId": run.runId,
          ":scenarioId": run.scenarioId,
          ":status": (run as Record<string, unknown>).status ?? "running",
          ":data": JSON.stringify(run),
          ":createdAt": now,
          ":updatedAt": now
        }
      );
    }
  }

  async getRunById(runId: string): Promise<Record<string, unknown> | null> {
    const row = this.#db.getOne(
      "SELECT data_json FROM simulation_runs WHERE run_id = :runId",
      { ":runId": runId }
    );
    return row ? (JSON.parse(row.data_json as string) as Record<string, unknown>) : null;
  }
}
