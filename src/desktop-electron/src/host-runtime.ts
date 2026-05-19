import { promises as fs } from "node:fs";
import path from "node:path";
import type { ReportReference } from "@psyai/contracts";
import type { FrontendSceneRoute, FrontendShell, PageViewModel } from "@psyai/frontend";
import { syncKnowledgeLibraryIndexes } from "@psyai/infrastructure";
import type { PsyAiHostAction } from "./host-actions.js";
import { task12LibraryRoot } from "./project-paths.js";

const defaultScenarioId = "scenario-001";
const randomScenarioPool = ["scenario-001", "scenario-002", "scenario-003", "scenario-004"];
const task12CharacterLibraryDir = path.join(task12LibraryRoot, "人物设定");
const task12EnvironmentLibraryDir = path.join(task12LibraryRoot, "环境设定");
const personaLibraryRoot = path.resolve(process.cwd(), "架构约束", "task12", "设定库");
const characterLibraryDir = path.join(personaLibraryRoot, "人物设定");
const environmentLibraryDir = path.join(personaLibraryRoot, "环境设定");

function chooseScenarioId(currentScenarioId?: string | null): string {
  const candidates = currentScenarioId
    ? randomScenarioPool.filter((scenarioId) => scenarioId !== currentScenarioId)
    : randomScenarioPool;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? currentScenarioId ?? defaultScenarioId;
}

function resolveCurrentReportReference(shell: FrontendShell): ReportReference | null {
  const currentScene = shell.sceneStore.getState().coordinator.current;
  if (currentScene.scene === "report") {
    return {
      reportId: currentScene.reportId,
      workflow: currentScene.workflow,
      reportVersion: "v1"
    };
  }

  return (
    shell.counselingStore.getState().reportStatus?.reportReference ??
    shell.simulationStore.getState().reportStatus?.reportReference ??
    shell.resonanceStore.getState().reportStatus?.reportReference ??
    shell.reportStore.getState().currentReference
  );
}

function ensureValue<TValue>(value: TValue | null | undefined, message: string): TValue {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

interface MarkdownLibraryEntry {
  title: string;
  fields: Record<string, string>;
  summary: string;
}

function normalizeLine(line: string): string {
  return line.replace(/^\uFEFF/u, "").trim();
}

async function loadMarkdownLibrary(directory: string): Promise<MarkdownLibraryEntry[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
  const items = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(directory, file.name), "utf8");
      const lines = raw.split(/\r?\n/u).map(normalizeLine);
      const title =
        lines.find((line) => line.startsWith("# "))?.slice(2).trim() ??
        file.name.replace(/\.md$/u, "");
      const fields: Record<string, string> = {};
      let summary = "";
      let summaryMode = false;
      for (const line of lines) {
        if (!line) {
          continue;
        }
        if (line.startsWith("环境摘要") || line.startsWith("人物摘要")) {
          summaryMode = true;
          continue;
        }
        if (summaryMode) {
          summary = summary ? `${summary} ${line}` : line;
          continue;
        }
        if (!line.startsWith("- ")) {
          continue;
        }
        const separatorIndex = line.indexOf("：");
        if (separatorIndex < 0) {
          continue;
        }
        const key = line.slice(2, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (key && value) {
          fields[key] = value;
        }
      }
      return { title, fields, summary };
    })
  );
  return items.filter((item) => item.title.length > 0);
}

function sampleMany<TValue>(values: readonly TValue[], count: number): TValue[] {
  if (values.length === 0 || count <= 0) {
    return [];
  }
  const pool = [...values];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    const current = pool[index];
    pool[index] = pool[target] as TValue;
    pool[target] = current as TValue;
  }
  if (count <= pool.length) {
    return pool.slice(0, count);
  }
  const result = [...pool];
  while (result.length < count) {
    result.push(values[Math.floor(Math.random() * values.length)] as TValue);
  }
  return result;
}

function buildCharacterProfile(entry: MarkdownLibraryEntry, preferredName?: string) {
  const identityParts = [entry.fields["身份"], entry.fields["性格关键词"]]
    .filter((value) => value && value.trim().length > 0)
    .join("；");
  const currentStateParts = [entry.fields["隐藏压力"], entry.fields["触发点"], entry.summary]
    .filter((value) => value && value.trim().length > 0)
    .join("；");
  return {
    displayName: preferredName?.trim() || entry.title,
    identity: identityParts || entry.title,
    publicGoal: entry.fields["表面目标"] || "先稳住局势",
    currentState: currentStateParts || entry.fields["关系倾向"] || entry.title
  };
}

function buildEnvironmentProfile(entry: MarkdownLibraryEntry) {
  const locationParts = [entry.fields["场域类型"], entry.fields["时间"], entry.fields["空间状态"]]
    .filter((value) => value && value.trim().length > 0)
    .join("；");
  const pressureParts = [entry.fields["外部压力"], entry.fields["内部张力"], entry.fields["触发因素"]]
    .filter((value) => value && value.trim().length > 0)
    .join("；");
  const stateParts = [entry.fields["情绪基调"], entry.fields["环境推动"], entry.summary]
    .filter((value) => value && value.trim().length > 0)
    .join("；");
  return {
    displayName: entry.title,
    location: locationParts || entry.title,
    pressureSource: pressureParts || entry.summary || entry.title,
    currentState: stateParts || entry.summary || entry.title
  };
}

async function createRandomPrepareRequest(request: {
  scenarioId?: string;
  playerName?: string;
  npcCount?: number;
  npcNames?: string[];
  sourceNotes?: string[];
  operatorNote?: string;
}) {
  const [characterEntries, environmentEntries] = await Promise.all([
    loadMarkdownLibrary(task12CharacterLibraryDir),
    loadMarkdownLibrary(task12EnvironmentLibraryDir)
  ]);
  const [playerEntry] = sampleMany(characterEntries, 1);
  const environmentEntry = sampleMany(environmentEntries, 1)[0];
  const npcCount = Math.max(0, request.npcCount ?? 0);
  const npcEntries = sampleMany(characterEntries, npcCount);
  return {
    ...(request.scenarioId ? { scenarioId: request.scenarioId } : {}),
    ...(request.playerName?.trim() ? { playerName: request.playerName.trim() } : {}),
    playerProfile: buildCharacterProfile(
      playerEntry ?? characterEntries[0] ?? { title: "玩家", fields: {}, summary: "" },
      request.playerName
    ),
    npcProfiles: npcEntries.map((entry, index) =>
      buildCharacterProfile(entry, request.npcNames?.[index])
    ),
    environmentProfile: buildEnvironmentProfile(
      environmentEntry ?? environmentEntries[0] ?? { title: "环境", fields: {}, summary: "" }
    ),
    ...(request.sourceNotes && request.sourceNotes.length > 0
      ? { sourceNotes: request.sourceNotes }
      : {}),
    ...(request.operatorNote?.trim() ? { operatorNote: request.operatorNote.trim() } : {})
  };
}

export async function executeHostAction(shell: FrontendShell, action: PsyAiHostAction): Promise<PageViewModel> {
  const occurredAt = new Date().toISOString();

  switch (action.type) {
    case "scene.navigate":
      shell.sceneStore.navigate(action.route, action.reason, occurredAt);
      break;
    case "scene.back":
      shell.sceneStore.back(action.reason, occurredAt);
      break;
    case "counseling.start": {
      const request = action.request ?? {
        openingMessage: "I have been under pressure lately and need help sorting through it.",
        userContext: ["self-reflection"]
      };
      await shell.counselingStore.start(request, occurredAt);
      const sessionId = shell.counselingStore.getState().session?.sessionId;
      shell.sceneStore.navigate(
        { scene: "focus", workflow: "counseling", ...(sessionId ? { entityId: sessionId } : {}) },
        "counseling.start",
        occurredAt
      );
      break;
    }
    case "counseling.reply": {
      const sessionId = ensureValue(
        action.request?.sessionId ?? shell.counselingStore.getState().session?.sessionId,
        "No active counseling session."
      );
      await shell.counselingStore.reply(
        {
          sessionId,
          message: action.request?.message ?? "I need help understanding what is driving this feeling."
        },
        occurredAt
      );
      break;
    }
    case "counseling.finish": {
      const sessionId = ensureValue(
        action.sessionId ?? shell.counselingStore.getState().session?.sessionId,
        "No active counseling session."
      );
      await shell.counselingStore.finish(sessionId, occurredAt);
      break;
    }
    case "counseling.loadReportStatus": {
      const sessionId = ensureValue(
        action.sessionId ?? shell.counselingStore.getState().session?.sessionId,
        "No counseling session available for report lookup."
      );
      await shell.counselingStore.loadReportStatus(sessionId, occurredAt);
      break;
    }
    case "simulation.loadScenario": {
      const currentScenarioId = shell.simulationStore.getState().scenario?.scenarioId ?? null;
      const scenarioId = action.scenarioId ?? chooseScenarioId(currentScenarioId);
      await shell.simulationStore.loadScenario(scenarioId, occurredAt);
      await shell.simulationStore.prepare({ scenarioId }, occurredAt);
      shell.sceneStore.navigate({ scene: "route" }, "simulation.loadScenario", occurredAt);
      break;
    }
    case "simulation.prepare": {
      const prepareRequest = action.request as
        | (typeof action.request & {
            playerProfile?: Record<string, string | undefined>;
            npcProfiles?: Array<Record<string, string | undefined>>;
            environmentProfile?: Record<string, string | undefined>;
          })
        | undefined;
      const scenarioId =
        prepareRequest?.scenarioId ??
        shell.simulationStore.getState().scenario?.scenarioId ??
        defaultScenarioId;
      await shell.simulationStore.prepare(
        ({
          scenarioId,
          ...(prepareRequest?.sourceNotes ? { sourceNotes: prepareRequest.sourceNotes } : {}),
          ...(prepareRequest?.playerName ? { playerName: prepareRequest.playerName } : {}),
          ...(prepareRequest?.playerProfile ? { playerProfile: prepareRequest.playerProfile } : {}),
          ...(prepareRequest?.npcProfiles ? { npcProfiles: prepareRequest.npcProfiles } : {}),
          ...(prepareRequest?.environmentProfile ? { environmentProfile: prepareRequest.environmentProfile } : {}),
          ...(prepareRequest?.operatorNote ? { operatorNote: prepareRequest.operatorNote } : {})
        }) as never,
        occurredAt
      );
      shell.sceneStore.navigate({ scene: "route" }, "simulation.prepare", occurredAt);
      break;
    }
    case "simulation.randomizePrepare": {
      const request = await createRandomPrepareRequest({
        scenarioId:
          action.request?.scenarioId ??
          shell.simulationStore.getState().scenario?.scenarioId ??
          defaultScenarioId,
        playerName: action.request?.playerName,
        npcCount: action.request?.npcCount,
        npcNames: action.request?.npcNames,
        sourceNotes: action.request?.sourceNotes,
        operatorNote: action.request?.operatorNote
      });
      await shell.simulationStore.prepare(request as never, occurredAt);
      shell.sceneStore.navigate({ scene: "route" }, "simulation.randomizePrepare", occurredAt);
      break;
    }
    case "simulation.startRun": {
      const currentPreparation = shell.simulationStore.getState().preparation;
      const request = action.request ?? {
        scenarioId: shell.simulationStore.getState().scenario?.scenarioId ?? defaultScenarioId,
        operatorNote: "Start with a de-escalation posture."
      };
      await shell.simulationStore.startRun(
        {
          ...request,
          ...(request.prepareId ? {} : currentPreparation?.prepareId ? { prepareId: currentPreparation.prepareId } : {})
        },
        occurredAt
      );
      const runId = shell.simulationStore.getState().run?.runId;
      shell.sceneStore.navigate(
        { scene: "route", ...(runId ? { runId } : {}) },
        "simulation.startRun",
        occurredAt
      );
      break;
    }
    case "simulation.advance": {
      const advanceRequest = action.request as
        | (typeof action.request & { customActionText?: string })
        | undefined;
      const currentRun = shell.simulationStore.getState().run;
      const branchId = advanceRequest?.branchId ?? currentRun?.currentNode.availableBranches[0]?.branchId;
      const runId = advanceRequest?.runId ?? currentRun?.runId;
      await shell.simulationStore.advance(
        {
          runId: ensureValue(runId, "No simulation run available."),
          ...(advanceRequest?.actionId
            ? { actionId: advanceRequest.actionId }
            : { branchId: ensureValue(branchId, "No simulation branch available.") }),
          ...(advanceRequest?.customActionText
            ? { customActionText: advanceRequest.customActionText }
            : {}),
          ...(advanceRequest?.rationale ? { rationale: advanceRequest.rationale } : {})
        },
        occurredAt
      );
      break;
    }
    case "simulation.finish": {
      const runId = ensureValue(
        action.runId ?? shell.simulationStore.getState().run?.runId,
        "No simulation run available."
      );
      await shell.simulationStore.finish(runId, occurredAt);
      break;
    }
    case "simulation.loadReportStatus": {
      const runId = ensureValue(
        action.runId ?? shell.simulationStore.getState().run?.runId,
        "No simulation run available for report lookup."
      );
      await shell.simulationStore.loadReportStatus(runId, occurredAt);
      break;
    }
    case "resonance.submitInput": {
      const request = action.request ?? {
        sourceType: "text",
        text: "I feel numb after repeated family conflicts and do not know how to respond anymore."
      };
      await shell.resonanceStore.submitInput(request, occurredAt);
      const inputId = shell.resonanceStore.getState().input?.inputId;
      shell.sceneStore.navigate(
        { scene: "focus", workflow: "resonance", ...(inputId ? { entityId: inputId } : {}) },
        "resonance.submitInput",
        occurredAt
      );
      break;
    }
    case "resonance.analyzeInput": {
      const inputId = ensureValue(
        action.inputId ?? shell.resonanceStore.getState().input?.inputId,
        "No resonance input available for analysis."
      );
      await shell.resonanceStore.analyzeInput(inputId, occurredAt);
      break;
    }
    case "resonance.compare": {
      const inputId = ensureValue(
        action.request?.inputId ?? shell.resonanceStore.getState().input?.inputId,
        "No resonance input available."
      );
      await shell.resonanceStore.compare(
        {
          inputId,
          ...(action.request?.candidateSetId ? { candidateSetId: action.request.candidateSetId } : {}),
          ...(action.request?.topK ? { topK: action.request.topK } : {})
        },
        occurredAt
      );
      break;
    }
    case "resonance.loadMatches": {
      const comparisonId = ensureValue(
        action.comparisonId ?? shell.resonanceStore.getState().comparison?.comparisonId,
        "No resonance comparison available."
      );
      await shell.resonanceStore.loadMatches(comparisonId, occurredAt);
      break;
    }
    case "resonance.loadReportStatus": {
      const comparisonId = ensureValue(
        action.comparisonId ?? shell.resonanceStore.getState().comparison?.comparisonId,
        "No resonance comparison available for report lookup."
      );
      await shell.resonanceStore.loadReportStatus(comparisonId, occurredAt);
      break;
    }
    case "resonance.reset":
      (shell.resonanceStore as typeof shell.resonanceStore & {
        reset: (value: string) => unknown;
      }).reset(occurredAt);
      shell.sceneStore.navigate(
        { scene: "focus", workflow: "resonance" },
        "resonance.reset",
        occurredAt
      );
      break;
    case "report.load": {
      const reference = ensureValue(
        action.reference ?? resolveCurrentReportReference(shell),
        "No report reference available."
      );
      await shell.reportStore.load(reference, occurredAt);
      const route: FrontendSceneRoute = {
        scene: "report",
        workflow: reference.workflow,
        reportId: reference.reportId
      };
      shell.sceneStore.navigate(route, "report.load", occurredAt);
      break;
    }
    case "report.list":
      shell.reportStore.list();
      break;
    case "settings.saveProviderConfig":
      shell.settingsStore.updateProvider({
        ...(action.request?.providerId ? { providerId: action.request.providerId } : {}),
        ...(action.request?.modelName ? { modelName: action.request.modelName } : {}),
        ...(action.request?.endpoint !== undefined ? { endpoint: action.request.endpoint } : {}),
        ...(action.request?.apiKey
          ? {
              apiKeyConfigured: true,
              apiKeyPreview:
                action.request.apiKey.length <= 8
                  ? `${action.request.apiKey.slice(0, 2)}***`
                  : `${action.request.apiKey.slice(0, 4)}...${action.request.apiKey.slice(-4)}`
            }
          : {})
      }, occurredAt);
      break;
    case "settings.testProviderConnection":
      await shell.settingsStore.testProviderConnection(occurredAt);
      break;
    case "settings.refreshDataDirectory":
      await syncKnowledgeLibraryIndexes(shell.settingsStore.getState().dataDirectory.rootPath);
      await shell.settingsStore.refreshDataDirectory(occurredAt);
      break;
    case "settings.runCleanup":
      await shell.settingsStore.runCleanup(occurredAt);
      break;
    case "settings.runExport":
      await shell.settingsStore.runExport(occurredAt);
      break;
    default: {
      const exhaustiveCheck: never = action;
      void exhaustiveCheck;
    }
  }

  return shell.getPageViewModel();
}
