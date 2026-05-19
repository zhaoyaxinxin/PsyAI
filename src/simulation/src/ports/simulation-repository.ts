import type { SimulationRun, SimulationScenario } from "../simulation/simulation-run.js";

export interface SimulationRunListResult {
  items: SimulationRun[];
  totalItems: number;
}

export interface SimulationRunListQuery {
  status?: "pending" | "prepared" | "running" | "completed" | "paused";
  scenarioId?: string;
  page?: number;
  pageSize?: number;
}

export interface SimulationRepository {
  saveRun(run: SimulationRun): Promise<void>;
  getRunById(runId: string): Promise<SimulationRun | null>;
  getScenarioById(scenarioId: string): Promise<SimulationScenario | null>;

  /** List runs ordered by updatedAt descending, with optional filters. */
  listRuns(query: SimulationRunListQuery): Promise<SimulationRunListResult>;

  /** Return runs for a specific scenario. */
  listRunsByScenario(scenarioId: string): Promise<SimulationRun[]>;

  /** Return the most recently updated run that is still mutable, or null. */
  getMostRecentActive(): Promise<SimulationRun | null>;

  /** Save a scenario (for fixtures and seeding). */
  saveScenario(scenario: SimulationScenario): Promise<void>;
}
