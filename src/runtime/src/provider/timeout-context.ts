export interface TimeoutContext {
  deadlineMs: number;
  startedAt: string;
  operation: string;
}

export function createTimeoutContext(
  deadlineMs: number,
  operation: string,
  startedAt?: string
): TimeoutContext {
  return {
    deadlineMs,
    startedAt: startedAt ?? new Date().toISOString(),
    operation
  };
}

export function isTimedOut(context: TimeoutContext, now?: string): boolean {
  const started = new Date(context.startedAt).getTime();
  const current = now ? new Date(now).getTime() : Date.now();
  return current - started > context.deadlineMs;
}

export function remainingMs(context: TimeoutContext, now?: string): number {
  const started = new Date(context.startedAt).getTime();
  const current = now ? new Date(now).getTime() : Date.now();
  return Math.max(0, context.deadlineMs - (current - started));
}
