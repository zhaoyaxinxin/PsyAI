import type { SimulationRunLike, SimulationScenarioLike } from "../compatibility.js";
import { cloneValue } from "../common/clone.js";

export interface InMemorySimulationRepositoryOptions<
  TScenario extends SimulationScenarioLike = SimulationScenarioLike
> {
  scenarios?: readonly TScenario[];
}

export class InMemorySimulationRepository<
  TRun extends SimulationRunLike = SimulationRunLike,
  TScenario extends SimulationScenarioLike = SimulationScenarioLike
> {
  readonly #runs = new Map<string, TRun>();
  readonly #scenarios = new Map<string, TScenario>();

  constructor(options: InMemorySimulationRepositoryOptions<TScenario> = {}) {
    for (const scenario of options.scenarios ?? []) {
      this.#scenarios.set(scenario.scenarioId, cloneValue(scenario));
    }
  }

  seedScenario(scenario: TScenario): void {
    this.#scenarios.set(scenario.scenarioId, cloneValue(scenario));
  }

  async saveRun(run: TRun): Promise<void> {
    this.#runs.set(run.runId, cloneValue(run));
  }

  async getRunById(runId: string): Promise<TRun | null> {
    const run = this.#runs.get(runId);
    return run ? cloneValue(run) : null;
  }

  async getScenarioById(scenarioId: string): Promise<TScenario | null> {
    const scenario = this.#scenarios.get(scenarioId);
    return scenario ? cloneValue(scenario) : null;
  }
}
