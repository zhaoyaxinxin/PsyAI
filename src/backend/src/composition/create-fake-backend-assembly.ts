import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AppBootstrapState,
  AppBootstrapStatePatch,
  AppSettingsStore
} from "@psyai/app-state";
import type { KnowledgeIndexManifest } from "@psyai/infrastructure";
import {
  createCounselingController,
  createCounselingUseCases,
  createCounselingWorkflowAdapter,
  InMemoryCounselingSessionRepository,
  type CounselingController,
  type CounselingUseCases
} from "@psyai/counseling";
import {
  createReportingModule,
  InMemoryReportRegistry,
  type ReportingController,
  type ReportingModule
} from "@psyai/reporting";
import {
  createResonanceController,
  createResonanceRetrievalAdapter,
  createResonanceUseCases,
  FakeResonanceRetrieval,
  InMemoryResonanceRepository,
  type FakeResonanceCaseRecord,
  type ResonanceController,
  type ResonanceUseCases
} from "@psyai/resonance";
import {
  createSimulationController,
  createSimulationUseCases,
  createSimulationWorkflowAdapter,
  InMemorySimulationRepository,
  type SimulationController,
  type SimulationScenario,
  type SimulationUseCases
} from "@psyai/simulation";

import {
  createBackendAppBootstrapState,
  InMemoryAppSettingsStore
} from "../modules/app_state/index.js";
import {
  defaultFakeBackendAssemblyFixtures,
  type FakeBackendAssemblyFixtures
} from "./default-fake-assembly-fixtures.js";
import { createFakeAssemblyRuntimePorts } from "./fake-runtime-ports.js";
import { createHeuristicResonanceAnalysisPort } from "./resonance-analysis-ports.js";
import { createHeuristicResonanceComparisonExplainerPort } from "./resonance-comparison-explainer-ports.js";

export interface FakeBackendAssemblyOptions {
  now?: () => string;
  settingsStore?: AppSettingsStore;
  bootstrapOverrides?: AppBootstrapStatePatch;
  fixtures?: Partial<FakeBackendAssemblyFixtures>;
  dataDirectory?: string;
}

export interface FakeBackendAssembly {
  bootstrapState: AppBootstrapState;
  settingsStore: AppSettingsStore;
  controllers: {
    counseling: CounselingController;
    simulation: SimulationController;
    resonance: ResonanceController;
    reporting: ReportingController;
  };
  modules: {
    counseling: {
      useCases: CounselingUseCases;
      repository: InMemoryCounselingSessionRepository;
    };
    simulation: {
      useCases: SimulationUseCases;
      repository: InMemorySimulationRepository;
    };
    resonance: {
      useCases: ResonanceUseCases;
      repository: InMemoryResonanceRepository;
      retrieval: FakeResonanceRetrieval;
    };
    reporting: ReportingModule;
  };
  fixtures: {
    simulation: {
      scenarioId: string;
      entryBranchId: string;
      completionBranchId: string;
    };
    resonance: {
      candidateSetId: string;
      catalog: FakeResonanceCaseRecord[];
    };
  };
}

function cloneScenario(scenario: SimulationScenario): SimulationScenario {
  return structuredClone(scenario);
}

function cloneScenarios(
  scenarios: readonly SimulationScenario[]
): SimulationScenario[] {
  return scenarios.map((scenario) => cloneScenario(scenario));
}

function cloneCatalog(
  catalog: readonly FakeResonanceCaseRecord[]
): FakeResonanceCaseRecord[] {
  return catalog.map((item) => structuredClone(item));
}

function knowledgeIndexPath(dataDirectory: string): string {
  return path.join(dataDirectory, "indexes", "knowledge-resonance.index.json");
}

async function loadKnowledgeManifest(
  dataDirectory: string
): Promise<KnowledgeIndexManifest | null> {
  try {
    const raw = await readFile(knowledgeIndexPath(dataDirectory), "utf8");
    const manifest = JSON.parse(raw) as KnowledgeIndexManifest;
    if (!Array.isArray(manifest.vectorDocuments)) {
      return null;
    }
    return manifest;
  } catch {
    return null;
  }
}

const CASE_DENY_TOKENS = [
  "about",
  "appointment",
  "blog",
  "bibliograph",
  "chronological",
  "contents",
  "cookie",
  "guide",
  "index",
  "news",
  "seminar",
  "sitemap",
  "table_of_contents",
  "video"
] as const;

const TOPIC_TRANSLATIONS: Record<string, string> = {
  anxiety: "焦虑",
  anxious: "焦虑",
  argument: "争执",
  arguments: "争执",
  attachment: "依恋",
  burnout: "耗竭",
  case: "案例",
  conflict: "冲突",
  confrontation: "对峙",
  depression: "抑郁",
  emotional: "情绪",
  emotion: "情绪",
  family: "家庭",
  grief: "哀伤",
  guilt: "愧疚",
  loss: "失落",
  overload: "负荷过重",
  patient: "来访者",
  pressure: "压力",
  psychodynamic: "心理动力",
  psychoanalytic: "精神分析",
  relationship: "关系",
  rejection: "被拒绝感",
  rumination: "反刍",
  shame: "羞耻",
  silence: "沉默",
  stress: "压力",
  subject: "主体体验",
  symptom: "症状",
  tension: "紧张",
  trauma: "创伤",
  treatment: "治疗",
  withdrawal: "退缩",
  work: "工作",
  workplace: "工作场域"
};

function tokenizeKnowledgeText(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function containsHanText(value: string): boolean {
  return /[\p{Script=Han}]/u.test(value);
}

function isCaseDocument(entry: {
  fileName: string;
  title: string;
  relativePath: string;
}): boolean {
  const normalizedPath = entry.relativePath.replace(/\\/g, "/").toLowerCase();
  if (!normalizedPath.startsWith("high-quality-case-pool/")) {
    return false;
  }

  const haystack = `${entry.fileName} ${entry.title} ${normalizedPath}`.toLowerCase();

  if (CASE_DENY_TOKENS.some((token) => haystack.includes(token))) {
    return false;
  }

  return !entry.fileName.toLowerCase().startsWith("readme");
}

function deriveTopics(document: {
  title: string;
  summary: string;
  excerpt?: string;
  themes: string[];
  keywords: string[];
}): string[] {
  const tokens = uniqueNonEmpty([
    ...tokenizeKnowledgeText(document.title),
    ...tokenizeKnowledgeText(document.summary),
    ...tokenizeKnowledgeText(document.excerpt ?? ""),
    ...document.themes.map((theme) => theme.toLowerCase()),
    ...document.keywords.map((keyword) => keyword.toLowerCase())
  ]);

  const localized = uniqueNonEmpty(
    tokens
      .map((token) => TOPIC_TRANSLATIONS[token])
      .filter((value): value is string => typeof value === "string")
  );

  return localized.length > 0 ? localized.slice(0, 4) : ["情绪体验", "关系张力"];
}

function createKnowledgeCatalog(
  manifest: KnowledgeIndexManifest | null
): FakeResonanceCaseRecord[] {
  if (!manifest) {
    return [];
  }

  const vectorById = new Map(
    manifest.vectorDocuments.map((document) => [document.caseId, document] as const)
  );

  return manifest.documents
    .filter((entry) => [".md", ".txt"].includes(entry.extension))
    .filter((entry) =>
      isCaseDocument({
        fileName: entry.fileName,
        title: entry.title,
        relativePath: entry.relativePath
      })
    )
    .map((entry) => vectorById.get(entry.documentId))
    .filter((document): document is NonNullable<typeof document> => Boolean(document))
    .map((document, index) => {
      const topics = deriveTopics(document);
      const displayTitle = containsHanText(document.title)
        ? document.title.trim()
        : `知识库相似案例 ${String(index + 1).padStart(2, "0")} · ${topics[0] ?? "案例"}`;
      const displaySummary = containsHanText(document.summary)
        ? document.summary.trim()
        : `来自本地共振知识库的相似案件材料，主要涉及${topics.join("、")}。`;
      const displayExcerpt = containsHanText(document.excerpt ?? "")
        ? (document.excerpt ?? "").trim()
        : `该案例与当前输入在${topics.join("、")}等线索上更接近，可作为共振参考。`;
      return {
        caseId: document.caseId,
        title: displayTitle,
        summary: displaySummary,
        excerpt: displayExcerpt,
        themes: uniqueNonEmpty([...topics, ...document.themes]),
        keywords: uniqueNonEmpty([...topics, ...document.keywords, ...document.themes]),
        candidateSetId: "knowledge-resonance"
      };
    });
}

export async function createFakeBackendAssembly(
  options: FakeBackendAssemblyOptions = {}
): Promise<FakeBackendAssembly> {
  const settingsStore = options.settingsStore ?? new InMemoryAppSettingsStore();
  const now = options.now ?? (() => new Date().toISOString());
  const dataDirectory = options.dataDirectory ?? "data";
  const simulationScenarios = cloneScenarios(
    options.fixtures?.simulationScenarios ??
      defaultFakeBackendAssemblyFixtures.simulationScenarios ??
      [options.fixtures?.simulationScenario ?? defaultFakeBackendAssemblyFixtures.simulationScenario]
  );
  const simulationScenario =
    simulationScenarios[0] ??
    cloneScenario(
      options.fixtures?.simulationScenario ??
        defaultFakeBackendAssemblyFixtures.simulationScenario
    );
  const knowledgeCatalog = createKnowledgeCatalog(
    await loadKnowledgeManifest(dataDirectory)
  );
  const resonanceCatalog =
    knowledgeCatalog.length > 0
      ? knowledgeCatalog
      : cloneCatalog(
          options.fixtures?.resonanceCatalog ??
            defaultFakeBackendAssemblyFixtures.resonanceCatalog
        );
  const entryBranchId =
    simulationScenario.nodes.find((node) => node.nodeId === simulationScenario.entryNodeId)
      ?.branches[0]?.branchId ?? "branch-001";
  const completionBranchId =
    simulationScenario.nodes
      .find((node) => node.nodeId !== simulationScenario.entryNodeId && node.branches.length > 0)
      ?.branches[0]?.branchId ?? "branch-002";
  const candidateSetId =
    knowledgeCatalog.length > 0
      ? "knowledge-resonance"
      : resonanceCatalog[0]?.candidateSetId ?? "family-set";
  const runtimePorts = createFakeAssemblyRuntimePorts();
  const reporting = createReportingModule({
    registry: new InMemoryReportRegistry(),
    now
  });

  const counselingRepository = new InMemoryCounselingSessionRepository();
  const counselingUseCases = createCounselingUseCases({
    repository: counselingRepository,
    workflow: createCounselingWorkflowAdapter(runtimePorts.counseling),
    reportPort: reporting.counselingPort,
    now
  });

  const simulationRepository = new InMemorySimulationRepository(simulationScenarios);
  const simulationUseCases = createSimulationUseCases({
    repository: simulationRepository,
    workflow: createSimulationWorkflowAdapter(runtimePorts.simulation),
    reportPort: reporting.simulationPort,
    now
  });

  const resonanceRepository = new InMemoryResonanceRepository();
  const resonanceRetrieval = new FakeResonanceRetrieval(resonanceCatalog);
  const resonanceUseCases = createResonanceUseCases({
    repository: resonanceRepository,
    workflow: createResonanceRetrievalAdapter({
      retrieval: resonanceRetrieval,
      explainer: createHeuristicResonanceComparisonExplainerPort()
    }),
    analysisPort: createHeuristicResonanceAnalysisPort(),
    reportPort: reporting.resonancePort,
    now
  });

  return {
    bootstrapState: await createBackendAppBootstrapState({
      settingsStore,
      ...(options.bootstrapOverrides
        ? { bootstrapOverrides: options.bootstrapOverrides }
        : {})
    }),
    settingsStore,
    controllers: {
      counseling: createCounselingController({
        useCases: counselingUseCases,
        now
      }),
      simulation: createSimulationController({
        useCases: simulationUseCases,
        now
      }),
      resonance: createResonanceController({
        useCases: resonanceUseCases,
        now
      }),
      reporting: reporting.controller
    },
    modules: {
      counseling: {
        useCases: counselingUseCases,
        repository: counselingRepository
      },
      simulation: {
        useCases: simulationUseCases,
        repository: simulationRepository
      },
      resonance: {
        useCases: resonanceUseCases,
        repository: resonanceRepository,
        retrieval: resonanceRetrieval
      },
      reporting
    },
    fixtures: {
      simulation: {
        scenarioId: simulationScenario.scenarioId,
        entryBranchId,
        completionBranchId
      },
      resonance: {
        candidateSetId,
        catalog: cloneCatalog(resonanceCatalog)
      }
    }
  };
}
