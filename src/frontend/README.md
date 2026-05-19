# Frontend Boundary

## Goal

Build the PsyAI frontend shell as a scene-driven, no-UI TypeScript package.

## Implemented Scope

- `src/app/`: shell assembly (`createFrontendShell()`) wiring scene store, workflow stores, and report store
- `src/scenes/`: scene coordinator with five scenes (entry/menu/focus/route/report) and bootstrap-to-scene derivation
- `src/stores/`: isolated state containers — `counselingStore`, `simulationStore`, `resonanceStore`, `reportStore`, `sceneStore`
- `src/api/`: typed API clients (`CounselingApiClient`, `SimulationApiClient`, `ResonanceApiClient`) and replaceable transport boundary
- `src/widgets/`: pure view-model adapters — conversation (with escalation status), route, and match list
- `src/reports/`: generic report shell view model (`ReportShellViewModel`) plus list item view model (`ReportListItemViewModel`) for all three report types
- `src/fixtures/`: frontend-owned fixture bundle validated by `contracts` schemas, including list/finish/detail fixtures for all workflows

## Current State

- **M05-T001**: `createFrontendShell()` and scene/bootstrap consumption — complete
- **M05-T002**: workflow stores and API clients for all three chains — scaffolded
- **M05-T003**: report list view, report history accumulation, counseling escalation display — complete

## Rules

- Depend only on `contracts`, `shared`, and `app-state` public boundaries.
- Keep scene coordination separate from workflow orchestration.
- Keep store ownership split by workflow; do not merge business write paths.
- Adapters expose view models so widgets do not consume raw backend payloads.
- Fake transport must be replaceable by a real transport without changing store contracts.
- Report shell mapping may consume unified report skeletons but must not invent cross-module detail contracts.
- Fixture loading stays inside the frontend package boundary.
