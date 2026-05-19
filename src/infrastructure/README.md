# Infrastructure Adapters

`src/infrastructure` is the module-11 minimal local adapter package.

## Implemented Scope

- **SQLite adapters** (sql.js WASM): counseling, simulation, resonance, reporting, and app-settings repositories
- **in-memory repositories** for the same five ports (test/dev compatible)
- **local file storage adapter** with `uploads`, `snapshots`, `exports`, `db`, and `indexes` scopes
- **data directory layout** utility for unified `uploads/snapshots/exports/db/indexes` structure
- **file-backed app settings store** for local bootstrap persistence (JSON file + SQLite variants)
- **HTTP LLM adapter** (`FetchLlmAdapter`) for OpenAI-compatible endpoints with timeout and error handling
- **TF-IDF token vector store** (`TokenVectorStore`) for local similarity search and rerank with file persistence
- **placeholder agent runtime** for runtime-core integration experiments (no real LLM calls)
- **placeholder vector retrieval adapter** for local resonance testing (keyword-based)
- standalone infrastructure tests covering M11-T001/T002/T003

## Deliberate Limits

- SQLite uses `sql.js` (pure WASM) — no native compilation required
- no real embedding or vector database backend in this phase (TF-IDF is lexical)
- no transaction or unit-of-work abstraction
- no refactor of existing upstream ports
- `FetchLlmAdapter` requires a live HTTP endpoint; no built-in mock for tests

## Boundary Rules

- adapters stay structural and local-first
- business modules remain unaware of filesystem layouts and placeholder heuristics
- this package may depend on current public module shapes, but it does not redefine them upstream

## Extension Points

- replace `LocalFileStorage` with provider-backed file implementations later
- replace `PlaceholderAgentRuntime` with a real `AgentRuntime` adapter later
- replace `PlaceholderVectorStore` with local embeddings + vector index later
- add SQLite-backed repositories later without changing current business port ownership
