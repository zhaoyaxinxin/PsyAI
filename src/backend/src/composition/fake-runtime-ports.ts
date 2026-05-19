import type { CounselingAnalysis } from "@psyai/contracts";
import type { CounselingRuntimePort } from "@psyai/counseling";
import type {
  SimulationActionOption,
  SimulationRuntimePort
} from "@psyai/simulation";
import {
  createDefaultFakePromptPacks,
  createFakeCounselingWorkflow,
  createFakeSimulationWorkflow,
  FakeAgentRuntime,
  FakeAnalysisNormalizer,
  InMemoryPromptAssetLoader
} from "@psyai/runtime";

type CounselingStage = CounselingAnalysis["stage"];
type CounselingRiskLevel = CounselingAnalysis["riskLevel"];

function inferCounselingStage(schemaId: string): CounselingStage {
  if (schemaId.includes("reply")) {
    return "exploration";
  }

  return "intake";
}

function inferCounselingRiskLevel(warningCount: number): CounselingRiskLevel {
  return warningCount > 0 ? "moderate" : "low";
}

function toCounselingAnalysis(
  summary: string,
  schemaId: string,
  warningCount: number
): CounselingAnalysis {
  return {
    stage: inferCounselingStage(schemaId),
    summary,
    riskLevel: inferCounselingRiskLevel(warningCount)
  };
}

function createFallbackActions(seed: string): SimulationActionOption[] {
  return [
    {
      actionId: `${seed}-reflect`,
      label: "先稳住局面再回应",
      intent: "延缓直接冲突，继续观察场上变化",
      riskHint: "可能被他人理解为暂时回避"
    },
    {
      actionId: `${seed}-probe`,
      label: "追问对方真正担心什么",
      intent: "把表面冲突拉向更具体的动机",
      riskHint: "可能让对方短时更防御"
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
      agentIds: actorStates.map((actorState) => actorState.actorId)
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
      agentIds: actorStates.map((actorState) => actorState.actorId)
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

export interface FakeAssemblyRuntimePorts {
  counseling: CounselingRuntimePort;
  simulation: SimulationRuntimePort;
  support: {
    agentRuntime: FakeAgentRuntime;
    normalizer: FakeAnalysisNormalizer;
    promptLoader: InMemoryPromptAssetLoader;
  };
}

export function createFakeAssemblyRuntimePorts(): FakeAssemblyRuntimePorts {
  const promptLoader = new InMemoryPromptAssetLoader(createDefaultFakePromptPacks());
  const agentRuntime = new FakeAgentRuntime();
  const normalizer = new FakeAnalysisNormalizer();
  const counselingWorkflow = createFakeCounselingWorkflow({
    agentRuntime,
    promptLoader,
    normalizer
  });
  const simulationWorkflow = createFakeSimulationWorkflow({
    agentRuntime,
    promptLoader,
    normalizer
  });

  return {
    counseling: {
      async start(input) {
        const output = await counselingWorkflow.start(input);
        return {
          analysis: toCounselingAnalysis(
            output.analysis.summary,
            output.analysis.schemaId,
            output.analysis.warnings.length
          )
        };
      },
      async reply(input) {
        const output = await counselingWorkflow.reply({
          history: input.history.map((turn) => ({
            role: turn.role === "assistant" ? "assistant" : "user",
            message: turn.content,
            occurredAt: turn.createdAt
          })),
          message: input.message,
          occurredAt: input.occurredAt
        });

        return {
          analysis: toCounselingAnalysis(
            output.analysis.summary,
            output.analysis.schemaId,
            output.analysis.warnings.length
          ),
          assistantMessage:
            output.assistantMessage ??
            "Can you describe what tends to happen right before that reaction starts?"
        };
      }
    },
    simulation: {
      async prepare(input) {
        return {
          summary: `${input.scenarioTitle} 的角色与环境准备阶段已完成。`
        };
      },
      async start(input) {
        const output = await simulationWorkflow.start({
          ...input,
          actorStates: input.actorStates.map((actorState) => ({
            actorId: actorState.actorId,
            actorName: actorState.actorName,
            currentState: actorState.currentState
          }))
        });

        return {
          ...(output.actorStates
            ? {
                actorStates: output.actorStates.map((actorState) => ({
                  actorId: actorState.actorId,
                  actorName: actorState.actorName,
                  currentState: actorState.currentState,
                  updatedAt: input.occurredAt
                }))
              }
            : {}),
          ...(output.observation ? { observation: output.observation } : {}),
          activeOptions:
            input.activeOptions && input.activeOptions.length > 0
              ? input.activeOptions
              : createFallbackActions("sim-start"),
          environmentState:
            input.preparation?.cast.environment.currentState ??
            output.observation ??
            "环境仍处于高压观察状态。"
        };
      },
      async advance(input) {
        const output = await simulationWorkflow.advance({
          ...input,
          actorStates: input.actorStates.map((actorState) => ({
            actorId: actorState.actorId,
            actorName: actorState.actorName,
            currentState: actorState.currentState
          }))
        });

        return {
          ...(output.actorStates
            ? {
                actorStates: output.actorStates.map((actorState) => ({
                  actorId: actorState.actorId,
                  actorName: actorState.actorName,
                  currentState: actorState.currentState,
                  updatedAt: input.occurredAt
                }))
              }
            : {}),
          ...(output.observation ? { observation: output.observation } : {}),
          activeOptions:
            input.nextActionOptions && input.nextActionOptions.length > 0
              ? input.nextActionOptions
              : createFallbackActions(input.selectedBranchId),
          environmentState:
            output.observation ?? `${input.nextNodeTitle} 让环境压力进入新阶段。`,
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
              output.observation ?? "环境压力没有退去，而是继续放大所有人的表态。",
              input.preparation
            ),
            interactionBeats: buildDecisionDrivenBeats(
              (input.currentTurnIndex ?? 0) + 1,
              input.selectedAction?.label ?? input.selectedBranchLabel,
              input.actorStates,
              input.preparation
            ),
            npcReactions: input.actorStates.slice(1).map((actorState, index) => ({
              agentId: actorState.actorId,
              displayName: actorState.actorName,
              reactionType: index % 2 === 0 ? "speech" : "emotion",
              summary: `${actorState.actorName} 对“${input.selectedAction?.label ?? input.selectedBranchLabel}”调整了自己的回应。`,
              stateAfter:
                output.actorStates?.find((candidate) => candidate.actorId === actorState.actorId)
                  ?.currentState ?? actorState.currentState
            })),
            environmentReaction: {
              summary: output.observation ?? `${input.nextNodeTitle} 让旧场景中的张力发生了变化。`,
              stateAfter: output.observation ?? `${input.nextNodeTitle} 让旧场景中的张力发生了变化。`
            },
            consequenceSummary:
              output.observation ?? `玩家的行动“${input.selectedAction?.label ?? input.selectedBranchLabel}”推动了局势变化。`,
            nextActionOptions:
              input.nextActionOptions && input.nextActionOptions.length > 0
                ? input.nextActionOptions
                : buildDecisionDrivenActions(
                    input.selectedBranchId,
                    input.selectedAction?.label ?? input.selectedBranchLabel,
                    input.actorStates,
                    input.preparation
                  ),
            actorStateChanges: input.actorStates.map((actorState) => {
              const nextState =
                output.actorStates?.find((candidate) => candidate.actorId === actorState.actorId)
                  ?.currentState ?? actorState.currentState;
              return {
                agentId: actorState.actorId,
                displayName: actorState.actorName,
                beforeState: actorState.currentState,
                afterState: nextState,
                summary: `${actorState.actorName} 的状态从“${actorState.currentState}”推进到“${nextState}”。`
              };
            }),
            createdAt: input.occurredAt
          }
        };
      }
    },
    support: {
      agentRuntime,
      normalizer,
      promptLoader
    }
  };
}
