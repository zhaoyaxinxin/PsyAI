# App-State Boundary

`src/app-state` is the standalone module-04 public boundary for bootstrap state, local settings, consent state, and active workflow pointers.

## Implemented Scope

- bootstrap state types, defaults, and validation
- default scene / workflow bootstrap fields
- lightweight host initialization state
- bootstrap storage snapshot for workspace root, data root, export directory, and shared data-directory keys
- local settings including theme, language, model selection, and data root path
- consent state (disclaimer accepted / risk prompt acknowledged) with timestamp tracking
- active counseling/simulation/resonance pointers
- recent state (last opened report + recent workflow history)
- `AppSettingsStore` persistence interface for infrastructure-core implementation

## Backend Split

- `src/app-state` exposes only contracts, defaults, and validation helpers
- `src/backend/modules/app_state` owns bootstrap state composition and backend wiring
- frontend must consume this boundary, not backend implementation files

## Rules

- keep state payloads lightweight and workflow-agnostic
- do not place provider, filesystem, or database logic in this package
- do not store workflow body data inside active pointers
- keep bootstrap storage fields aligned with settings defaults
- consent state is separate from settings — they have independent lifecycles

## Public File Layout

- `src/bootstrap.ts`: bootstrap state, host initialization, storage snapshot, default factories
- `src/settings.ts`: settings contract, feature flags, `AppSettingsStore` interface
- `src/pointers.ts`: lightweight workflow pointer contracts
- `src/consent.ts`: disclaimer and risk prompt acknowledgment state
- `src/recent.ts`: last opened report and recent workflow entries
- `src/index.ts`: public export surface only
