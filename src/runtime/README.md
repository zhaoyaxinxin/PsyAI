# Runtime Core

`src/runtime` is the module-10 runtime boundary for reusable execution contracts, prompt assets, structured analysis normalization, and fake providers.

## Implemented Scope

- unified agent runtime interfaces for single-agent, multi-agent, and environment-aware execution
- workflow runtime contracts for counseling, simulation, and resonance
- prompt pack boundary with load, validate, and render helpers
- generic analysis normalizer contract plus fake normalizer
- **provider seam** with `RuntimeFailure` / `RetryPolicy` / `TimeoutContext` / `RiskAnalysisOutput` / `ProviderExtension` types
- fake agent runtime, fake workflow providers for all three business chains, and fake provider seam implementations
- isolated package tests (M10-T001, M10-T002, M10-T003)

## Explicit Boundary

- no provider SDK integration
- no counseling, simulation, or resonance business-rule ownership
- no persistence or filesystem storage adapters
- no changes to package-local runtime/retrieval ports in existing business modules
- no forced retrofitting of existing fake workflows with the new provider seam

## Notes

- This package stays standalone in this pass. Existing modules may adopt these contracts later during assembly work.
- `typecheck/build/test` are expected to run against `src/runtime`'s own installed toolchain and lockfile state.
