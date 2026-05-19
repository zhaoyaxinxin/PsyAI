export class SimulationRunNotFoundError extends Error {
  readonly runId: string;

  constructor(runId: string) {
    super(`Simulation run not found: ${runId}`);
    this.name = "SimulationRunNotFoundError";
    this.runId = runId;
  }
}

export class SimulationScenarioNotFoundError extends Error {
  readonly scenarioId: string;

  constructor(scenarioId: string) {
    super(`Simulation scenario not found: ${scenarioId}`);
    this.name = "SimulationScenarioNotFoundError";
    this.scenarioId = scenarioId;
  }
}

export class SimulationRunStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationRunStateError";
  }
}

export class SimulationRuntimeUnavailableError extends Error {
  constructor(message = "Simulation runtime is unavailable") {
    super(message);
    this.name = "SimulationRuntimeUnavailableError";
  }
}

export class SimulationRuntimeTimeoutError extends Error {
  constructor(message = "Simulation runtime timed out") {
    super(message);
    this.name = "SimulationRuntimeTimeoutError";
  }
}

export class SimulationRuntimeRetryExhaustedError extends Error {
  readonly operation: string;
  readonly attempts: number;

  constructor(operation: string, attempts: number, message: string) {
    super(`Simulation runtime retry exhausted during ${operation} after ${attempts} attempts: ${message}`);
    this.name = "SimulationRuntimeRetryExhaustedError";
    this.operation = operation;
    this.attempts = attempts;
  }
}
