# Counseling Package

`@psyai/counseling` owns the counseling session aggregate, use cases, controller mapping, and a minimal workflow adapter.

## Scope

- `COU-01`: session aggregate
- `COU-02`: start/reply/finish/get/get-report-status use cases
- `COU-03`: controller validation and response mapping
- `COU-04`: workflow adapter over a minimal runtime port
- `COU-06`: owner-side counseling report input handoff, report reference seam, and session persistence shape

## Out Of Scope

- `COU-05`: repository contract tests
- counseling report builder implementation inside `@psyai/reporting`
- runtime-core / infrastructure-core implementation changes for counseling persistence or reporting

## Boundaries

- Consumes public contracts from `@psyai/contracts`
- Consumes shared ids and datetime validation from `@psyai/shared`
- Depends on a minimal repository port, a minimal runtime port, and an optional report port
- Generates counseling-owned `report input` but does not implement reporting-package internals
- Does not depend on concrete infrastructure implementations
