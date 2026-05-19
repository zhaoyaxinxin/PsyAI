import { SimulationRunStateError } from "../errors.js";
import type {
  SimulationBranchDefinition,
  SimulationRun,
  SimulationScenario,
  SimulationScenarioNode
} from "../simulation/simulation-run.js";

function hasAllFlags(activeFlags: string[], requiredFlags: readonly string[]): boolean {
  return requiredFlags.every((flag) => activeFlags.includes(flag));
}

function hasBlockedFlag(activeFlags: string[], blockedFlags: readonly string[]): boolean {
  return blockedFlags.some((flag) => activeFlags.includes(flag));
}

export function getScenarioNode(
  scenario: SimulationScenario,
  nodeId: string
): SimulationScenarioNode {
  const node = scenario.nodes.find((candidate) => candidate.nodeId === nodeId);

  if (!node) {
    throw new SimulationRunStateError(
      `Scenario ${scenario.scenarioId} does not define node ${nodeId}`
    );
  }

  return node;
}

export function getAvailableBranches(
  scenario: SimulationScenario,
  run: SimulationRun,
  nodeId = run.currentNodeId
): SimulationBranchDefinition[] {
  const node = getScenarioNode(scenario, nodeId);

  return node.branches.filter((branch) => {
    const requiredFlags = branch.requiredFlags ?? [];
    const blockedFlags = branch.blockedFlags ?? [];

    return (
      hasAllFlags(run.routeFlags, requiredFlags) &&
      !hasBlockedFlag(run.routeFlags, blockedFlags)
    );
  });
}

export function getSelectedBranch(
  scenario: SimulationScenario,
  run: SimulationRun,
  branchId: string
): SimulationBranchDefinition {
  const branch = getAvailableBranches(scenario, run).find(
    (candidate) => candidate.branchId === branchId
  );

  if (!branch) {
    throw new SimulationRunStateError(
      `Branch ${branchId} is not reachable from node ${run.currentNodeId}`
    );
  }

  return branch;
}
