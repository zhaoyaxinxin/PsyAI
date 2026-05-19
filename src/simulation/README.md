# simulation

`@psyai/simulation` is the standalone module-07 package for simulation domain state,
branch progression, application commands, controller mapping, orchestration wrapping,
and a minimal report handoff boundary.

## Implemented Scope

- `scenario/run/node/actor-state` domain modeling
- pure branch rule engine for node reachability and progression
- application use cases for scenario lookup, run creation, node lookup, advance, and report status
- controller validation and response mapping against `@psyai/contracts`
- orchestration adapter over the simulation runtime port
- structured simulation report input mapping plus `reportReference` handoff through `SimulationReportPort`

## Deferred Scope

- backend assembly wiring
- migration into `src/backend/src/modules/`
- real reporting-package integration and export flow

## SIM-06 Boundary

`SIM-06` is implemented as package-local report input mapping, not as reporting-package
integration.

When a run reaches a completed state, application code now builds a structured
`SimulationReportInput` from route timeline, key nodes, and actor-state deltas, then
passes that input into `SimulationReportPort`. The port may return a `reportReference`,
which is still attached to the run response when available.

This means the package now:

- builds structured report input for future reporting consumption
- keeps report mapping as a pure simulation concern inside `src/simulation`
- preserves the existing optional `reportReference` handoff for completed runs

This package still does not:

- own report generation
- call into backend assembly
- depend on reporting implementation details
- expand reporting concerns into controller, workflow, or branch-rule logic
