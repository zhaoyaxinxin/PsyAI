import type {
  SimulationActionOption,
  SimulationActorState,
  SimulationPreparationSnapshot,
  SimulationTurnOutcome
} from "../simulation/simulation-run.js";

export interface SimulationRuntimePrepareInput {
  scenarioId: string;
  scenarioTitle: string;
  occurredAt: string;
  sourceNotes?: string[];
  operatorNote?: string;
}

export interface SimulationRuntimePrepareOutput {
  summary?: string;
}

export interface SimulationRuntimeStartInput {
  scenarioId: string;
  scenarioTitle: string;
  currentNodeId: string;
  currentNodeTitle: string;
  currentNodeSummary: string;
  occurredAt: string;
  operatorNote?: string;
  actorStates: SimulationActorState[];
  preparation?: SimulationPreparationSnapshot;
  activeOptions?: SimulationActionOption[];
}

export interface SimulationRuntimeAdvanceInput {
  scenarioId: string;
  runId: string;
  previousNodeId: string;
  previousNodeTitle: string;
  nextNodeId: string;
  nextNodeTitle: string;
  selectedBranchId: string;
  selectedBranchLabel: string;
  occurredAt: string;
  rationale?: string;
  actorStates: SimulationActorState[];
  currentTurnIndex?: number;
  selectedAction?: SimulationActionOption;
  nextActionOptions?: SimulationActionOption[];
  environmentState?: string;
  preparation?: SimulationPreparationSnapshot;
}

export interface SimulationRuntimeOutput {
  actorStates?: SimulationActorState[];
  observation?: string;
  environmentState?: string;
  activeOptions?: SimulationActionOption[];
  turnOutcome?: SimulationTurnOutcome;
}

export interface SimulationRuntimePort {
  prepare?(input: SimulationRuntimePrepareInput): Promise<SimulationRuntimePrepareOutput>;
  start(input: SimulationRuntimeStartInput): Promise<SimulationRuntimeOutput>;
  advance(input: SimulationRuntimeAdvanceInput): Promise<SimulationRuntimeOutput>;
}
