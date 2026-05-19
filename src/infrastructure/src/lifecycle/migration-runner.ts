/**
 * Migration Runner — manages schema/data version migrations.
 *
 * Self-contained state machine. No business rules.
 */

export type MigrationStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "failed"
  | "rolled_back";

export interface MigrationStep {
  /** Unique migration identifier (e.g. "v1-add-report-registry"). */
  id: string;
  /** Human-readable description. */
  description: string;
  /** Target version after this migration. */
  targetVersion: string;
  /** Whether this migration is reversible. */
  reversible: boolean;
  /** Run the migration. Returns the new version on success. */
  run(): Promise<string>;
  /** Rollback the migration (only called if reversible). */
  rollback?(): Promise<string>;
}

export interface MigrationPlan {
  /** Ordered list of pending migration steps. */
  steps: MigrationStep[];
  /** Current version before migration. */
  fromVersion: string;
  /** Target version after all steps complete. */
  toVersion: string;
}

export interface MigrationResult {
  status: MigrationStatus;
  fromVersion: string;
  toVersion: string;
  completedSteps: string[];
  failedStepId: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface MigrationState {
  currentVersion: string;
  appliedMigrations: string[];
  lastMigrationAt: string | null;
  lastMigrationStatus: MigrationStatus | null;
}

export interface MigrationRunner {
  /** Plan pending migrations from the current version. */
  plan(fromVersion: string): Promise<MigrationPlan>;

  /** Execute all pending migration steps in order. */
  run(plan: MigrationPlan): Promise<MigrationResult>;

  /** Rollback the most recent migration. */
  rollback(stepId: string): Promise<MigrationResult>;

  /** Read the current migration state from persistent storage. */
  getState(): Promise<MigrationState>;

  /** Save the current migration state. */
  saveState(state: MigrationState): Promise<void>;
}

/** Compute the next migration status based on completion. */
export function resolveMigrationStatus(
  success: boolean,
  rolledBack: boolean
): MigrationStatus {
  if (rolledBack) return "rolled_back";
  return success ? "completed" : "failed";
}
