import { z } from "zod";

// ── Build target ────────────────────────────────────────────────────

export const buildTargetValues = ["desktop", "web"] as const;
export const buildTargetSchema = z.enum(buildTargetValues);
export type BuildTarget = z.infer<typeof buildTargetSchema>;

// ── Environment mode ────────────────────────────────────────────────

export const environmentModeValues = ["dev", "staging", "production"] as const;
export const environmentModeSchema = z.enum(environmentModeValues);
export type EnvironmentMode = z.infer<typeof environmentModeSchema>;

// ── Feature flags ───────────────────────────────────────────────────

export const featureFlagSchema = z.object({
  enableLocalIndexing: z.boolean(),
  enableExperimentalScenes: z.boolean(),
  enableProviderSwitching: z.boolean().optional(),
  enableDataExport: z.boolean().optional(),
  enableAutoCleanup: z.boolean().optional(),
  enableDiagnosticLogging: z.boolean().optional()
});

export type FeatureFlags = z.infer<typeof featureFlagSchema>;

export const defaultFeatureFlags: FeatureFlags = {
  enableLocalIndexing: true,
  enableExperimentalScenes: false,
  enableProviderSwitching: false,
  enableDataExport: true,
  enableAutoCleanup: false,
  enableDiagnosticLogging: false
};

// ── Product info ────────────────────────────────────────────────────

export const PRODUCT_NAME = "PsyAI" as const;
export const BUILD_TARGET: BuildTarget = "desktop";
