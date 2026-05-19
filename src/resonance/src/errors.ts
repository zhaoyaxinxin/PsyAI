export class ResonanceInputNotFoundError extends Error {
  readonly inputId: string;

  constructor(inputId: string) {
    super(`Resonance input not found: ${inputId}`);
    this.name = "ResonanceInputNotFoundError";
    this.inputId = inputId;
  }
}

export class ResonanceComparisonNotFoundError extends Error {
  readonly comparisonId: string;

  constructor(comparisonId: string) {
    super(`Resonance comparison not found: ${comparisonId}`);
    this.name = "ResonanceComparisonNotFoundError";
    this.comparisonId = comparisonId;
  }
}

export class ResonanceRuntimeUnavailableError extends Error {
  constructor(message = "Resonance runtime is unavailable") {
    super(message);
    this.name = "ResonanceRuntimeUnavailableError";
  }
}

export class ResonanceRetrievalTimeoutError extends Error {
  constructor(message = "Resonance retrieval timed out") {
    super(message);
    this.name = "ResonanceRetrievalTimeoutError";
  }
}

export class ResonanceRetrievalRetryExhaustedError extends Error {
  readonly operation: string;
  readonly attempts: number;

  constructor(operation: string, attempts: number, message: string) {
    super(`Resonance retrieval retry exhausted during ${operation} after ${attempts} attempts: ${message}`);
    this.name = "ResonanceRetrievalRetryExhaustedError";
    this.operation = operation;
    this.attempts = attempts;
  }
}
