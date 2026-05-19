# Backend Boundary

## Goal

Provide the backend assembly seam for PsyAI package composition — both fake-first and real SQLite-backed.

## Implemented Scope

- `src/modules/app_state/`: bootstrap state composition and settings store
- `src/composition/`: fake and real assembly wiring
  - `createFakeBackendAssembly()` — in-memory, fixture-driven for fast development
  - `createRealBackendAssembly()` — Sqlite-backed with real persistence for production testing
  - Runtime ports using `PlaceholderAgentRuntime` (no network calls)
- `tests/`: backend assembly and boundary verification

## Assembly Architecture

Both assemblies expose the same controller interface:

```ts
{
  controllers: {
    counseling: CounselingController;
    simulation: SimulationController;
    resonance: ResonanceController;
    reporting: ReportingController;
  };
}
```

- **Fake assembly**: InMemory repositories + fake runtimes → instant, fixture-driven
- **Real assembly**: Sqlite repositories + placeholder runtimes → persistent, testable locally

The real assembly accepts a `database?: SqliteDatabase` option. When provided, all core repositories use SQLite (`:memory:` supported for tests). Otherwise, InMemory fallback is used.

## Out Of Scope

- Real LLM provider wiring (uses `PlaceholderAgentRuntime`)
- Real vector retrieval (uses `PlaceholderVectorStore`)
- Frontend ownership
- Production deployment packaging

## Rules

- Backend consumes sibling packages through public interfaces, not direct internal imports.
- Backend must not depend on `@psyai/frontend`.
- Fake and real assemblies share the same controller interface.
- Assembly wiring is the only place where infrastructure adapters meet business modules.
