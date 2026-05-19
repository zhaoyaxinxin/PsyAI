import type {
  SimulationRepository,
  SimulationRunListQuery,
  SimulationRunListResult
} from "../ports/simulation-repository.js";
import type { SimulationRun, SimulationScenario } from "../simulation/simulation-run.js";

export class InMemorySimulationRepository implements SimulationRepository {
  readonly #runs = new Map<string, SimulationRun>();
  readonly #scenarios = new Map<string, SimulationScenario>();

  constructor(scenarios: readonly SimulationScenario[] = []) {
    for (const scenario of scenarios) {
      this.#scenarios.set(scenario.scenarioId, structuredClone(scenario));
    }
  }

  async saveRun(run: SimulationRun): Promise<void> {
    this.#runs.set(run.runId, structuredClone(run));
  }

  async getRunById(runId: string): Promise<SimulationRun | null> {
    const run = this.#runs.get(runId);
    return run ? structuredClone(run) : null;
  }

  async getScenarioById(scenarioId: string): Promise<SimulationScenario | null> {
    const scenario = this.#scenarios.get(scenarioId);
    return scenario ? structuredClone(scenario) : null;
  }

  async listRuns(query: SimulationRunListQuery): Promise<SimulationRunListResult> {
    let filtered = [...this.#runs.values()];

    if (query.status) {
      filtered = filtered.filter((r) => r.status === query.status);
    }

    if (query.scenarioId) {
      filtered = filtered.filter((r) => r.scenarioId === query.scenarioId);
    }

    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const startIndex = (page - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize).map((r) => structuredClone(r));

    return { items, totalItems: filtered.length };
  }

  async listRunsByScenario(scenarioId: string): Promise<SimulationRun[]> {
    return [...this.#runs.values()]
      .filter((r) => r.scenarioId === scenarioId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((r) => structuredClone(r));
  }

  async getMostRecentActive(): Promise<SimulationRun | null> {
    const active = [...this.#runs.values()]
      .filter((r) => r.status === "running" || r.status === "paused")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const mostRecent = active[0];
    return mostRecent ? structuredClone(mostRecent) : null;
  }

  async saveScenario(scenario: SimulationScenario): Promise<void> {
    this.#scenarios.set(scenario.scenarioId, structuredClone(scenario));
  }
}
