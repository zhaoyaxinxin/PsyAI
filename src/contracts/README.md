# Contracts Boundary

Contracts keep the frontend, backend, and report layers aligned.

## Implemented Scope

### `api/` — Request/Response API Contracts
- **Shared**: success/error envelopes, host bootstrap summary, entity IDs, page info, report references
- **Counseling**: start/reply/finish/get/report/list/detail request/response schemas, risk level, risk escalation result
- **Simulation**: scenario/run/node/advance/report/list/finish request/response schemas
- **Resonance**: input/compare/matches/report/list/detail/finish request/response schemas, import result structures
- **Escalation**: risk escalation status and counseling escalation result (standalone module)
- **Import**: parse warnings, import success/failure results, discriminated import result union
- **Errors**: unified error codes including validation, workflow-specific, host initialization, and storage error codes

### `reports/` — Structured Report Schemas
- Unified report base, source, summary, detail, history, and export meta for all three workflows
- Per-workflow report content (sections/excerpts/recommendations, key nodes/actor states, matched cases/themes)

## Local Package

- `package.json`: local package definition for `@psyai/contracts`
- `tsconfig.json`: isolated compiler settings
- `api/`: Zod-backed API contracts and JSON fixtures
- `reports/`: stable report view models, export metadata, and render fixtures
- `shared.ts`: package-internal shared primitives
- `validate-fixtures.mjs`: JSON fixture validation entrypoint

## Rules

- Contracts change before implementation spreads.
- Report structures must be versioned once consumed by UI.
- Do not define duplicate payload shapes separately in frontend and backend.
- No risk judgment logic in contracts — only data shapes.
- No business logic, UI, database, or provider types in contracts.

## Validation

Run `npm run validate:fixtures` to parse published JSON fixtures against current API and report schemas.
