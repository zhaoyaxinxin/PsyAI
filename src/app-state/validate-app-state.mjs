import assert from "node:assert/strict";

import {
  assertAppBootstrapState,
  assertAppConsentState,
  assertAppProviderConfig,
  assertAppRecentState,
  assertAppStartupState,
  assertAppWorkspaceRecoveryState,
  assertReportPointer,
  createDefaultAppBootstrapState,
  createDefaultAppBootstrapStorageState,
  createDefaultAppConsentState,
  createDefaultAppProviderConfig,
  createDefaultAppSettings,
  createDefaultAppStartupState,
  createDefaultAppWorkspaceRecoveryState,
  CURRENT_CONSENT_VERSION,
  defaultAppConsentState,
  emptyAppRecentState,
  MAX_RECENT_WORKFLOWS
} from "./dist/index.js";

// ---------------------------------------------------------------------------
// default bootstrap state
// ---------------------------------------------------------------------------

const defaultBootstrapState = createDefaultAppBootstrapState();
assert.equal(defaultBootstrapState.defaultScene, "entry");
assert.equal(defaultBootstrapState.defaultWorkflow, "counseling");
assert.equal(defaultBootstrapState.storage.workspaceRoot, defaultBootstrapState.settings.workspaceRoot);
assert.equal(defaultBootstrapState.storage.exportDirectory, defaultBootstrapState.settings.exportDirectory);

const bootstrapState = createDefaultAppBootstrapState({
  defaultScene: "focus",
  defaultWorkflow: "resonance",
  hostInitialization: {
    ready: true
  },
  storage: {
    workspaceRoot: "workspace",
    exportDirectory: "custom-exports",
    dataDirectories: {
      exports: "custom-exports",
      snapshots: "snapshots-cache"
    }
  },
  consent: {
    disclaimerAccepted: true,
    disclaimerAcceptedAt: "2026-05-13T16:00:00+08:00",
    riskPromptAcknowledged: true,
    riskPromptAcknowledgedAt: "2026-05-13T16:00:00+08:00"
  },
  activePointers: {
    counselingSession: {
      workflow: "counseling",
      id: "session-001",
      label: "First Session",
      updatedAt: "2026-05-11T17:00:00+08:00"
    }
  },
  lastActiveWorkflow: "counseling"
});

assertAppBootstrapState(bootstrapState);
assert.equal(bootstrapState.defaultScene, "focus");
assert.equal(bootstrapState.defaultWorkflow, "resonance");
assert.equal(bootstrapState.hostInitialization.ready, true);
assert.equal(bootstrapState.settings.workspaceRoot, "workspace");
assert.equal(bootstrapState.storage.exportDirectory, "custom-exports");
assert.equal(bootstrapState.storage.dataDirectories.snapshots, "snapshots-cache");
assert.equal(bootstrapState.activePointers.counselingSession?.workflow, "counseling");
assert.equal(bootstrapState.consent.disclaimerAccepted, true);
assert.equal(bootstrapState.consent.riskPromptAcknowledged, true);

const bootstrapStorage = createDefaultAppBootstrapStorageState(
  createDefaultAppSettings({
    workspaceRoot: "workspace-a",
    dataRoot: "data-a",
    exportDirectory: "exports-a"
  })
);
assert.equal(bootstrapStorage.workspaceRoot, "workspace-a");
assert.equal(bootstrapStorage.dataDirectories.exports, "exports-a");

// ---------------------------------------------------------------------------
// settings validation
// ---------------------------------------------------------------------------

assert.throws(
  () =>
    createDefaultAppSettings({
      workspaceRoot: ""
    }),
  /workspaceRoot/
);

assert.throws(
  () =>
    createDefaultAppSettings({
      dataRoot: ""
    }),
  /dataRoot/
);

assert.throws(
  () =>
    createDefaultAppBootstrapState({
      settings: {
        exportDirectory: "exports-a"
      },
      storage: {
        exportDirectory: "exports-b"
      }
    }),
  /exportDirectory/
);

assert.throws(
  () =>
    createDefaultAppBootstrapState({
      hostInitialization: {
        ready: true,
        error: "settings_load_failed"
      }
    }),
  /hostInitialization\.error/
);

// ---------------------------------------------------------------------------
// consent state
// ---------------------------------------------------------------------------

// default consent — all false/null
const defaultConsent = createDefaultAppConsentState();
assert.equal(defaultConsent.disclaimerAccepted, false);
assert.equal(defaultConsent.disclaimerAcceptedAt, null);
assert.equal(defaultConsent.riskPromptAcknowledged, false);
assert.equal(defaultConsent.riskPromptAcknowledgedAt, null);
assertAppConsentState(defaultConsent);

// disclaimer accepted
const consentDisclaimer = createDefaultAppConsentState({
  disclaimerAccepted: true,
  disclaimerAcceptedAt: "2026-05-13T16:00:00+08:00"
});
assert.equal(consentDisclaimer.disclaimerAccepted, true);
assert.equal(consentDisclaimer.disclaimerAcceptedAt, "2026-05-13T16:00:00+08:00");
assert.equal(consentDisclaimer.riskPromptAcknowledged, false);

// risk prompt acknowledged
const consentRisk = createDefaultAppConsentState({
  riskPromptAcknowledged: true,
  riskPromptAcknowledgedAt: "2026-05-13T16:00:00+08:00"
});
assert.equal(consentRisk.riskPromptAcknowledged, true);
assert.equal(consentRisk.riskPromptAcknowledgedAt, "2026-05-13T16:00:00+08:00");
assert.equal(consentRisk.disclaimerAccepted, false);

// both accepted
const consentBoth = createDefaultAppConsentState({
  disclaimerAccepted: true,
  disclaimerAcceptedAt: "2026-05-13T16:00:00+08:00",
  riskPromptAcknowledged: true,
  riskPromptAcknowledgedAt: "2026-05-13T16:00:00+08:00"
});
assert.equal(consentBoth.disclaimerAccepted, true);
assert.equal(consentBoth.riskPromptAcknowledged, true);

// disclaimerAccepted=true but missing timestamp
assert.throws(
  () =>
    createDefaultAppConsentState({
      disclaimerAccepted: true
    }),
  /disclaimerAcceptedAt must be set/
);

// disclaimerAccepted=false but timestamp present
assert.throws(
  () =>
    createDefaultAppConsentState({
      disclaimerAccepted: false,
      disclaimerAcceptedAt: "2026-05-13T16:00:00+08:00"
    }),
  /disclaimerAcceptedAt must be null/
);

// riskPromptAcknowledged=true but missing timestamp
assert.throws(
  () =>
    createDefaultAppConsentState({
      riskPromptAcknowledged: true
    }),
  /riskPromptAcknowledgedAt must be set/
);

// riskPromptAcknowledged=false but timestamp present
assert.throws(
  () =>
    createDefaultAppConsentState({
      riskPromptAcknowledged: false,
      riskPromptAcknowledgedAt: "2026-05-13T16:00:00+08:00"
    }),
  /riskPromptAcknowledgedAt must be null/
);

// invalid ISO datetime in disclaimerAcceptedAt
assert.throws(
  () =>
    createDefaultAppConsentState({
      disclaimerAccepted: true,
      disclaimerAcceptedAt: "not-a-datetime"
    }),
  /disclaimerAcceptedAt/
);

// invalid ISO datetime in riskPromptAcknowledgedAt
assert.throws(
  () =>
    createDefaultAppConsentState({
      riskPromptAcknowledged: true,
      riskPromptAcknowledgedAt: "not-a-datetime"
    }),
  /riskPromptAcknowledgedAt/
);

// ---------------------------------------------------------------------------
// recent state
// ---------------------------------------------------------------------------

const defaultBootstrap2 = createDefaultAppBootstrapState();
assertAppRecentState(defaultBootstrap2.recent);
assert.equal(defaultBootstrap2.recent.lastOpenedReport, null);
assert.equal(defaultBootstrap2.recent.recentWorkflows.length, 0);

// valid report pointer
assertReportPointer({
  reportId: "report-001",
  workflow: "counseling",
  label: "First Session Report",
  openedAt: "2026-05-13T18:00:00+08:00"
});

// bootstrap with recent populated
const bootstrapWithRecent = createDefaultAppBootstrapState({
  recent: {
    lastOpenedReport: {
      reportId: "report-001",
      workflow: "counseling",
      label: "First Session Report",
      openedAt: "2026-05-13T18:00:00+08:00"
    },
    recentWorkflows: [
      {
        workflow: "counseling",
        lastAccessedAt: "2026-05-13T17:00:00+08:00",
        lastEntityId: "session-001",
        lastEntityLabel: "First Session"
      },
      {
        workflow: "resonance",
        lastAccessedAt: "2026-05-13T16:00:00+08:00",
        lastEntityId: "res-input-001"
      }
    ]
  }
});

assertAppBootstrapState(bootstrapWithRecent);
assert.equal(bootstrapWithRecent.recent.lastOpenedReport?.reportId, "report-001");
assert.equal(bootstrapWithRecent.recent.recentWorkflows.length, 2);

// too many recent workflows
assert.throws(
  () =>
    createDefaultAppBootstrapState({
      recent: {
        recentWorkflows: Array.from({ length: MAX_RECENT_WORKFLOWS + 1 }, (_, i) => ({
          workflow: "counseling",
          lastAccessedAt: "2026-05-13T10:00:00+08:00"
        }))
      }
    }),
  /exceed/
);

// invalid report pointer — bad workflow
assert.throws(
  () =>
    assertReportPointer({
      reportId: "report-001",
      workflow: "invalid",
      openedAt: "2026-05-13T18:00:00+08:00"
    }),
  /workflow/
);

// invalid report pointer — empty reportId
assert.throws(
  () =>
    assertReportPointer({
      reportId: "",
      workflow: "counseling",
      openedAt: "2026-05-13T18:00:00+08:00"
    }),
  /entity id/
);

// ══════════════════════════════════════════════════════════════════════
// M04-GP0-001: Provider config
// ══════════════════════════════════════════════════════════════════════

const defaultProvider = createDefaultAppProviderConfig();
assert.equal(defaultProvider.provider, "deepseek");
assert.equal(defaultProvider.modelId, "deepseek-v4-flash");
assert.equal(defaultProvider.endpoint, "https://api.deepseek.com");
assert.equal(defaultProvider.timeoutMs, 30000);
assert.equal(defaultProvider.maxRetries, 3);
assert.ok(Array.isArray(defaultProvider.capabilities));
assertAppProviderConfig(defaultProvider);

const customProvider = createDefaultAppProviderConfig({
  provider: "openai",
  modelId: "gpt-4",
  endpoint: "https://api.example.com/v1",
  timeoutMs: 60000,
  maxRetries: 5,
  capabilities: ["chat", "embedding", "analysis"]
});
assert.equal(customProvider.provider, "openai");
assert.equal(customProvider.endpoint, "https://api.example.com/v1");
assert.equal(customProvider.capabilities.length, 3);

// provider config must be consistent with settings.modelSelection
const bootstrapWithProvider = createDefaultAppBootstrapState({
  settings: {
    modelSelection: {
      provider: "custom-prov",
      modelId: "custom-model"
    }
  },
  providerConfig: {
    provider: "custom-prov",
    modelId: "custom-model"
  }
});
assert.equal(bootstrapWithProvider.providerConfig.provider, "custom-prov");
assert.equal(bootstrapWithProvider.settings.modelSelection.provider, "custom-prov");

// provider config mismatch with modelSelection
assert.throws(
  () =>
    createDefaultAppBootstrapState({
      settings: {
        modelSelection: { provider: "prov-a", modelId: "model-a" }
      },
      providerConfig: { provider: "prov-a", modelId: "model-b" }
    }),
  /modelId/
);

// invalid provider config — bad timeout
assert.throws(
  () =>
    createDefaultAppProviderConfig({ timeoutMs: 100 }),
  /timeoutMs/
);

// ══════════════════════════════════════════════════════════════════════
// M04-GP0-002: Startup state
// ══════════════════════════════════════════════════════════════════════

const defaultStartup = createDefaultAppStartupState();
assert.equal(defaultStartup.firstRun, true);
assert.equal(defaultStartup.lastStartupCompletedAt, null);
assert.equal(defaultStartup.consentCheckCompleted, false);
assert.equal(defaultStartup.consentVersion, null);
assertAppStartupState(defaultStartup);

const completedStartup = createDefaultAppStartupState({
  firstRun: false,
  lastStartupCompletedAt: "2026-05-13T18:00:00+08:00",
  consentCheckCompleted: true,
  consentCheckCompletedAt: "2026-05-13T17:00:00+08:00",
  consentVersion: "v1"
});
assert.equal(completedStartup.firstRun, false);
assert.equal(completedStartup.consentCheckCompleted, true);
assert.equal(completedStartup.consentVersion, "v1");

// consentCheckCompleted but missing timestamp
assert.throws(
  () =>
    createDefaultAppStartupState({
      consentCheckCompleted: true
    }),
  /consentCheckCompletedAt/
);

// consentCheckCompleted false but timestamp present
assert.throws(
  () =>
    createDefaultAppStartupState({
      consentCheckCompleted: false,
      consentCheckCompletedAt: "2026-05-13T18:00:00+08:00"
    }),
  /consentCheckCompletedAt must be null/
);

// consent version tracking
assert.equal(typeof CURRENT_CONSENT_VERSION, "string");
const consentWithVersion = createDefaultAppConsentState({
  disclaimerAccepted: true,
  disclaimerAcceptedAt: "2026-05-13T16:00:00+08:00",
  riskPromptAcknowledged: true,
  riskPromptAcknowledgedAt: "2026-05-13T16:00:00+08:00",
  consentVersion: CURRENT_CONSENT_VERSION
});
assert.equal(consentWithVersion.consentVersion, CURRENT_CONSENT_VERSION);

// ══════════════════════════════════════════════════════════════════════
// M04-GP0-003: Workspace recovery state
// ══════════════════════════════════════════════════════════════════════

const defaultRecovery = createDefaultAppWorkspaceRecoveryState();
assert.equal(defaultRecovery.restoreScene, "entry");
assert.equal(defaultRecovery.restoreWorkflow, null);
assert.equal(defaultRecovery.hasPendingOperation, false);
assertAppWorkspaceRecoveryState(defaultRecovery);

const pendingRecovery = createDefaultAppWorkspaceRecoveryState({
  restoreScene: "focus",
  restoreWorkflow: "counseling",
  restoreEntityId: "session-001",
  restoreReportId: "report-001",
  capturedAt: "2026-05-13T19:00:00+08:00",
  hasPendingOperation: true,
  resumeHint: "Continue counseling session"
});
assert.equal(pendingRecovery.restoreScene, "focus");
assert.equal(pendingRecovery.restoreWorkflow, "counseling");
assert.equal(pendingRecovery.restoreEntityId, "session-001");
assert.equal(pendingRecovery.hasPendingOperation, true);

// bootstrap with recovery state
const bootstrapWithRecovery = createDefaultAppBootstrapState({
  workspaceRecovery: {
    restoreScene: "route",
    restoreWorkflow: "simulation",
    restoreEntityId: "run-001",
    hasPendingOperation: true,
    resumeHint: "Resume simulation"
  }
});
assert.equal(bootstrapWithRecovery.workspaceRecovery.restoreScene, "route");
assert.equal(bootstrapWithRecovery.workspaceRecovery.resumeHint, "Resume simulation");
assertAppBootstrapState(bootstrapWithRecovery);

console.log("app-state validation passed (M04-T001/T002/T003 + M04-GP0-001/002/003)");
