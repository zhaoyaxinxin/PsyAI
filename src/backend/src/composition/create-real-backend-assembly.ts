/**
 * createRealBackendAssembly — V1 Real Assembly (Stage 5)
 *
 * MODULE BOUNDARY: Module 12 (assembly-rules). Does NOT own business logic.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AppBootstrapState, AppBootstrapStatePatch, AppSettingsStore } from "@psyai/app-state";

import {
  createDataDirectoryLayout,
  DeepSeekLlmAdapter,
  PlaceholderAgentRuntime,
  PlaceholderVectorStore,
  SqliteAppSettingsStore,
  SqliteCounselingRepository,
  SqliteDatabase,
  SqliteReportRegistry,
  SqliteResonanceRepository,
  SqliteSimulationRepository,
  TokenVectorStore,
  type DeepSeekLlmAdapterOptions,
  type KnowledgeIndexManifest,
  type PlaceholderVectorDocument
} from "@psyai/infrastructure";

import {
  createCounselingController,
  createCounselingUseCases,
  createCounselingWorkflowAdapter,
  type CounselingController
} from "@psyai/counseling";

import { createReportingModule, type ReportingController } from "@psyai/reporting";

import {
  createResonanceController,
  createResonanceRetrievalAdapter,
  createResonanceUseCases,
  type ResonanceController
} from "@psyai/resonance";

import {
  createSimulationController,
  createSimulationUseCases,
  createSimulationWorkflowAdapter,
  type SimulationController,
  type SimulationScenario
} from "@psyai/simulation";

import { createBackendAppBootstrapState } from "../modules/app_state/index.js";

import {
  defaultFakeBackendAssemblyFixtures,
  type FakeBackendAssemblyFixtures
} from "./default-fake-assembly-fixtures.js";
import {
  createDeepSeekResonanceAnalysisPort,
  createHeuristicResonanceAnalysisPort
} from "./resonance-analysis-ports.js";
import {
  createDeepSeekResonanceComparisonExplainerPort,
  createHeuristicResonanceComparisonExplainerPort
} from "./resonance-comparison-explainer-ports.js";
import { buildSimulationNarrativeSnippet } from "./simulation-text.js";

// ---------------------------------------------------------------------------
// Runtime ports
// ---------------------------------------------------------------------------

import type { CounselingAnalysis } from "@psyai/contracts";
import type { CounselingRuntimePort } from "@psyai/counseling";
import type {
  SimulationActionOption,
  SimulationRuntimePort
} from "@psyai/simulation";

type CounselingStage = CounselingAnalysis["stage"];
type CounselingRiskLevel = CounselingAnalysis["riskLevel"];
type CounselingKnowledgeResolver = (
  query: string | undefined
) => Promise<string | null>;

function knowledgeIndexPath(
  dataDirectory: string,
  library: "counseling" | "resonance"
): string {
  return path.join(dataDirectory, "indexes", `knowledge-${library}.index.json`);
}

async function loadKnowledgeManifest(
  dataDirectory: string,
  library: "counseling" | "resonance"
): Promise<KnowledgeIndexManifest | null> {
  try {
    const raw = await readFile(knowledgeIndexPath(dataDirectory, library), "utf8");
    const manifest = JSON.parse(raw) as KnowledgeIndexManifest;
    if (!Array.isArray(manifest.vectorDocuments)) {
      return null;
    }
    return manifest;
  } catch {
    return null;
  }
}

function selectKnowledgeDocuments(
  manifest: KnowledgeIndexManifest | null,
  library: "counseling" | "resonance"
) {
  if (!manifest) {
    return [];
  }

  const vectorById = new Map(
    manifest.vectorDocuments.map((document) => [document.caseId, document] as const)
  );

  const selected = manifest.documents.filter((entry) => {
    if (![".md", ".txt"].includes(entry.extension)) {
      return false;
    }

    const normalizedPath = entry.relativePath.replace(/\\/g, "/").toLowerCase();
    const fileName = entry.fileName.toLowerCase();

    if (fileName === "readme.md") {
      return false;
    }

    if (library === "counseling") {
      return !normalizedPath.includes("/99_metadata/");
    }

    return isResonanceCaseDocument({
      fileName: entry.fileName,
      title: entry.title,
      relativePath: entry.relativePath
    });
  });

  return selected
    .map((entry) => vectorById.get(entry.documentId))
    .filter((document): document is NonNullable<typeof document> => Boolean(document));
}

const RESONANCE_CASE_DENY_TOKENS = [
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

const RESONANCE_TOPIC_TRANSLATIONS: Record<string, string> = {
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

function isResonanceCaseDocument(entry: {
  fileName: string;
  title: string;
  relativePath: string;
}): boolean {
  const normalizedPath = entry.relativePath.replace(/\\/g, "/").toLowerCase();
  if (!normalizedPath.startsWith("high-quality-case-pool/")) {
    return false;
  }

  const haystack = `${entry.fileName} ${entry.title} ${normalizedPath}`.toLowerCase();

  if (RESONANCE_CASE_DENY_TOKENS.some((token) => haystack.includes(token))) {
    return false;
  }

  return !entry.fileName.toLowerCase().startsWith("readme");
}

function deriveResonanceTopics(document: {
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
      .map((token) => RESONANCE_TOPIC_TRANSLATIONS[token])
      .filter((value): value is string => typeof value === "string")
  );

  return localized.length > 0 ? localized.slice(0, 4) : ["情绪体验", "关系张力"];
}

function createLocalizedResonanceDocument(
  document: {
    caseId: string;
    title: string;
    summary: string;
    excerpt?: string;
    themes: string[];
    keywords: string[];
    candidateSetId?: string;
  },
  index: number
): PlaceholderVectorDocument {
  const topics = deriveResonanceTopics(document);
  const topicLine = topics.join("、");
  const displayTitle = containsHanText(document.title)
    ? document.title.trim()
    : `知识库相似案例 ${String(index + 1).padStart(2, "0")}${topics[0] ? ` · ${topics[0]}` : ""}`;
  const displaySummary = containsHanText(document.summary)
    ? document.summary.trim()
    : `来自本地共振知识库的相似案件材料，主要涉及${topicLine}。`;
  const displayExcerpt = containsHanText(document.excerpt ?? "")
    ? (document.excerpt ?? "").trim()
    : `该案例与当前输入在${topicLine}等线索上更接近，可作为共振参考。`;

  return {
    caseId: document.caseId,
    title: displayTitle,
    summary: displaySummary,
    excerpt: displayExcerpt,
    themes: uniqueNonEmpty([...topics, ...document.themes]),
    keywords: uniqueNonEmpty([...topics, ...document.keywords, ...document.themes]),
    ...(document.candidateSetId ? { candidateSetId: document.candidateSetId } : {})
  };
}

function createResonanceKnowledgeCatalog(
  manifest: KnowledgeIndexManifest | null
): PlaceholderVectorDocument[] {
  if (!manifest) {
    return [];
  }

  const vectorById = new Map(
    manifest.vectorDocuments.map((document) => [document.caseId, document] as const)
  );

  return manifest.documents
    .filter((entry) => [".md", ".txt"].includes(entry.extension))
    .filter((entry) => isResonanceCaseDocument(entry))
    .map((entry) => vectorById.get(entry.documentId))
    .filter((document): document is NonNullable<typeof document> => Boolean(document))
    .map((document, index) => createLocalizedResonanceDocument(document, index));
}

function createCounselingKnowledgeResolver(
  manifest: KnowledgeIndexManifest | null
): CounselingKnowledgeResolver | undefined {
  const selectedDocuments = selectKnowledgeDocuments(manifest, "counseling");
  if (selectedDocuments.length === 0) {
    return undefined;
  }

  const store = new TokenVectorStore({
    documents: selectedDocuments.map((document) => ({ ...document }))
  });
  store.buildIndex();

  return async (query) => {
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) {
      return null;
    }

    const matches = await store.search(
      normalizedQuery,
      [],
      3,
      "knowledge-counseling"
    );

    if (matches.length === 0) {
      return null;
    }

    return [
      "本地参考材料摘要：",
      ...matches.map(
        (match, index) => `${index + 1}. 《${match.title}》：${match.summary}`
      )
    ].join("\n");
  };
}

function prependCounselingKnowledgeMessage(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  knowledgeSummary: string | null
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  if (!knowledgeSummary) {
    return messages;
  }

  return [
    {
      role: "system",
      content: `${knowledgeSummary}\n请优先参考以上本地材料摘要，在相关时吸收其专业观点，但不要逐字照抄。`
    },
    ...messages
  ];
}

function createSimulationFallbackActions(seed: string): SimulationActionOption[] {
  return [
    {
      actionId: `${seed}-reflect`,
      label: "先稳住局面再回应",
      intent: "延缓直接冲突，继续观察变化",
      riskHint: "可能被理解为暂时回避"
    },
    {
      actionId: `${seed}-probe`,
      label: "追问对方真正担心什么",
      intent: "把表层矛盾拉向真实动机",
      riskHint: "可能短时加剧防御"
    }
  ];
}

function buildAdaptiveDialogue(
  turnIndex: number,
  actionLabel: string,
  actorStates: Array<{ actorId: string; actorName: string; currentState: string }>,
  environmentText: string,
  preparation?: {
    cast?: {
      player?: {
        behavior?: { initiative?: number; aggression?: number; empathy?: number };
        persona?: { publicGoal?: string; hiddenPressure?: string };
      };
      npcs?: Array<{
        agentId: string;
        behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number };
        persona?: { publicGoal?: string; hiddenPressure?: string };
      }>;
    };
  }
) {
  const player = actorStates[0];
  const playerSeed = preparation?.cast?.player;
  const npcSeeds = preparation?.cast?.npcs ?? [];
  const sortedNpcs = actorStates
    .slice(1)
    .map((actorState) => ({
      actorState,
      seed: npcSeeds.find((npc) => npc.agentId === actorState.actorId)
    }))
    .sort((left, right) => {
      const leftScore =
        (left.seed?.behavior?.initiative ?? 50) +
        (left.seed?.behavior?.aggression ?? 50) -
        (left.seed?.behavior?.avoidance ?? 50);
      const rightScore =
        (right.seed?.behavior?.initiative ?? 50) +
        (right.seed?.behavior?.aggression ?? 50) -
        (right.seed?.behavior?.avoidance ?? 50);
      return rightScore - leftScore;
    });
  const primaryNpc = sortedNpcs[0];
  const secondaryNpc = sortedNpcs[1];
  const playerAggression = playerSeed?.behavior?.aggression ?? 50;
  const playerEmpathy = playerSeed?.behavior?.empathy ?? 50;
  const playerGoal = playerSeed?.persona?.publicGoal ?? "稳住局势";
  const primaryGoal = primaryNpc?.seed?.persona?.publicGoal ?? "守住立场";
  const primaryPressure =
    primaryNpc?.seed?.persona?.hiddenPressure ??
    primaryNpc?.actorState.currentState ??
    "不让场面失控";
  const primaryTone =
    (primaryNpc?.seed?.behavior?.avoidance ?? 50) >
    (primaryNpc?.seed?.behavior?.aggression ?? 50) + 12
      ? "retreat"
      : (primaryNpc?.seed?.behavior?.empathy ?? 50) >
          (primaryNpc?.seed?.behavior?.aggression ?? 50) + 10
        ? "align"
        : "defend";

  return [
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-001`,
      sequence: 1,
      agentId: player?.actorId ?? "player",
      displayName: player?.actorName ?? "我",
      role: "player" as const,
      tone: playerAggression > playerEmpathy ? ("probe" as const) : ("align" as const),
      content: `${player?.actorName ?? "我"}先把“${actionLabel}”摆到台前，目标是${playerGoal}。`
    },
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-002`,
      sequence: 2,
      agentId: primaryNpc?.actorState.actorId ?? "npc-primary",
      displayName: primaryNpc?.actorState.actorName ?? "对方",
      role: "npc" as const,
      tone: primaryTone as "defend" | "align" | "retreat",
      content:
        primaryTone === "retreat"
          ? `${primaryNpc?.actorState.actorName ?? "对方"}没有正面顶回去，而是先把“${primaryPressure}”压回去。`
          : primaryTone === "align"
            ? `${primaryNpc?.actorState.actorName ?? "对方"}顺着话往下接，但仍想把结果拉回“${primaryGoal}”。`
            : `${primaryNpc?.actorState.actorName ?? "对方"}立刻防守，试图把场面重新拉回“${primaryGoal}”。`
    },
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-003`,
      sequence: 3,
      agentId: player?.actorId ?? "player",
      displayName: player?.actorName ?? "我",
      role: "player" as const,
      tone: "align" as const,
      content: `${player?.actorName ?? "我"}先接住对方的情绪，再继续推进自己的边界。`
    },
    ...(secondaryNpc
      ? [
          {
            lineId: `line-${String(turnIndex).padStart(3, "0")}-004`,
            sequence: 4,
            agentId: secondaryNpc.actorState.actorId,
            displayName: secondaryNpc.actorState.actorName,
            role: "npc" as const,
            tone:
              (secondaryNpc.seed?.behavior?.initiative ?? 50) > 62
                ? ("observe" as const)
                : ("retreat" as const),
            content:
              (secondaryNpc.seed?.behavior?.initiative ?? 50) > 62
                ? `${secondaryNpc.actorState.actorName}没有急着站队，只在观察谁会先让步。`
                : `${secondaryNpc.actorState.actorName}把话收住，没有继续把冲突往上抬。`
          }
        ]
      : []),
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-005`,
      sequence: secondaryNpc ? 5 : 4,
      agentId: "environment",
      displayName: "环境",
      role: "environment" as const,
      tone: "observe" as const,
      content: environmentText
    },
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-006`,
      sequence: secondaryNpc ? 6 : 5,
      agentId: player?.actorId ?? "player",
      displayName: player?.actorName ?? "我",
      role: "player" as const,
      tone: "retreat" as const,
      content: `${player?.actorName ?? "我"}为本轮暂时收口，但把下一轮的主动权留在手里。`
    }
  ];
}

function buildAdaptiveBeats(
  turnIndex: number,
  actionLabel: string,
  actorStates: Array<{ actorId: string; actorName: string }>,
  preparation?: {
    cast?: {
      player?: { behavior?: { aggression?: number; empathy?: number } };
      npcs?: Array<{
        agentId: string;
        behavior?: { aggression?: number; avoidance?: number; empathy?: number };
      }>;
    };
  }
) {
  const playerAggression = preparation?.cast?.player?.behavior?.aggression ?? 50;
  const playerEmpathy = preparation?.cast?.player?.behavior?.empathy ?? 50;
  const rankedNpc = actorStates
    .slice(1)
    .map((actorState) => ({
      actorState,
      seed: preparation?.cast?.npcs?.find((npc) => npc.agentId === actorState.actorId)
    }))
    .sort(
      (left, right) =>
        (right.seed?.behavior?.aggression ?? 50) +
          (right.seed?.behavior?.empathy ?? 50) -
        ((left.seed?.behavior?.aggression ?? 50) + (left.seed?.behavior?.empathy ?? 50))
    )[0];
  const conflictStyle = playerAggression > playerEmpathy ? "更直接的碰撞" : "带着克制的试探";
  const allianceSummary =
    (rankedNpc?.seed?.behavior?.avoidance ?? 50) > 60
      ? "旁观角色选择先收住，这给了对话继续推进的空间。"
      : "局面里仍保留着继续协商的缝隙，而不是彻底撕裂。";

  return [
    {
      beatId: `beat-${String(turnIndex).padStart(3, "0")}-001`,
      type: "conflict" as const,
      title: "第一轮正面碰撞",
      summary: `围绕“${actionLabel}”，玩家与${rankedNpc?.actorState.actorName ?? "对方"}发生了${conflictStyle}。`,
      agentIds: [actorStates[0]?.actorId ?? "player", rankedNpc?.actorState.actorId ?? "npc-primary"]
    },
    {
      beatId: `beat-${String(turnIndex).padStart(3, "0")}-002`,
      type: "alliance" as const,
      title: "第二轮保留对话",
      summary: allianceSummary,
      agentIds: [actorStates[0]?.actorId ?? "player"]
    },
    {
      beatId: `beat-${String(turnIndex).padStart(3, "0")}-003`,
      type: "retreat" as const,
      title: "第三轮暂时收束",
      summary: "本轮没有人真正离场，只是先停在还能继续演化的位置。",
      agentIds: actorStates.map((actor) => actor.actorId)
    }
  ];
}

function buildTurnDecisionPlan(
  actionLabel: string,
  actorStates: Array<{ actorId: string; actorName: string; currentState: string }>,
  preparation?: {
    cast?: {
      player?: { agentId?: string; behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number; compliance?: number } };
      npcs?: Array<{ agentId: string; behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number; compliance?: number } }>;
    };
  }
) {
  const seeds = {
    player: preparation?.cast?.player,
    npcs: preparation?.cast?.npcs ?? []
  };
  const roster = actorStates.map((actorState, index) => {
    const seed =
      index === 0
        ? seeds.player
        : seeds.npcs.find((npc) => npc.agentId === actorState.actorId);
    return {
      ...actorState,
      role: index === 0 ? ("player" as const) : ("npc" as const),
      initiative: seed?.behavior?.initiative ?? 50,
      aggression: seed?.behavior?.aggression ?? 50,
      avoidance: seed?.behavior?.avoidance ?? 50,
      empathy: seed?.behavior?.empathy ?? 50,
      compliance: seed?.behavior?.compliance ?? 50
    };
  });
  const basePlayer =
    roster[0] ?? {
      actorId: "player",
      actorName: "我",
      currentState: "",
      role: "player" as const,
      initiative: 50,
      aggression: 50,
      avoidance: 50,
      empathy: 50,
      compliance: 50
    };
  const ranked = [...roster].sort(
    (left, right) =>
      right.initiative + right.aggression - right.avoidance -
      (left.initiative + left.aggression - left.avoidance)
  );
  const lead = ranked[0] ?? basePlayer;
  const responder =
    ranked.find((actor) => actor.actorId !== lead.actorId) ?? basePlayer;
  const mediator =
    [...roster]
      .filter(
        (actor) =>
          actor.actorId !== lead.actorId && actor.actorId !== responder.actorId
      )
      .sort(
        (left, right) =>
          right.empathy + right.compliance - (left.empathy + left.compliance)
      )[0] ?? null;
  const player = basePlayer;
  const tensionScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (lead.aggression + responder.aggression) / 2 +
          (100 - ((lead.empathy + responder.empathy) / 2)) / 2 -
          ((mediator?.empathy ?? player?.empathy ?? 50) / 5)
      )
    )
  );
  const tensionBand =
    tensionScore >= 70 ? "high" : tensionScore >= 45 ? "mid" : "low";
  const allianceActor =
    mediator && mediator.empathy + mediator.compliance > 110 ? mediator : null;

  return {
    actionLabel,
    player,
    lead,
    responder,
    mediator,
    allianceActor,
    tensionScore,
    tensionBand
  };
}

function buildDecisionDrivenDialogue(
  turnIndex: number,
  actionLabel: string,
  actorStates: Array<{ actorId: string; actorName: string; currentState: string }>,
  environmentText: string,
  preparation?: {
    cast?: {
      player?: { behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number; compliance?: number } };
      npcs?: Array<{ agentId: string; behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number; compliance?: number } }>;
    };
  }
) {
  const plan = buildTurnDecisionPlan(actionLabel, actorStates, preparation);
  const round2Speaker = plan.allianceActor ?? plan.player;
  const closer = plan.tensionBand === "high" ? plan.player : plan.responder;
  const leadTone: "probe" | "align" =
    plan.lead.aggression > plan.lead.empathy ? "probe" : "align";
  const responderTone: "retreat" | "defend" =
    plan.responder.avoidance > plan.responder.aggression ? "retreat" : "defend";
  const round2Tone: "align" | "observe" =
    round2Speaker.actorId === plan.player.actorId ? "align" : "observe";
  const allianceTone: "align" | "observe" = plan.allianceActor ? "align" : "observe";
  const closerTone: "retreat" | "align" =
    plan.tensionBand === "high" ? "retreat" : "align";
  return [
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-001`,
      sequence: 1,
      agentId: plan.lead.actorId,
      displayName: plan.lead.actorName,
      role: plan.lead.role,
      tone: leadTone,
      content: `${plan.lead.actorName}先开口，把“${actionLabel}”直接推到台前。`
    },
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-002`,
      sequence: 2,
      agentId: plan.responder.actorId,
      displayName: plan.responder.actorName,
      role: plan.responder.role,
      tone: responderTone,
      content:
        plan.responder.avoidance > plan.responder.aggression
          ? `${plan.responder.actorName}没有硬顶，而是把话往回收，试图先保住自己的位置。`
          : `${plan.responder.actorName}立刻接招，想把节奏重新拉回自己能控制的范围。`
    },
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-003`,
      sequence: 3,
      agentId: round2Speaker.actorId,
      displayName: round2Speaker.actorName,
      role: round2Speaker.role,
      tone: round2Tone,
      content:
        round2Speaker.actorId === plan.player.actorId
          ? `${round2Speaker.actorName}先接住场上的情绪，再继续试探哪一条边界还可以往前推。`
          : `${round2Speaker.actorName}没有立刻站死立场，而是开始判断谁更值得暂时靠拢。`
    },
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-004`,
      sequence: 4,
      agentId: plan.allianceActor?.actorId ?? plan.player.actorId,
      displayName: plan.allianceActor?.actorName ?? plan.player.actorName,
      role: plan.allianceActor?.role ?? "player",
      tone: allianceTone,
      content: plan.allianceActor
        ? `${plan.allianceActor.actorName}给出有限支持，让局面没有立刻滑向彻底撕裂。`
        : `${plan.player.actorName}注意到场上暂时没人明确结盟，只能自己继续稳住局势。`
    },
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-005`,
      sequence: 5,
      agentId: "environment",
      displayName: "环境",
      role: "environment" as const,
      tone: "observe" as const,
      content: environmentText
    },
    {
      lineId: `line-${String(turnIndex).padStart(3, "0")}-006`,
      sequence: 6,
      agentId: closer.actorId,
      displayName: closer.actorName,
      role: closer.role,
      tone: closerTone,
      content:
        plan.tensionBand === "high"
          ? `${closer.actorName}先把这一轮收住，避免场面在此刻彻底失控。`
          : `${closer.actorName}没有结束对话，而是给下一轮留下了继续博弈的口子。`
    }
  ];
}

function buildDecisionDrivenBeats(
  turnIndex: number,
  actionLabel: string,
  actorStates: Array<{ actorId: string; actorName: string; currentState: string }>,
  preparation?: {
    cast?: {
      player?: { behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number; compliance?: number } };
      npcs?: Array<{ agentId: string; behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number; compliance?: number } }>;
    };
  }
) {
  const plan = buildTurnDecisionPlan(actionLabel, actorStates, preparation);
  return [
    {
      beatId: `beat-${String(turnIndex).padStart(3, "0")}-001`,
      type: "conflict" as const,
      title: "第一轮正面碰撞",
      summary: `${plan.lead.actorName}先起手，${plan.responder.actorName}随后正面接招，本轮冲突核心已经形成。`,
      agentIds: [plan.lead.actorId, plan.responder.actorId]
    },
    {
      beatId: `beat-${String(turnIndex).padStart(3, "0")}-002`,
      type: "alliance" as const,
      title: "第二轮重新站队",
      summary: plan.allianceActor
        ? `${plan.allianceActor.actorName}提供了有限支持，局面出现了临时同盟。`
        : "场上没有稳定同盟，但有人开始有意识地为下一轮保留余地。",
      agentIds: plan.allianceActor
        ? [plan.player.actorId, plan.allianceActor.actorId]
        : [plan.player.actorId]
    },
    {
      beatId: `beat-${String(turnIndex).padStart(3, "0")}-003`,
      type: "retreat" as const,
      title: "第三轮暂时收束",
      summary:
        plan.tensionBand === "high"
          ? "张力已经被推高，本轮以避免失控为主。"
          : "张力还在可控范围内，本轮只是临时收束，不是终局。",
      agentIds: actorStates.map((actor) => actor.actorId)
    }
  ];
}

function buildDecisionDrivenActions(
  seed: string,
  actionLabel: string,
  actorStates: Array<{ actorId: string; actorName: string; currentState: string }>,
  preparation?: {
    cast?: {
      player?: { behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number; compliance?: number } };
      npcs?: Array<{ agentId: string; behavior?: { initiative?: number; aggression?: number; avoidance?: number; empathy?: number; compliance?: number } }>;
    };
  }
): SimulationActionOption[] {
  const plan = buildTurnDecisionPlan(actionLabel, actorStates, preparation);
  if (plan.tensionBand === "high") {
    return [
      {
        actionId: `${seed}-cool`,
        label: "暂缓正面冲突",
        intent: "先压低张力，避免局面失控",
        riskHint: "可能被视为退让"
      },
      {
        actionId: `${seed}-buffer`,
        label: "拉旁人进场缓冲",
        intent: "引入第三方缓和对峙",
        riskHint: "可能让立场更复杂"
      }
    ];
  }

  if (plan.allianceActor) {
    return [
      {
        actionId: `${seed}-press`,
        label: "顺势推进条件",
        intent: "借临时同盟继续向前推进",
        riskHint: "可能逼出更强防御"
      },
      {
        actionId: `${seed}-probe`,
        label: "追问隐藏顾虑",
        intent: "趁局面未崩时逼近真实矛盾",
        riskHint: "可能打断临时同盟"
      }
    ];
  }

  return [
    {
      actionId: `${seed}-ally`,
      label: "争取旁观者表态",
      intent: "主动塑造下一轮站队",
      riskHint: "可能引发新的对立"
    },
    {
      actionId: `${seed}-hold`,
      label: "收束并保留余地",
      intent: "保住主动权，等待更合适的推进点",
      riskHint: "可能错失窗口"
    }
  ];
}

function createPlaceholderRuntimePorts(
  agentRuntime: PlaceholderAgentRuntime,
  options: {
    resolveCounselingKnowledgeSummary?: CounselingKnowledgeResolver;
  } = {}
): { counseling: CounselingRuntimePort; simulation: SimulationRuntimePort } {
  return {
    counseling: {
      async start(input) {
        const knowledgeSummary =
          (await options.resolveCounselingKnowledgeSummary?.(input.openingMessage)) ??
          null;
        const output = await agentRuntime.run({
          agentId: "counseling-placeholder",
          objective: input.openingMessage ?? "Begin counseling session",
          messages: prependCounselingKnowledgeMessage(
            input.openingMessage
              ? [{ role: "user", content: input.openingMessage }]
              : [],
            knowledgeSummary
          ),
          context: { workflow: "counseling", occurredAt: input.occurredAt }
        });

        return {
          analysis: {
            stage: "intake" as CounselingStage,
            summary: buildCounselingSummary(output.finalMessage.content),
            riskLevel: "low" as CounselingRiskLevel
          }
        };
      },
      async reply(input) {
        const knowledgeSummary =
          (await options.resolveCounselingKnowledgeSummary?.(input.message)) ?? null;
        const messages = prependCounselingKnowledgeMessage(
          [
            ...(input.history ?? []).map((turn) => ({
              role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
              content: turn.content
            })),
            { role: "user" as const, content: input.message }
          ],
          knowledgeSummary
        );

        const output = await agentRuntime.run({
          agentId: "counseling-placeholder",
          objective: "Reply to counseling message",
          messages,
          context: { workflow: "counseling", occurredAt: input.occurredAt }
        });

        return {
          analysis: {
            stage: "exploration" as CounselingStage,
            summary: buildCounselingSummary(output.finalMessage.content),
            riskLevel: "low" as CounselingRiskLevel
          },
          assistantMessage:
            output.finalMessage.content ??
            (knowledgeSummary
              ? `${knowledgeSummary}\n\n你可以先说说，最卡住你的那个瞬间具体发生了什么。`
              : "你可以再说说，那种反应通常会在什么前一刻开始出现？")
        };
      }
    },
    simulation: {
      async prepare(input) {
        return {
          summary: `${input.scenarioTitle} 的情境准备已完成。`
        };
      },
      async start(input) {
        const output = await agentRuntime.runMultiAgent({
          swarmId: input.scenarioId,
          objective: input.operatorNote ?? "Start simulation node",
          messages: [] as any[],
          context: { workflow: "simulation" as const, occurredAt: input.occurredAt },
          participants: (input.actorStates ?? []).map((actor) => ({
            agentId: actor.actorId,
            role: actor.actorName,
            objective: actor.currentState
          })) as any[]
        });

        return {
          actorStates: (input.actorStates ?? []).map((actor) => ({
            actorId: actor.actorId,
            actorName: actor.actorName,
            currentState: (output as any).participantMessages?.find((m: any) => m.name === actor.actorId)?.content ?? actor.currentState,
            updatedAt: input.occurredAt
          })),
          observation: buildSimulationNarrativeSnippet(
            (output as any).coordinatorMessage?.content ?? "",
            320,
            "当前节点已经开始推进，但还没有足够稳定的观察摘要。"
          ),
          activeOptions:
            input.activeOptions && input.activeOptions.length > 0
              ? input.activeOptions
              : createSimulationFallbackActions("real-start"),
          environmentState:
            input.preparation?.cast.environment.currentState ??
            (output as any).coordinatorMessage?.content ??
            "环境仍处于观察与施压并存的状态。"
        };
      },
      async advance(input) {
        const output = await agentRuntime.runMultiAgent({
          swarmId: input.runId,
          objective: "Advance simulation node",
          messages: [] as any[],
          context: { workflow: "simulation" as const, occurredAt: input.occurredAt },
          participants: (input.actorStates ?? []).map((actor) => ({
            agentId: actor.actorId,
            role: actor.actorName,
            objective: actor.currentState
          })) as any[]
        });

        return {
          actorStates: (input.actorStates ?? []).map((actor) => ({
            actorId: actor.actorId,
            actorName: actor.actorName,
            currentState: (output as any).participantMessages?.find((m: any) => m.name === actor.actorId)?.content ?? actor.currentState,
            updatedAt: input.occurredAt
          })),
          observation: (output as any).coordinatorMessage?.content ?? "",
          activeOptions:
            input.nextActionOptions && input.nextActionOptions.length > 0
              ? input.nextActionOptions
              : createSimulationFallbackActions(input.selectedBranchId),
          environmentState:
            (output as any).coordinatorMessage?.content ??
            `${input.nextNodeTitle} 让环境进入新的压力阶段。`,
          turnOutcome: {
            turnId: `turn-${String((input.currentTurnIndex ?? 0) + 1).padStart(3, "0")}`,
            turnIndex: (input.currentTurnIndex ?? 0) + 1,
            playerAction: {
              actionId: input.selectedAction?.actionId ?? input.selectedBranchId,
              label: input.selectedAction?.label ?? input.selectedBranchLabel,
              ...(input.rationale ? { rationale: input.rationale } : {})
            },
            dialogueSequence: buildDecisionDrivenDialogue(
              (input.currentTurnIndex ?? 0) + 1,
              input.selectedAction?.label ?? input.selectedBranchLabel,
              input.actorStates,
              (output as any).coordinatorMessage?.content ?? "环境继续放大本轮中的情绪与秩序压力。",
              input.preparation
            ),
            interactionBeats: buildDecisionDrivenBeats(
              (input.currentTurnIndex ?? 0) + 1,
              input.selectedAction?.label ?? input.selectedBranchLabel,
              input.actorStates,
              input.preparation
            ),
            npcReactions: (input.actorStates ?? []).slice(1).map((actor, index) => ({
              agentId: actor.actorId,
              displayName: actor.actorName,
              reactionType: index % 2 === 0 ? "speech" : "emotion",
              summary: `${actor.actorName} 对“${input.selectedAction?.label ?? input.selectedBranchLabel}”作出了新的回应。`,
              stateAfter:
                (output as any).participantMessages?.find((m: any) => m.name === actor.actorId)?.content ??
                actor.currentState
            })),
            environmentReaction: {
              summary:
                (output as any).coordinatorMessage?.content ??
                `${input.nextNodeTitle} 让环境压力发生了变化。`,
              stateAfter:
                (output as any).coordinatorMessage?.content ??
                `${input.nextNodeTitle} 让环境压力发生了变化。`
            },
            consequenceSummary:
              (output as any).coordinatorMessage?.content ??
              `玩家行动“${input.selectedAction?.label ?? input.selectedBranchLabel}”推动了局势变化。`,
            nextActionOptions:
              input.nextActionOptions && input.nextActionOptions.length > 0
                ? input.nextActionOptions
                : buildDecisionDrivenActions(
                    input.selectedBranchId,
                    input.selectedAction?.label ?? input.selectedBranchLabel,
                    input.actorStates,
                    input.preparation
                  ),
            actorStateChanges: (input.actorStates ?? []).map((actor) => ({
              agentId: actor.actorId,
              displayName: actor.actorName,
              beforeState: actor.currentState,
              afterState:
                (output as any).participantMessages?.find((m: any) => m.name === actor.actorId)?.content ??
                actor.currentState,
              summary: `${actor.actorName} 的状态被新的行动重新推了一步。`
            })),
            createdAt: input.occurredAt
          }
        };
      }
    }
  };
}

function createDeepSeekRuntimePorts(
  agentRuntime: DeepSeekLlmAdapter,
  options: {
    resolveCounselingKnowledgeSummary?: CounselingKnowledgeResolver;
  } = {}
): { counseling: CounselingRuntimePort; simulation: SimulationRuntimePort } {
  return {
    counseling: {
      async start(input) {
        const knowledgeSummary =
          (await options.resolveCounselingKnowledgeSummary?.(input.openingMessage)) ??
          null;
        const output = await agentRuntime.run({
          agentId: "counseling-deepseek",
          objective: "Open a counseling intake safely. Analyze the user's opening message for emotional tone, risk indicators, and suggest an appropriate intake stage. When relevant, absorb the local counseling references included in the conversation context before answering.",
          messages: prependCounselingKnowledgeMessage(
            input.openingMessage
              ? [{ role: "user", content: input.openingMessage }]
              : [],
            knowledgeSummary
          ),
          context: { workflow: "counseling", occurredAt: input.occurredAt }
        });

        const stage = inferCounselingStage(output.finalMessage.content);
        const riskLevel = inferRiskLevel(output.finalMessage.content);

        return {
          analysis: {
            stage,
            summary: buildCounselingSummary(output.finalMessage.content),
            riskLevel
          }
        };
      },
      async reply(input) {
        const knowledgeSummary =
          (await options.resolveCounselingKnowledgeSummary?.(input.message)) ?? null;
        const messages = prependCounselingKnowledgeMessage(
          [
            ...(input.history ?? []).map((turn) => ({
              role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
              content: turn.content
            })),
            { role: "user" as const, content: input.message }
          ],
          knowledgeSummary
        );

        const output = await agentRuntime.run({
          agentId: "counseling-deepseek",
          objective: "Continue the counseling conversation. Provide a supportive response, analyze the latest message, and determine the appropriate stage and risk level. When relevant, absorb the local counseling references included in the conversation context before answering.",
          messages,
          context: { workflow: "counseling", occurredAt: input.occurredAt }
        });

        const content = output.finalMessage.content;
        const stage = inferCounselingStage(content);
        const riskLevel = inferRiskLevel(content);

        return {
          analysis: { stage, summary: buildCounselingSummary(content), riskLevel },
          assistantMessage: extractAssistantMessage(content) ??
            "你可以再说说，那种反应通常会在什么前一刻开始出现？"
        };
      }
    },
    simulation: {
      async prepare(input) {
        return {
          summary: `${input.scenarioTitle} 的情境准备已通过 DeepSeek 初始化。`
        };
      },
      async start(input) {
        const output = await agentRuntime.run({
          agentId: "simulation-deepseek",
          objective: `Simulation scenario: ${input.scenarioTitle}. Current node: ${input.currentNodeTitle}. ${input.currentNodeSummary}. Analyze the scenario and actor states, and provide observations.`,
          messages: [
            ...(input.operatorNote ? [{ role: "user" as const, content: input.operatorNote }] : []),
            { role: "system" as const, content: `Actors: ${(input.actorStates ?? []).map((a) => `${a.actorName}: ${a.currentState}`).join("; ")}` }
          ],
          context: { workflow: "simulation", occurredAt: input.occurredAt }
        });

        return {
          actorStates: (input.actorStates ?? []).map((actor) => ({
            actorId: actor.actorId,
            actorName: actor.actorName,
            currentState: actor.currentState,
            updatedAt: input.occurredAt
          })),
          observation: buildSimulationNarrativeSnippet(
            output.finalMessage.content,
            320,
            "当前节点已经开始推进，但还没有足够稳定的观察摘要。"
          ),
          activeOptions:
            input.activeOptions && input.activeOptions.length > 0
              ? input.activeOptions
              : createSimulationFallbackActions("deepseek-start"),
          environmentState:
            input.preparation?.cast.environment.currentState ??
            buildSimulationNarrativeSnippet(
              output.finalMessage.content,
              180,
              "环境仍处在观察与施压并存的状态。"
            )
        };
      },
      async advance(input) {
        const output = await agentRuntime.run({
          agentId: "simulation-deepseek",
          objective: `Simulation advancing from "${input.previousNodeTitle}" to "${input.nextNodeTitle}" via branch "${input.selectedBranchLabel}". Analyze the transition and actor state changes.`,
          messages: [
            { role: "system" as const, content: `Previous node: ${input.previousNodeTitle}. Next node: ${input.nextNodeTitle}. Branch: ${input.selectedBranchLabel}. Actors: ${(input.actorStates ?? []).map((a) => `${a.actorName}: ${a.currentState}`).join("; ")}` },
            ...(input.rationale ? [{ role: "user" as const, content: input.rationale }] : [])
          ],
          context: { workflow: "simulation", occurredAt: input.occurredAt }
        });

        return {
          actorStates: (input.actorStates ?? []).map((actor) => ({
            actorId: actor.actorId,
            actorName: actor.actorName,
            currentState: actor.currentState,
            updatedAt: input.occurredAt
          })),
          observation: buildSimulationNarrativeSnippet(
            output.finalMessage.content,
            320,
            "本轮已经推进，但当前还没有稳定的整体观察摘要。"
          ),
          activeOptions:
            input.nextActionOptions && input.nextActionOptions.length > 0
              ? input.nextActionOptions
              : createSimulationFallbackActions(input.selectedBranchId),
          environmentState: buildSimulationNarrativeSnippet(
            output.finalMessage.content,
            180,
            `${input.nextNodeTitle} 让环境进入新的压力阶段。`
          ),
          turnOutcome: {
            turnId: `turn-${String((input.currentTurnIndex ?? 0) + 1).padStart(3, "0")}`,
            turnIndex: (input.currentTurnIndex ?? 0) + 1,
            playerAction: {
              actionId: input.selectedAction?.actionId ?? input.selectedBranchId,
              label: input.selectedAction?.label ?? input.selectedBranchLabel,
              ...(input.rationale ? { rationale: input.rationale } : {})
            },
            dialogueSequence: buildDecisionDrivenDialogue(
              (input.currentTurnIndex ?? 0) + 1,
              input.selectedAction?.label ?? input.selectedBranchLabel,
              input.actorStates,
              buildSimulationNarrativeSnippet(
                output.finalMessage.content,
                140,
                "环境继续放大本轮中的情绪与秩序压力。"
              ),
              input.preparation
            ),
            interactionBeats: buildDecisionDrivenBeats(
              (input.currentTurnIndex ?? 0) + 1,
              input.selectedAction?.label ?? input.selectedBranchLabel,
              input.actorStates,
              input.preparation
            ),
            npcReactions: (input.actorStates ?? []).slice(1).map((actor, index) => ({
              agentId: actor.actorId,
              displayName: actor.actorName,
              reactionType: index % 2 === 0 ? "speech" : "emotion",
              summary: buildSimulationNarrativeSnippet(
                output.finalMessage.content,
                200,
                `围绕“${input.selectedAction?.label ?? input.selectedBranchLabel}”产生了新的回应。`
              ),
              stateAfter: actor.currentState
            })),
            environmentReaction: {
              summary: buildSimulationNarrativeSnippet(
                output.finalMessage.content,
                200,
                `围绕“${input.selectedAction?.label ?? input.selectedBranchLabel}”产生了新的回应。`
              ),
              stateAfter: buildSimulationNarrativeSnippet(
                output.finalMessage.content,
                180,
                `${input.nextNodeTitle} 让环境进入新的压力阶段。`
              )
            },
            consequenceSummary: buildSimulationNarrativeSnippet(
              output.finalMessage.content,
              240,
              `玩家行动“${input.selectedAction?.label ?? input.selectedBranchLabel}”推动了局势变化。`
            ),
            nextActionOptions:
              input.nextActionOptions && input.nextActionOptions.length > 0
                ? input.nextActionOptions
                : buildDecisionDrivenActions(
                    input.selectedBranchId,
                    input.selectedAction?.label ?? input.selectedBranchLabel,
                    input.actorStates,
                    input.preparation
                  ),
            actorStateChanges: (input.actorStates ?? []).map((actor) => ({
              agentId: actor.actorId,
              displayName: actor.actorName,
              beforeState: actor.currentState,
              afterState: actor.currentState,
              summary: `${actor.actorName} 的后续状态需要结合下一轮继续判断。`
            })),
            createdAt: input.occurredAt
          }
        };
      }
    }
  };
}

function inferCounselingStage(content: string): CounselingStage {
  const lower = content.toLowerCase();
  if (lower.includes("intake") || lower.includes("initial")) return "intake";
  if (lower.includes("closure") || lower.includes("closing") || lower.includes("finish")) return "closure";
  if (lower.includes("reflect")) return "reflection";
  return "exploration";
}

function inferRiskLevel(content: string): CounselingRiskLevel {
  const lower = content.toLowerCase();
  if (lower.includes("urgent") || lower.includes("crisis") || lower.includes("immediate danger")) return "urgent";
  if (lower.includes("high risk") || lower.includes("severe") || lower.includes("escalat")) return "high";
  if (lower.includes("moderate") || lower.includes("elevated")) return "moderate";
  return "low";
}

function extractAssistantMessage(content: string): string | undefined {
  const match = content.match(/ASSISTANT:\s*(.+?)(?:\n|$)/is);
  if (match?.[1]) return match[1].trim();
  if (content.length <= 500) return content.trim();
  return undefined;
}

function buildCounselingSummary(content: string, maxLength = 320): string {
  const preferred =
    extractLabeledSummary(content) ??
    extractAssistantMessage(content) ??
    content;
  const cleaned = normalizeCounselingSummaryText(preferred);

  if (!cleaned) {
    return "咨询摘要暂未生成。";
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const clipped = cleaned.slice(0, maxLength);
  const sentenceBoundary = findLastSentenceBoundary(clipped);
  if (sentenceBoundary >= Math.floor(maxLength * 0.45)) {
    return cleaned.slice(0, sentenceBoundary).trim();
  }

  const softBoundary = Math.max(
    clipped.lastIndexOf("\n"),
    clipped.lastIndexOf(" "),
    clipped.lastIndexOf("，"),
    clipped.lastIndexOf("、"),
    clipped.lastIndexOf(",")
  );
  if (softBoundary >= Math.floor(maxLength * 0.6)) {
    return `${cleaned.slice(0, softBoundary).trim()}...`;
  }

  return `${clipped.trim()}...`;
}

function extractLabeledSummary(content: string): string | undefined {
  const match = content.match(/(?:SUMMARY|摘要|会话摘要)\s*[:：]\s*(.+?)(?:\n|$)/i);
  return match?.[1]?.trim() || undefined;
}

function normalizeCounselingSummaryText(content: string): string {
  return content
    .replace(/^\[[^\]]+\]\s*/u, "")
    .replace(/^(?:ASSISTANT|ANALYSIS|SUMMARY|摘要|会话摘要)\s*[:：]\s*/giu, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findLastSentenceBoundary(value: string): number {
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const char = value[index];
    if (char && /[。！？!?；;]/u.test(char)) {
      return index + 1;
    }
  }

  return -1;
}

// ---------------------------------------------------------------------------
// Options & return type
// ---------------------------------------------------------------------------

export interface RealBackendAssemblyOptions {
  dataDirectory?: string;
  database?: SqliteDatabase;
  now?: () => string;
  settingsStore?: AppSettingsStore;
  bootstrapOverrides?: AppBootstrapStatePatch;
  fixtures?: Partial<FakeBackendAssemblyFixtures>;
  provider?: "fake" | "deepseek";
  deepseekApiKey?: string;
  deepseekOptions?: DeepSeekLlmAdapterOptions;
}

export interface RealBackendAssembly {
  bootstrapState: AppBootstrapState;
  settingsStore: AppSettingsStore;
  database: SqliteDatabase | null;
  controllers: {
    counseling: CounselingController;
    simulation: SimulationController;
    resonance: ResonanceController;
    reporting: ReportingController;
  };
  fixtures: {
    simulation: {
      scenarioId: string;
      entryBranchId: string;
      completionBranchId: string;
    };
    resonance: {
      candidateSetId: string;
      catalog: PlaceholderVectorDocument[];
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
  catalog: readonly PlaceholderVectorDocument[]
): PlaceholderVectorDocument[] {
  return catalog.map((item) => structuredClone(item));
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function createRealBackendAssembly(
  options: RealBackendAssemblyOptions = {}
): Promise<RealBackendAssembly> {
  const now = options.now ?? (() => new Date().toISOString());
  const dataDirectory = options.dataDirectory ?? "data";
  const defaultProvider = options.provider === "deepseek" ? "deepseek" : "local-default";
  const defaultModelId =
    options.provider === "deepseek"
      ? options.deepseekOptions?.model ?? "deepseek-v4-flash"
      : "psyai-default";
  await createDataDirectoryLayout(dataDirectory);

  const database =
    options.database ??
    new SqliteDatabase({ filePath: `${dataDirectory}/db/psyai.db` });
  await database.open();

  const settingsStore =
    options.settingsStore ??
    (new SqliteAppSettingsStore({
      database,
      defaults: {
        theme: "system",
        language: "zh-CN",
        workspaceRoot: "src",
        dataRoot: dataDirectory,
        exportDirectory: "exports",
        modelSelection: { provider: defaultProvider, modelId: defaultModelId }
      }
    }) as unknown as AppSettingsStore);
  SqliteAppSettingsStore.ensureSchema(database);

  const bootstrapState = await createBackendAppBootstrapState({
    settingsStore,
    ...(options.bootstrapOverrides
      ? { bootstrapOverrides: options.bootstrapOverrides }
      : {})
  });

  const reportRegistry = new SqliteReportRegistry({ database });
  SqliteReportRegistry.ensureSchema(database);

  const reporting = createReportingModule({
    registry: reportRegistry as any,
    now
  });

  const useDeepSeek = options.provider === "deepseek";
  let runtimePorts: { counseling: CounselingRuntimePort; simulation: SimulationRuntimePort };
  let resonanceAnalysisPort = createHeuristicResonanceAnalysisPort();
  let resonanceComparisonExplainerPort =
    createHeuristicResonanceComparisonExplainerPort();
  const counselingKnowledgeManifest = await loadKnowledgeManifest(
    dataDirectory,
    "counseling"
  );
  const resonanceKnowledgeManifest = await loadKnowledgeManifest(
    dataDirectory,
    "resonance"
  );
  const resolveCounselingKnowledgeSummary = createCounselingKnowledgeResolver(
    counselingKnowledgeManifest
  );

  if (useDeepSeek) {
    const adapterOptions: DeepSeekLlmAdapterOptions = {};
    if (options.deepseekApiKey) adapterOptions.apiKey = options.deepseekApiKey;
    if (options.deepseekOptions) Object.assign(adapterOptions, options.deepseekOptions);
    const deepseekAdapter = new DeepSeekLlmAdapter(adapterOptions);
    const deepSeekResonanceAnalysisPort = createDeepSeekResonanceAnalysisPort(
      deepseekAdapter
    );
    const deepSeekResonanceComparisonExplainerPort =
      createDeepSeekResonanceComparisonExplainerPort(deepseekAdapter);
    runtimePorts = createDeepSeekRuntimePorts(deepseekAdapter, resolveCounselingKnowledgeSummary
      ? { resolveCounselingKnowledgeSummary }
      : {});
    resonanceAnalysisPort = deepSeekResonanceAnalysisPort;
    resonanceComparisonExplainerPort = deepSeekResonanceComparisonExplainerPort;
  } else {
    const agentRuntime = new PlaceholderAgentRuntime({ providerLabel: "real-placeholder" });
    runtimePorts = createPlaceholderRuntimePorts(agentRuntime, resolveCounselingKnowledgeSummary
      ? { resolveCounselingKnowledgeSummary }
      : {});
  }

  const counselingRepository = new SqliteCounselingRepository({ database });
  SqliteCounselingRepository.ensureSchema(database);
  const counselingUseCases = createCounselingUseCases({
    repository: counselingRepository as any,
    workflow: createCounselingWorkflowAdapter(runtimePorts.counseling),
    reportPort: reporting.counselingPort,
    now
  });

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
  const entryBranchId =
    simulationScenario.nodes.find((n) => n.nodeId === simulationScenario.entryNodeId)
      ?.branches[0]?.branchId ?? "branch-001";
  const completionBranchId =
    simulationScenario.nodes.find((n) => n.nodeId !== simulationScenario.entryNodeId && n.branches.length > 0)
      ?.branches[0]?.branchId ?? "branch-002";

  const simulationRepository = new SqliteSimulationRepository({ database });
  SqliteSimulationRepository.ensureSchema(database);
  for (const scenario of simulationScenarios) {
    await (simulationRepository as any).saveScenario(scenario);
  }

  const simulationUseCases = createSimulationUseCases({
    repository: simulationRepository as any,
    workflow: createSimulationWorkflowAdapter(runtimePorts.simulation),
    reportPort: reporting.simulationPort,
    now
  });

  const fixtureResonanceCatalog = cloneCatalog(
    options.fixtures?.resonanceCatalog ??
      (defaultFakeBackendAssemblyFixtures.resonanceCatalog as unknown as PlaceholderVectorDocument[])
  );
  const indexedResonanceCatalog = createResonanceKnowledgeCatalog(
    resonanceKnowledgeManifest
  );
  const resonanceCatalog =
    indexedResonanceCatalog.length > 0
      ? indexedResonanceCatalog
      : fixtureResonanceCatalog;
  const candidateSetId =
    indexedResonanceCatalog.length > 0
      ? "knowledge-resonance"
      : resonanceCatalog[0]?.candidateSetId ?? "family-set";

  const resonanceRepository = new SqliteResonanceRepository({ database });
  SqliteResonanceRepository.ensureSchema(database);

  const resonanceRetrieval = new PlaceholderVectorStore(resonanceCatalog);
  const resonanceUseCases = createResonanceUseCases({
    repository: resonanceRepository as any,
    workflow: createResonanceRetrievalAdapter({
      retrieval: resonanceRetrieval as any,
      explainer: resonanceComparisonExplainerPort
    }),
    analysisPort: resonanceAnalysisPort,
    reportPort: reporting.resonancePort,
    now
  });

  return {
    bootstrapState,
    settingsStore: settingsStore as AppSettingsStore,
    database,
    controllers: {
      counseling: createCounselingController({ useCases: counselingUseCases, now }),
      simulation: createSimulationController({ useCases: simulationUseCases, now }),
      resonance: createResonanceController({ useCases: resonanceUseCases, now }),
      reporting: reporting.controller
    },
    fixtures: {
      simulation: { scenarioId: simulationScenario.scenarioId, entryBranchId, completionBranchId },
      resonance: { candidateSetId, catalog: cloneCatalog(resonanceCatalog) }
    }
  };
}
