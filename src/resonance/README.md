# Resonance Package

`@psyai/resonance` implements the isolated resonance workflow boundary defined by module 8.

It owns:

- resonance input and comparison domain models
- application use cases for input, compare, matches, and report status
- controller validation and error mapping
- retrieval orchestration adapter
- host-bootstrap-aligned input response mapping
- structured resonance report input mapping
- optional report-reference handoff through `ResonanceReportPort`
- in-memory testing fakes for repository and retrieval

It does not own:

- backend module registration
- report rendering or export
- real file ingestion pipelines
- infrastructure-specific retrieval or storage adapters

## Implemented Scope

- text input acceptance with preview text projection
- file input acceptance with upload reference projection
- compare flow over retrieval search and rerank seams
- match result pagination and report status projection
- structured resonance report input creation for reporting consumption
- minimal `reportReference` handoff when a report port is attached

## Deferred Scope

- backend assembly wiring
- real file parsing and ingestion pipelines
- infrastructure retrieval and persistence implementations
- report rendering, export, or registry behavior
