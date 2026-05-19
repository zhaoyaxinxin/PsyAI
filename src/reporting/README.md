# Reporting Package

`@psyai/reporting` implements the standalone module-09 reporting boundary for V1.

It owns:

- report registry persistence interface plus an in-memory test registry
- counseling, simulation, and resonance report builders
- report query/status/export use cases
- adapters that implement `CounselingReportPort`, `SimulationReportPort`, and `ResonanceReportPort`
- package-local controller validation for query and export actions

It does not own:

- business workflow orchestration
- backend route registration
- filesystem or PDF infrastructure export adapters

## Full Three-Workflow Support

This package now supports all three PsyAI workflows:

- `counseling`: builds `CounselingReport` from `CounselingReportInput`, including stage snapshots, key excerpts, recommendations, risk levels, and history
- `simulation`: builds `SimulationReport` from `SimulationReportInput`, including timeline, key nodes, actor state changes, and route summary
- `resonance`: builds `ResonanceReport` from `ResonanceReportInput`, including matched cases, fragment comparisons, and theme interpretations

Each workflow has its own adapter (`counselingPort` / `simulationPort` / `resonancePort`) exposed through `createReportingModule()`.

## Implemented Export Boundary

The export boundary is separate from report generation:

- report creation stores a stable report view model in the registry
- export requests serialize a stored report into `json`, `markdown`, or `html`
- each workflow has its own markdown rendering logic that captures workflow-specific sections
- `pdf` is intentionally rejected as unsupported until a real renderer exists
