# PsyAI Source Root

`src` is the single development root for PsyAI.

## Selected Architecture

- Chosen path: `D`
- Meaning: `B + C hybrid`
- Baseline: modular monolith for fast delivery
- Reserved seams: AI runtime, retrieval, reporting, and future scenario extension

## Design Goals

- Ship a Windows desktop application first.
- Keep all development artifacts under `src`.
- Separate scene UI, workflow orchestration, retrieval, and reporting early.
- Avoid premature microservices, but preserve future split points.

## Directory Overview

```text
src/
├── app-state/
├── frontend/
├── backend/
├── contracts/
├── shared/
└── tests/
```

## Rules

- Frontend only handles scene rendering, interaction state, and view composition.
- Backend owns LLM calls, multi-agent simulation, retrieval, and report generation.
- App-state is the standalone public boundary for bootstrap state, local settings, and active pointers.
- Shared contains cross-cutting schemas, constants, and helper definitions.
- Contracts define API payloads and report data shapes.
- New modules must be added inside the existing boundaries first; do not add top-level directories casually.
