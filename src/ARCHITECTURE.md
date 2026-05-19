# PsyAI Architecture

## Overview

PsyAI is a local-first Windows desktop application for three workflows:

- `Counseling`: AI-guided psychological conversation and analysis
- `Simulation`: multi-agent scenario exploration and node progression
- `Resonance`: input analysis, case retrieval, and comparison report generation

The system uses a `B + C hybrid` architecture:

- `B`: frontend/backend separation and modular monolith delivery
- `C`: explicit seams for runtime, retrieval, reporting, and future extension

The first version stays single-process in architecture ownership and single-product in deployment intent. It does not split into microservices.

## Goals

- Keep `src` as the only development root.
- Allow frontend, workflow, runtime, reporting, and infrastructure to evolve independently.
- Make the three business workflows reusable, testable, and separately integrable.
- Support local-first storage, local report history, and future model/provider replacement.

## Non-Goals

- No microservice split in V1.
- No frontend-to-model direct calls.
- No plugin platform in V1.
- No tight coupling between one workflow and another workflow's internal model.

## System Context

```text
Windows Shell
  -> Frontend Shell
  -> Backend Application
     -> Workflow Modules
     -> Runtime Core
     -> Reporting Package
     -> Infrastructure Core
     -> Local Storage
```

## Source Layout

```text
src/
├── app-state/
├── frontend/
├── backend/
├── contracts/
├── shared/
└── tests/
```

## Module Map

The project is assembled from 12 modules. Ownership is strict: each module owns its public contract and does not depend on another module's unfinished internals.

| Module | Owns | Depends On |
|---|---|---|
| `contracts-api` | request/response schemas, error envelopes | `shared-foundation` |
| `contracts-reports` | report view models and export metadata | `shared-foundation` |
| `shared-foundation` | ids, enums, scene ids, validation helpers | none |
| `app-state` | bootstrap state, settings, current pointers | `shared-foundation`, infra interfaces |
| `frontend-shell` | scene shell, report shell, client stores, API clients, transitions | `contracts-api`, `contracts-reports`, `app-state` |
| `counseling-package` | counseling domain, commands, controller, workflow adapter | contracts, shared, runtime interfaces, repo interfaces, reporting input |
| `simulation-package` | scenario/run model, branch rules, controller, orchestration adapter | contracts, shared, runtime interfaces, repo interfaces, reporting input |
| `resonance-package` | input/match model, compare flow, upload mapping, retrieval adapter | contracts, shared, runtime interfaces, repo interfaces, reporting input |
| `reporting-package` | report registry, builders, history, export boundary | `contracts-reports`, shared, infra interfaces |
| `runtime-core` | agent runtime interfaces, workflow interfaces, prompt boundary, analysis normalization | `shared-foundation` |
| `infrastructure-core` | sqlite, file storage, llm adapters, vector adapters | `shared-foundation`, infra contracts |
| `assembly-rules` | dependency direction, stubs, integration sequence | all public module interfaces |

## Dependency Rules

The module pack defines four non-negotiable rules:

1. Modules connect through frozen contracts, not direct internal imports.
2. Application code depends on interfaces for runtime, repository, and reporting input.
3. Infrastructure implements interfaces only; it does not define business rules.
4. Reporting consumes structured report input; it does not call business modules back.

## Frontend Design

Frontend is scene-driven, not page-driven.

### Scene Model

- `entry`: star-sky landing and primary selection
- `menu`: wander-mode branching
- `focus`: counseling room and resonance input
- `route`: simulation route map and node progression
- `report`: constellation-style report exploration

### Frontend Responsibilities

- render scenes and transitions
- own client-side stores
- consume API and report contracts
- display route graphs, conversations, matches, and report views

### Frontend Exclusions

- no workflow orchestration
- no prompt ownership
- no model provider integration

## Backend Design

Backend is a modular monolith with clear ownership boundaries.

### Layers

- `api`: validation, request mapping, response mapping
- `application`: use-case orchestration
- `modules`: business domains
- `runtime`: reusable AI execution abstractions
- `infrastructure`: adapters for storage, model, and retrieval

### Business Modules

- `counseling`: session lifecycle, turn handling, staged analysis
- `simulation`: scenario definition, run lifecycle, node progression, agent state
- `resonance`: input ingestion, match ranking, comparison workflow
- `reporting`: report build, query, export, history
- `app-state`: bootstrap and current-session context

## Runtime Boundary

`runtime-core` exists to keep AI execution reusable and replaceable.

It owns:

- agent execution interfaces
- workflow runtime interfaces
- prompt asset loading boundary
- analysis normalizer interfaces

It does not own:

- counseling, simulation, or resonance business rules
- provider SDK details
- persistence

## Infrastructure Boundary

`infrastructure-core` provides replaceable adapters for:

- relational persistence
- file storage
- LLM access
- vector retrieval

Business modules only see interfaces. SQL, filesystem paths, provider retries, and vector index details stay inside infrastructure.

## Reporting Boundary

`reporting-package` is a standalone product capability, not a helper.

It owns:

- report registry
- counseling/simulation/resonance report builders
- report history
- export boundary

Each business workflow outputs `report input`, and only reporting turns that input into a stable report view model.

## Main Flows

### Counseling

`frontend-shell -> contracts-api -> counseling-package -> runtime-core -> reporting-package -> contracts-reports -> frontend-shell`

### Simulation

`frontend-shell -> contracts-api -> simulation-package -> runtime-core -> reporting-package -> contracts-reports -> frontend-shell`

### Resonance

`frontend-shell -> contracts-api -> resonance-package -> infrastructure retrieval -> reporting-package -> contracts-reports -> frontend-shell`

## Storage Model

V1 is local-first:

- relational metadata: `SQLite`
- uploaded files and exports: local filesystem
- retrieval index: local vector store
- session and report snapshots: structured records

## Assembly Order

Integration follows the `assembly-rules` pack:

1. freeze `contracts + shared`
2. wire `frontend-shell`
3. integrate `counseling`, `simulation`, and `resonance` independently
4. attach `reporting`
5. replace fake runtime and fake repositories with real infrastructure adapters

## Testing Strategy

The architecture is designed for isolated module development.

- each module must work against fake providers or stub repositories
- frontend can develop against fixtures without the real backend
- business modules can run against fake runtime and fake repos
- infrastructure is tested separately from UI and workflow orchestration

## Key Constraints

- No top-level business development outside `src`.
- No direct imports across another module's internal implementation.
- No report rendering logic inside business modules.
- No business logic inside contracts, frontend widgets, or infrastructure adapters.

## Future Extensions

The current design deliberately reserves seams for:

- alternate model providers
- richer retrieval backends
- scenario pack expansion
- cloud sync or remote storage later

These are extension points, not active scope for V1.
