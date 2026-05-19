# Shared Boundary

`src/shared` is the module-3 foundation boundary for stable cross-cutting definitions.

## Implemented Scope

- entity and workflow primitive schemas
- scene ids
- report types and report version schema
- shared risk levels
- shared status vocabularies for lifecycle and processing states
- shared data directory and storage scope identifiers
- shared export formats aligned with report export semantics
- shared host initialization error kinds
- shared time and version schemas
- `SHARED_VERSION` constant and `CompatTag` ("stable" | "experimental")
- `safeParse` / `safeParseAsync` — lightweight zod parse wrappers that never throw
- `isDefined<T>` — null/undefined type guard
- reusable shared types exported from the package root
- lightweight boundary validation via `npm run validate:shared`
- workflow kinds and report types are frozen as separate export surfaces even when V1 literals align 1:1

## Deferred Scope

- lifecycle enums beyond the current frozen shared status sets
- log levels
- host bootstrap state values
- fake data helpers

## Rules

- keep exports low-risk and reusable across modules
- keep helpers pure and side-effect free
- do not place workflow logic, storage access, or provider code here
