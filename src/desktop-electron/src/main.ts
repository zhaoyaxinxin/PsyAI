import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFakeBackendAssembly,
  createRealBackendAssembly,
  type FakeBackendAssembly,
  type RealBackendAssembly
} from "@psyai/backend";
import { syncKnowledgeLibraryIndexes } from "@psyai/infrastructure";
import { createFrontendShell, type FrontendReportDocument, type FrontendShell } from "@psyai/frontend";
import type { PsyAiHostAction } from "./host-actions.js";
import { executeHostAction } from "./host-runtime.js";
import { dataDirectory } from "./project-paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeConfigPath = path.join(dataDirectory, "desktop-runtime-config.json");

type DesktopAssembly = FakeBackendAssembly | RealBackendAssembly;

interface DesktopRuntimeConfig {
  providerId: string;
  modelName: string;
  endpoint: string;
  deepseekApiKey: string;
}

interface DesktopRuntime {
  assembly: DesktopAssembly;
  shell: FrontendShell;
  mode: "deepseek" | "fake";
}

async function persistDesktopAssembly(assembly: DesktopAssembly): Promise<void> {
  if ("database" in assembly && assembly.database) {
    await assembly.database.persist();
  }
}

async function closeDesktopRuntime(runtime: DesktopRuntime | null | undefined): Promise<void> {
  if (!runtime) {
    return;
  }

  if ("database" in runtime.assembly && runtime.assembly.database) {
    await runtime.assembly.database.close();
  }
}

const defaultRuntimeConfig: DesktopRuntimeConfig = {
  providerId: "deepseek",
  modelName: "deepseek-v4-flash",
  endpoint: "https://api.deepseek.com",
  deepseekApiKey: ""
};

function normalizeRuntimeConfig(config: Partial<DesktopRuntimeConfig>): DesktopRuntimeConfig {
  return {
    providerId: config.providerId?.trim() || defaultRuntimeConfig.providerId,
    modelName: config.modelName?.trim() || defaultRuntimeConfig.modelName,
    endpoint: config.endpoint?.trim() || defaultRuntimeConfig.endpoint,
    deepseekApiKey: config.deepseekApiKey?.trim() || ""
  };
}

function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  if (apiKey.length <= 8) return `${apiKey.slice(0, 2)}***`;
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

async function loadRuntimeConfig(): Promise<DesktopRuntimeConfig> {
  const envKey = process.env["DEEPSEEK_API_KEY"]?.trim() ?? "";

  try {
    const raw = await fs.readFile(runtimeConfigPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DesktopRuntimeConfig>;
    return normalizeRuntimeConfig({
      ...parsed,
      deepseekApiKey: parsed.deepseekApiKey?.trim() || envKey
    });
  } catch {
    return normalizeRuntimeConfig({ deepseekApiKey: envKey });
  }
}

async function saveRuntimeConfig(config: DesktopRuntimeConfig): Promise<void> {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.writeFile(runtimeConfigPath, JSON.stringify(config, null, 2), "utf8");
}

function unwrap(response: unknown): unknown {
  const env = response as { status?: string; error?: { code?: string; message?: string } };
  if (env.status === "error") {
    throw new Error(`${env.error?.code ?? "HOST_ERROR"}: ${env.error?.message ?? "unknown host error"}`);
  }
  return response;
}

function createAssemblyTransport(assembly: DesktopAssembly) {
  const now = () => new Date().toISOString();

  return {
    async send(operation: string, payload: unknown) {
      switch (operation) {
        case "counseling.start":
          return unwrap(await assembly.controllers.counseling.start(payload as Parameters<typeof assembly.controllers.counseling.start>[0], now()));
        case "counseling.reply":
          return unwrap(await assembly.controllers.counseling.reply(payload as Parameters<typeof assembly.controllers.counseling.reply>[0], now()));
        case "counseling.finish":
          return unwrap(await assembly.controllers.counseling.finish(payload as Parameters<typeof assembly.controllers.counseling.finish>[0], now()));
        case "counseling.get":
          return unwrap(await assembly.controllers.counseling.get(payload as Parameters<typeof assembly.controllers.counseling.get>[0], now()));
        case "counseling.list":
          return unwrap(await assembly.controllers.counseling.list(payload as Parameters<typeof assembly.controllers.counseling.list>[0], now()));
        case "counseling.report":
          return unwrap(await assembly.controllers.counseling.getReportStatus(payload as Parameters<typeof assembly.controllers.counseling.getReportStatus>[0], now()));
        case "simulation.scenario":
          return unwrap(await assembly.controllers.simulation.getScenario(payload as Parameters<typeof assembly.controllers.simulation.getScenario>[0], now()));
        case "simulation.prepare":
          return unwrap(await assembly.controllers.simulation.prepare(payload as Parameters<typeof assembly.controllers.simulation.prepare>[0], now()));
        case "simulation.run":
          return unwrap(await assembly.controllers.simulation.createRun(payload as Parameters<typeof assembly.controllers.simulation.createRun>[0], now()));
        case "simulation.node":
          return unwrap(await assembly.controllers.simulation.getNode(payload as Parameters<typeof assembly.controllers.simulation.getNode>[0], now()));
        case "simulation.advance":
          return unwrap(await assembly.controllers.simulation.advance(payload as Parameters<typeof assembly.controllers.simulation.advance>[0], now()));
        case "simulation.finish":
          return unwrap(await assembly.controllers.simulation.finish(payload as Parameters<typeof assembly.controllers.simulation.finish>[0], now()));
        case "simulation.list":
          return unwrap(await assembly.controllers.simulation.list(payload as Parameters<typeof assembly.controllers.simulation.list>[0], now()));
        case "simulation.report":
          return unwrap(await assembly.controllers.simulation.getReportStatus(payload as Parameters<typeof assembly.controllers.simulation.getReportStatus>[0], now()));
        case "resonance.input":
          return unwrap(await assembly.controllers.resonance.submitInput(payload as Parameters<typeof assembly.controllers.resonance.submitInput>[0], now()));
        case "resonance.analyze":
          return unwrap(await assembly.controllers.resonance.analyzeInput(payload as Parameters<typeof assembly.controllers.resonance.analyzeInput>[0], now()));
        case "resonance.compare":
          return unwrap(await assembly.controllers.resonance.compare(payload as Parameters<typeof assembly.controllers.resonance.compare>[0], now()));
        case "resonance.matches":
          return unwrap(await assembly.controllers.resonance.getMatches(payload as Parameters<typeof assembly.controllers.resonance.getMatches>[0], now()));
        case "resonance.detail":
          return unwrap(await assembly.controllers.resonance.getDetail(payload as Parameters<typeof assembly.controllers.resonance.getDetail>[0], now()));
        case "resonance.list":
          return unwrap(await assembly.controllers.resonance.list(payload as Parameters<typeof assembly.controllers.resonance.list>[0], now()));
        case "resonance.report":
          return unwrap(await assembly.controllers.resonance.getReportStatus(payload as Parameters<typeof assembly.controllers.resonance.getReportStatus>[0], now()));
        default:
          throw new Error(`Unsupported desktop transport operation: ${operation}`);
      }
    }
  };
}

function createAssemblyReportRepository(assembly: DesktopAssembly) {
  return {
    async loadByReference(reference: { reportId: string }): Promise<FrontendReportDocument> {
      const response = unwrap(await assembly.controllers.reporting.getReport({ reportId: reference.reportId }, new Date().toISOString()));
      return (response as { data: FrontendReportDocument }).data;
    }
  };
}

async function createDesktopRuntime(config: DesktopRuntimeConfig): Promise<DesktopRuntime> {
  const useDeepSeek = config.providerId === "deepseek" && config.deepseekApiKey.length > 0;

  const assembly = useDeepSeek
    ? await createRealBackendAssembly({
        provider: "deepseek",
        deepseekApiKey: config.deepseekApiKey,
        deepseekOptions: {
          model: config.modelName,
          ...(config.endpoint ? { baseUrl: config.endpoint } : {})
        },
        dataDirectory,
        now: () => new Date().toISOString()
      })
    : await createFakeBackendAssembly({
        now: () => new Date().toISOString(),
        dataDirectory
      });

  const shell = createFrontendShell({
    bootstrapState: assembly.bootstrapState,
    transport: createAssemblyTransport(assembly),
    reportRepository: createAssemblyReportRepository(assembly)
  });

  shell.settingsStore.updateProvider({
    providerId: config.providerId,
    providerVersion: useDeepSeek ? "实时模式" : "演示模式",
    endpoint: config.endpoint,
    modelName: config.modelName,
    capabilities: useDeepSeek ? ["live-backend", "deepseek"] : ["fixture-backend", "demo"],
    apiKeyConfigured: config.deepseekApiKey.length > 0,
    apiKeyPreview: maskApiKey(config.deepseekApiKey)
  });
  await shell.settingsStore.refreshDataDirectory(new Date().toISOString());

  return {
    assembly,
    shell,
    mode: useDeepSeek ? "deepseek" : "fake"
  };
}

async function createWindow(): Promise<void> {
  await syncKnowledgeLibraryIndexes(dataDirectory);
  let runtimeConfig = await loadRuntimeConfig();
  let runtime = await createDesktopRuntime(runtimeConfig);
  await persistDesktopAssembly(runtime.assembly);
  let shell = runtime.shell;
  let unsubscribeStoreListeners: Array<() => void> = [];

  const mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    title: "PsyAI",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.maximize();

  const getCurrentViewModel = () => shell.getPageViewModel();

  const pushStateChanged = () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("psyai:stateChanged", getCurrentViewModel());
    }
  };

  const bindShell = (nextShell: FrontendShell) => {
    for (const unsubscribe of unsubscribeStoreListeners) {
      unsubscribe();
    }

    shell = nextShell;
    unsubscribeStoreListeners = [
      shell.sceneStore.subscribe(pushStateChanged),
      shell.counselingStore.subscribe(pushStateChanged),
      shell.simulationStore.subscribe(pushStateChanged),
      shell.resonanceStore.subscribe(pushStateChanged),
      shell.reportStore.subscribe(pushStateChanged),
      shell.settingsStore.subscribe(pushStateChanged)
    ];
  };

  bindShell(shell);

  ipcMain.handle("psyai:getPageViewModel", () => getCurrentViewModel());
  ipcMain.handle("psyai:invokeAction", async (_event, action: PsyAiHostAction) => {
    if (action.type === "settings.saveProviderConfig") {
      runtimeConfig = normalizeRuntimeConfig({
        ...runtimeConfig,
        providerId: action.request?.providerId,
        modelName: action.request?.modelName,
        endpoint: action.request?.endpoint,
        deepseekApiKey: action.request?.apiKey || runtimeConfig.deepseekApiKey
      });

      await saveRuntimeConfig(runtimeConfig);
      await closeDesktopRuntime(runtime);
      runtime = await createDesktopRuntime(runtimeConfig);
      bindShell(runtime.shell);
      await persistDesktopAssembly(runtime.assembly);
      pushStateChanged();
      return getCurrentViewModel();
    }

    const nextViewModel = await executeHostAction(shell, action);
    await persistDesktopAssembly(runtime.assembly);
    return nextViewModel;
  });

  mainWindow.on("closed", () => {
    for (const unsubscribe of unsubscribeStoreListeners) {
      unsubscribe();
    }

    void closeDesktopRuntime(runtime);
  });

  const rendererHtml = path.join(__dirname, "renderer", "index.html");
  await mainWindow.loadFile(rendererHtml);
}

app.whenReady().then(createWindow);
app.on("before-quit", () => {
  void ipcMain.removeHandler("psyai:getPageViewModel");
  void ipcMain.removeHandler("psyai:invokeAction");
});
app.on("window-all-closed", () => app.quit());
