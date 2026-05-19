export class CounselingSessionNotFoundError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Counseling session not found: ${sessionId}`);
    this.name = "CounselingSessionNotFoundError";
    this.sessionId = sessionId;
  }
}

export class CounselingSessionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounselingSessionStateError";
  }
}

export class CounselingRuntimeUnavailableError extends Error {
  constructor(message = "Counseling runtime is unavailable") {
    super(message);
    this.name = "CounselingRuntimeUnavailableError";
  }
}

export class CounselingRuntimeTimeoutError extends Error {
  constructor(message = "Counseling runtime timed out") {
    super(message);
    this.name = "CounselingRuntimeTimeoutError";
  }
}

export class CounselingRuntimeRetryExhaustedError extends Error {
  readonly operation: string;
  readonly attempts: number;

  constructor(operation: string, attempts: number, message: string) {
    super(`Counseling runtime retry exhausted during ${operation} after ${attempts} attempts: ${message}`);
    this.name = "CounselingRuntimeRetryExhaustedError";
    this.operation = operation;
    this.attempts = attempts;
  }
}
