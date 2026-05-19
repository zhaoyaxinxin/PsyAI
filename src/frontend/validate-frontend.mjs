import assert from "node:assert/strict";

import {
  createDefaultAppBootstrapState
} from "@psyai/app-state";
import {
  createFrontendShell,
  loadFrontendFixtureBundle
} from "./dist/index.js";

const fixtures = loadFrontendFixtureBundle();

const shell = createFrontendShell({
  bootstrapState: createDefaultAppBootstrapState({
    lastActiveWorkflow: "counseling",
    activePointers: {
      counselingSession: {
        workflow: "counseling",
        id: fixtures.api.counseling.getResponse.data.sessionId
      }
    }
  })
});

assert.equal(shell.sceneStore.getState().coordinator.current.scene, "focus");
assert.equal(shell.sceneStore.getState().coordinator.current.workflow, "counseling");

await shell.counselingStore.start(fixtures.api.counseling.startRequest, "2026-05-11T18:00:00+08:00");
assert.equal(shell.counselingStore.getState().conversationView?.messages.length, 1);

await shell.simulationStore.loadScenario(fixtures.api.simulation.scenarioRequest.scenarioId, "2026-05-11T18:01:00+08:00");
await shell.simulationStore.startRun(fixtures.api.simulation.runRequest, "2026-05-11T18:02:00+08:00");
assert.equal(shell.simulationStore.getState().routeView?.scenarioTitle, fixtures.api.simulation.scenarioResponse.data.title);

await shell.resonanceStore.submitInput(fixtures.api.resonance.inputRequest, "2026-05-11T18:03:00+08:00");
await shell.resonanceStore.compare(fixtures.api.resonance.compareRequest, "2026-05-11T18:04:00+08:00");
await shell.resonanceStore.loadMatches(fixtures.api.resonance.matchesRequest.comparisonId, "2026-05-11T18:05:00+08:00");
assert.equal(shell.resonanceStore.getState().matchListView?.items[0]?.rank, 1);

console.log("frontend validation passed");
