import React, { useEffect, useMemo, useState } from "react";
import type { SimulationRoutePageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler } from "../navigation.js";
import type { UiHostAction } from "../host-action.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";
import { ErrorBanner } from "../shared/ErrorBanner.js";

interface PrepareDraftNpc {
  displayName: string;
  identity: string;
  publicGoal: string;
  currentState: string;
}

interface PrepareDraft {
  playerName: string;
  playerIdentity: string;
  playerGoal: string;
  playerState: string;
  npcs: PrepareDraftNpc[];
  environmentName: string;
  environmentLocation: string;
  environmentPressure: string;
  environmentState: string;
  sourceNotesText: string;
  operatorNote: string;
}

function createEmptyNpcDraft(index: number): PrepareDraftNpc {
  return {
    displayName: `新增角色${index + 1}`,
    identity: "",
    publicGoal: "",
    currentState: ""
  };
}

const playerIdentitySeeds = [
  "久未回家的晚辈",
  "被旧关系重新卷回现场的人",
  "表面克制但内里持续绷紧的当事人"
];

const playerGoalSeeds = [
  "先稳住场面，再决定是否表态",
  "避免被长辈带着节奏走",
  "先听清真正的压力源，再回应"
];

const playerStateSeeds = [
  "一边观察气氛，一边压着情绪。",
  "看起来平静，但正在快速权衡后果。",
  "意识到今晚任何一句话都会被放大。"
];

const npcIdentitySeeds = [
  "家中强势长辈",
  "在旁观望但会适时施压的亲属",
  "表面圆场、实则推动表态的人"
];

const npcGoalSeeds = [
  "尽快逼出明确态度",
  "维持家族秩序与体面",
  "把对话拉回自己熟悉的权力位置",
  "确认你是否还愿意留在这套关系里"
];

const npcStateSeeds = [
  "语气强硬，正在观察你的退让空间。",
  "看似镇定，但对局势失控很敏感。",
  "已经准备顺势加码，逼你回应。"
];

const environmentLocationSeeds = [
  "旧院回廊",
  "偏厅茶桌旁",
  "夜雨未停的祖宅屋檐下"
];

const environmentPressureSeeds = [
  "长幼秩序、夜深雨声、多人围观",
  "沉默旁听的亲属与未说开的旧账",
  "场面体面要求与个人情绪冲突"
];

const environmentStateSeeds = [
  "空气发紧，任何停顿都会被误读。",
  "表面安静，实际每个人都在等你先开口。",
  "压力没有显性爆发，但已经开始朝你聚焦。"
];

const playerPresetSeeds = [
  {
    identity: "多年离家后再度回到旧关系现场的人",
    goal: "先稳住场面，再判断今晚值不值得说开",
    state: "表面平静，实际上已经开始预判每句话的后果。"
  },
  {
    identity: "夹在长辈期待与自我边界之间的晚辈",
    goal: "不被强行逼表态，同时保留继续对话的余地",
    state: "知道压力会继续升高，但还不想马上失控。"
  },
  {
    identity: "被旧账重新拉回现场的当事人",
    goal: "先听清对方到底要什么，再决定怎么回应",
    state: "对气氛高度敏感，任何细节都可能触发防御。"
  }
];

const npcPresetSeeds = [
  {
    identity: "家中强势长辈",
    goal: "尽快拿到明确态度",
    state: "已经把话锋架好，准备一步步逼近。"
  },
  {
    identity: "表面缓和、实则不断施压的亲属",
    goal: "维持秩序，也维持自己在场面里的权威",
    state: "看似在圆场，实际上在等你露出破绽。"
  },
  {
    identity: "沉默旁观但会在关键处补刀的人",
    goal: "让局势朝自己更熟悉的方向滑回去",
    state: "暂时不抢话，但已经在选择什么时候插手。"
  }
];

const environmentPresetSeeds = [
  {
    location: "夜雨未停的旧院回廊",
    pressure: "长幼秩序、深夜围观、旧账未清",
    state: "空气发紧，沉默本身也会变成一种表态。"
  },
  {
    location: "祖宅偏厅与茶桌之间",
    pressure: "体面要求、长辈试探、旁人注视",
    state: "看似没人逼你，但所有目光都在等你先开口。"
  },
  {
    location: "灯光昏黄的屋檐内侧",
    pressure: "夜深、雨声、被放大的旧关系张力",
    state: "情绪还没爆发，但局势已经开始朝你收拢。"
  }
];

function sampleSeed<TValue>(values: readonly TValue[], offset = 0): TValue {
  return values[(Math.floor(Math.random() * values.length) + offset) % values.length] as TValue;
}

function sanitizeDisplayText(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/gu, "$1")
    .replace(/__(.*?)__/gu, "$1")
    .replace(/\*\*/gu, "")
    .replace(/__/gu, "")
    .trim();
}

function fillIfEmpty(current: string, next: string): string {
  return current.trim().length > 0 ? current : next;
}

function getNodeKindLabel(kind: string): string {
  switch (kind) {
    case "entry":
      return "起点";
    case "decision":
      return "抉择";
    case "event":
      return "事件";
    case "ending":
      return "结局";
    case "current":
      return "当前";
    default:
      return kind;
  }
}

function getStageLabel(stage: SimulationRoutePageViewModel["stage"]): string {
  switch (stage) {
    case "prepare":
      return "准备";
    case "turn":
      return "回合";
    case "outcome":
      return "结果";
    case "completed":
      return "完成";
    default:
      return stage;
  }
}

function getNodeY(index: number): number {
  const pattern = [260, 390, 250, 420, 300, 470];
  return pattern[index % pattern.length] ?? 320;
}

function createPrepareDraft(vm: SimulationRoutePageViewModel): PrepareDraft {
  return {
    playerName: vm.preparation?.player.displayName ?? "我",
    playerIdentity: vm.preparation?.player.identity ?? "",
    playerGoal: vm.preparation?.player.publicGoal ?? vm.opening.playerGoal,
    playerState: vm.preparation?.player.currentState ?? "",
    npcs:
      vm.preparation?.npcs.map((npc) => ({
        displayName: npc.displayName,
        identity: npc.identity,
        publicGoal: npc.publicGoal,
        currentState: npc.currentState
      })) ?? [],
    environmentName: vm.preparation?.environment.displayName ?? "情境环境",
    environmentLocation: vm.preparation?.environment.location ?? "",
    environmentPressure: vm.preparation?.environment.pressureSource ?? "",
    environmentState: vm.preparation?.environment.currentState ?? "",
    sourceNotesText: vm.preparation?.sourceNotes.join("\n") ?? "",
    operatorNote: ""
  };
}

function toSourceNotes(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function withOptionalText<TObject extends Record<string, string>>(
  value: TObject
): Partial<TObject> {
  const next: Partial<TObject> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const trimmed = rawValue.trim();
    if (trimmed.length > 0) {
      next[key as keyof TObject] = trimmed as TObject[keyof TObject];
    }
  }
  return next;
}

export const SimulationRouteScene: React.FC<{
  vm: SimulationRoutePageViewModel;
  onNavigate?: AppNavigateHandler;
  onAction?: (action: UiHostAction) => Promise<void> | void;
}> = ({ vm, onNavigate, onAction }) => {
  const navigate = onNavigate ?? (() => {});
  const dispatch = onAction ?? (() => {});
  const [activeNodeId, setActiveNodeId] = useState(
    vm.routeNodes.find((node) => node.isCurrent)?.routeEntryId ?? vm.currentNode.nodeId
  );
  const [prepareDraft, setPrepareDraft] = useState<PrepareDraft>(() => createPrepareDraft(vm));
  const [customActionText, setCustomActionText] = useState("");

  useEffect(() => {
    setActiveNodeId(vm.routeNodes.find((node) => node.isCurrent)?.routeEntryId ?? vm.currentNode.nodeId);
  }, [vm.currentNode.nodeId, vm.routeNodes]);

  useEffect(() => {
    setPrepareDraft((current) => {
      const next = createPrepareDraft(vm);
      return {
        ...next,
        sourceNotesText:
          current.sourceNotesText.trim().length > 0
            ? current.sourceNotesText
            : next.sourceNotesText,
        operatorNote: current.operatorNote
      };
    });
  }, [vm.prepareId, vm.stage, vm.preparation, vm.opening.playerGoal]);

  useEffect(() => {
    setCustomActionText("");
  }, [vm.currentTurnIndex, vm.stage, vm.runId]);

  const boardNodes = useMemo(() => {
    const currentIndex = vm.routeNodes.findIndex((node) => node.isCurrent);
    return vm.routeNodes.map((node, index) => ({
      ...node,
      x: 220 + index * 300,
      y: getNodeY(index),
      order: index + 1,
      boardState:
        node.isCurrent ? "current" : currentIndex >= 0 && index < currentIndex ? "visited" : "future"
    }));
  }, [vm.routeNodes]);

  const boardLinks = useMemo(() => {
    return boardNodes.reduce<
      Array<{
        from: { x: number; y: number; nodeId: string };
        to: { x: number; y: number; nodeId: string };
        state: "visited" | "current" | "future";
      }>
    >((links, node, index) => {
      if (index === 0) {
        return links;
      }
      const previous = boardNodes[index - 1];
      if (!previous) {
        return links;
      }
      links.push({
        from: { x: previous.x, y: previous.y, nodeId: previous.nodeId },
        to: { x: node.x, y: node.y, nodeId: node.nodeId },
        state:
          node.boardState === "current"
            ? "current"
            : node.boardState === "visited"
              ? "visited"
              : "future"
      });
      return links;
    }, []);
  }, [boardNodes]);

  const activeBoardNode =
    boardNodes.find((node) => node.routeEntryId === activeNodeId) ??
    boardNodes.find((node) => node.isCurrent) ??
    boardNodes[0] ??
    null;
  const activeBoardNodeIndex = activeBoardNode
    ? boardNodes.findIndex((node) => node.routeEntryId === activeBoardNode.routeEntryId)
    : -1;
  const progressValue =
    activeBoardNodeIndex >= 0 ? `${activeBoardNodeIndex + 1}/${boardNodes.length}` : `0/${boardNodes.length}`;
  const upcomingNodes =
    activeBoardNodeIndex >= 0 ? boardNodes.slice(activeBoardNodeIndex + 1, activeBoardNodeIndex + 3) : [];
  const boardWidth = Math.max(1600, 460 + boardNodes.length * 300);
  const boardShift = activeBoardNode
    ? Math.max(Math.min(460 - activeBoardNode.x, -40), -(boardWidth - 960))
    : -40;

  const drawCurve = (from: { x: number; y: number }, to: { x: number; y: number }): string => {
    const dx = to.x - from.x;
    const cp1x = from.x + dx * 0.38;
    const cp2x = to.x - dx * 0.38;
    return `M ${from.x} ${from.y} C ${cp1x} ${from.y}, ${cp2x} ${to.y}, ${to.x} ${to.y}`;
  };

  const errorBanner =
    vm.status.status === "error" ? (
      <ErrorBanner message={vm.status.message ?? "情境模拟加载失败"} retryAction={vm.actions.retry} />
    ) : null;
  const isBusy = vm.status.status === "loading" || vm.status.status === "streaming";
  const loadingLabel =
    vm.stage === "prepare"
      ? "正在装配角色与环境…"
      : vm.stage === "turn"
        ? "正在推演本轮行动…"
        : "正在整理当前结果…";

  const editableNpcProfiles = prepareDraft.npcs
    .map((npc) =>
      withOptionalText({
        displayName: npc.displayName,
        identity: npc.identity,
        publicGoal: npc.publicGoal,
        currentState: npc.currentState
      })
    )
    .filter((npc) => Object.keys(npc).length > 0);

  const buildPrepareAction = (): UiHostAction => ({
    type: "simulation.prepare",
    request: {
      ...(prepareDraft.playerName.trim()
        ? { playerName: prepareDraft.playerName.trim() }
        : {}),
      playerProfile: withOptionalText({
        identity: prepareDraft.playerIdentity,
        publicGoal: prepareDraft.playerGoal,
        currentState: prepareDraft.playerState
      }),
      npcProfiles: editableNpcProfiles,
      environmentProfile: withOptionalText({
        displayName: prepareDraft.environmentName,
        location: prepareDraft.environmentLocation,
        pressureSource: prepareDraft.environmentPressure,
        currentState: prepareDraft.environmentState
      }),
      ...(toSourceNotes(prepareDraft.sourceNotesText).length > 0
        ? { sourceNotes: toSourceNotes(prepareDraft.sourceNotesText) }
        : {}),
      ...(prepareDraft.operatorNote.trim()
        ? { operatorNote: prepareDraft.operatorNote.trim() }
        : {})
    }
  });

  const handlePrepare = async () => {
    if (isBusy) {
      return;
    }
    await dispatch(buildPrepareAction());
  };

  const handleRandomFill = async () => {
    if (isBusy) {
      return;
    }
    await dispatch({
      type: "simulation.randomizePrepare",
      request: {
        ...(prepareDraft.playerName.trim()
          ? { playerName: prepareDraft.playerName.trim() }
          : {}),
        npcCount: prepareDraft.npcs.length,
        npcNames: prepareDraft.npcs.map((npc) => npc.displayName),
        sourceNotes: toSourceNotes(prepareDraft.sourceNotesText),
        ...(prepareDraft.operatorNote.trim()
          ? { operatorNote: prepareDraft.operatorNote.trim() }
          : {})
      }
    });
    return;
    
    const playerPreset = sampleSeed(playerPresetSeeds);
    const environmentPreset = sampleSeed(environmentPresetSeeds);
    setPrepareDraft((current) => ({
      ...current,
      playerIdentity: fillIfEmpty(current.playerIdentity, playerPreset.identity || sampleSeed(playerIdentitySeeds)),
      playerGoal: fillIfEmpty(current.playerGoal, playerPreset.goal || sampleSeed(playerGoalSeeds)),
      playerState: fillIfEmpty(current.playerState, playerPreset.state || sampleSeed(playerStateSeeds)),
      npcs: current.npcs.map((npc, index) => ({
        displayName: fillIfEmpty(npc.displayName, sampleSeed(["二叔", "姑妈", "表兄", "大伯", "堂姐"], index)),
        identity: fillIfEmpty(
          npc.identity,
          sampleSeed(npcPresetSeeds, index).identity || sampleSeed(npcIdentitySeeds, index)
        ),
        publicGoal: fillIfEmpty(
          npc.publicGoal,
          sampleSeed(npcPresetSeeds, index).goal || sampleSeed(npcGoalSeeds, index)
        ),
        currentState: fillIfEmpty(
          npc.currentState,
          sampleSeed(npcPresetSeeds, index).state || sampleSeed(npcStateSeeds, index)
        )
      })),
      environmentLocation: fillIfEmpty(current.environmentLocation, environmentPreset.location || sampleSeed(environmentLocationSeeds)),
      environmentPressure: fillIfEmpty(current.environmentPressure, environmentPreset.pressure || sampleSeed(environmentPressureSeeds)),
      environmentState: fillIfEmpty(current.environmentState, environmentPreset.state || sampleSeed(environmentStateSeeds)),
      sourceNotesText: fillIfEmpty(
        current.sourceNotesText,
        "这是一次旧关系重新碰撞的现场。\n需要先观察谁在借环境施压。"
      )
    }));
  };

  const handleStartRun = async () => {
    if (isBusy) {
      return;
    }
    await dispatch(buildPrepareAction());
    await dispatch({ type: "simulation.startRun" });
  };

  const handleCustomActionSubmit = async () => {
    if (isBusy) {
      return;
    }
    const selectedAction = vm.availableActions.find((option) => !option.disabled);
    if (!vm.runId || !selectedAction || !customActionText.trim()) {
      return;
    }

    await dispatch({
      type: "simulation.advance",
      request: {
        runId: vm.runId,
        actionId: selectedAction.actionId,
        customActionText: customActionText.trim(),
        rationale: `自定义行动：${customActionText.trim()}`
      }
    });
  };

  const prepareStage = (
    <section className="psy-route-stage--prepare">
      {errorBanner}
      <article className="psy-route-prepare-card psy-route-prepare-card--opening">
        <div className="psy-section-label">prepare</div>
        <h2 className="psy-route-prepare-card__title">{vm.opening.sceneTitle}</h2>
        <p className="psy-route-prepare-card__copy">{vm.opening.sceneSummary}</p>
        <div className="psy-route-prepare-goal">
          <span>本局目标</span>
          <strong>{vm.opening.playerGoal}</strong>
        </div>
        <div className="psy-route-prepare-summary">
          <div>
            <span>当前阶段</span>
            <strong>{getStageLabel(vm.stage)}</strong>
          </div>
          <div>
            <span>准备编号</span>
            <strong>{vm.prepareId ?? "尚未生成"}</strong>
          </div>
        </div>
        <div className="psy-route-prepare-block psy-route-prepare-block--wide">
          <span className="psy-route-prepare-block__tag">说明</span>
          <p>先自定义玩家、他人角色和环境 Agent，再生成本局准备。点击“开始本局”会先刷新 prepare，再进入回合。</p>
        </div>
        <div className="psy-action-row">
          <button
            className="psy-action-button psy-action-button--quiet"
            disabled={isBusy}
            onClick={handleRandomFill}
            type="button"
          >
            随机填补设定
          </button>
          <ActionButton action={vm.actions.prepareRun} variant="secondary" onClick={handlePrepare} />
          <ActionButton action={vm.actions.startRun} variant="hero" onClick={handleStartRun} />
        </div>
      </article>

      <article className="psy-route-prepare-card psy-route-prepare-card--cast">
        <div className="psy-section-label">cast</div>
        <h2 className="psy-route-prepare-card__title">角色与环境装配</h2>
        <div className="psy-route-prepare-grid">
          <section className="psy-route-prepare-block">
            <span className="psy-route-prepare-block__tag">玩家 Agent</span>
            <label className="psy-route-prepare-field">
              <span>名称</span>
              <input
                className="psy-text-input"
                value={prepareDraft.playerName}
                onChange={(event) =>
                  setPrepareDraft((current) => ({ ...current, playerName: event.target.value }))
                }
              />
            </label>
            <label className="psy-route-prepare-field">
              <span>角色定位</span>
              <textarea
                className="psy-textarea psy-route-prepare-textarea"
                value={prepareDraft.playerIdentity}
                onChange={(event) =>
                  setPrepareDraft((current) => ({ ...current, playerIdentity: event.target.value }))
                }
              />
            </label>
            <label className="psy-route-prepare-field">
              <span>公开目标</span>
              <textarea
                className="psy-textarea psy-route-prepare-textarea"
                value={prepareDraft.playerGoal}
                onChange={(event) =>
                  setPrepareDraft((current) => ({ ...current, playerGoal: event.target.value }))
                }
              />
            </label>
            <label className="psy-route-prepare-field">
              <span>当前状态</span>
              <textarea
                className="psy-textarea psy-route-prepare-textarea"
                value={prepareDraft.playerState}
                onChange={(event) =>
                  setPrepareDraft((current) => ({ ...current, playerState: event.target.value }))
                }
              />
            </label>
          </section>

          <section className="psy-route-prepare-block">
            <span className="psy-route-prepare-block__tag">环境 Agent</span>
            <label className="psy-route-prepare-field">
              <span>环境名称</span>
              <input
                className="psy-text-input"
                value={prepareDraft.environmentName}
                onChange={(event) =>
                  setPrepareDraft((current) => ({ ...current, environmentName: event.target.value }))
                }
              />
            </label>
            <label className="psy-route-prepare-field">
              <span>环境位置</span>
              <textarea
                className="psy-textarea psy-route-prepare-textarea"
                value={prepareDraft.environmentLocation}
                onChange={(event) =>
                  setPrepareDraft((current) => ({ ...current, environmentLocation: event.target.value }))
                }
              />
            </label>
            <label className="psy-route-prepare-field">
              <span>压力来源</span>
              <textarea
                className="psy-textarea psy-route-prepare-textarea"
                value={prepareDraft.environmentPressure}
                onChange={(event) =>
                  setPrepareDraft((current) => ({ ...current, environmentPressure: event.target.value }))
                }
              />
            </label>
            <label className="psy-route-prepare-field">
              <span>当前状态</span>
              <textarea
                className="psy-textarea psy-route-prepare-textarea"
                value={prepareDraft.environmentState}
                onChange={(event) =>
                  setPrepareDraft((current) => ({ ...current, environmentState: event.target.value }))
                }
              />
            </label>
          </section>

          {prepareDraft.npcs.map((npc, index) => (
            <section key={`npc-${index}`} className="psy-route-prepare-block">
              <div className="psy-route-prepare-block__head">
                <span className="psy-route-prepare-block__tag">他人 Agent {index + 1}</span>
                <button
                  className="psy-action-button psy-action-button--quiet"
                  onClick={() =>
                    setPrepareDraft((current) => ({
                      ...current,
                      npcs: current.npcs.filter((_, itemIndex) => itemIndex !== index)
                    }))
                  }
                  type="button"
                >
                  移除角色
                </button>
              </div>
              <label className="psy-route-prepare-field">
                <span>名称</span>
                <input
                  className="psy-text-input"
                  value={npc.displayName}
                  onChange={(event) =>
                    setPrepareDraft((current) => ({
                      ...current,
                      npcs: current.npcs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, displayName: event.target.value } : item
                      )
                    }))
                  }
                />
              </label>
              <label className="psy-route-prepare-field">
                <span>角色定位</span>
                <textarea
                  className="psy-textarea psy-route-prepare-textarea"
                  value={npc.identity}
                  onChange={(event) =>
                    setPrepareDraft((current) => ({
                      ...current,
                      npcs: current.npcs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, identity: event.target.value } : item
                      )
                    }))
                  }
                />
              </label>
              <label className="psy-route-prepare-field">
                <span>公开目标</span>
                <textarea
                  className="psy-textarea psy-route-prepare-textarea"
                  value={npc.publicGoal}
                  onChange={(event) =>
                    setPrepareDraft((current) => ({
                      ...current,
                      npcs: current.npcs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, publicGoal: event.target.value } : item
                      )
                    }))
                  }
                />
              </label>
              <label className="psy-route-prepare-field">
                <span>当前状态</span>
                <textarea
                  className="psy-textarea psy-route-prepare-textarea"
                  value={npc.currentState}
                  onChange={(event) =>
                    setPrepareDraft((current) => ({
                      ...current,
                      npcs: current.npcs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, currentState: event.target.value } : item
                      )
                    }))
                  }
                />
              </label>
            </section>
          ))}

          <section className="psy-route-prepare-block psy-route-prepare-block--wide">
            <div className="psy-route-prepare-block__head">
              <span className="psy-route-prepare-block__tag">角色扩展</span>
              <button
                className="psy-action-button psy-action-button--quiet"
                onClick={() =>
                  setPrepareDraft((current) => ({
                    ...current,
                    npcs: [...current.npcs, createEmptyNpcDraft(current.npcs.length)]
                  }))
                }
                type="button"
              >
                添加角色
              </button>
            </div>
            <p>可以继续添加新的他人 Agent。至少填写名称或任一描述字段后，该角色才会进入本局模拟。</p>
          </section>

          <section className="psy-route-prepare-block psy-route-prepare-block--wide">
            <span className="psy-route-prepare-block__tag">补充线索</span>
            <textarea
              className="psy-textarea psy-route-prepare-textarea psy-route-prepare-textarea--large"
              value={prepareDraft.sourceNotesText}
              onChange={(event) =>
                setPrepareDraft((current) => ({ ...current, sourceNotesText: event.target.value }))
              }
              placeholder="每行一条线索"
            />
          </section>

          <section className="psy-route-prepare-block psy-route-prepare-block--wide">
            <span className="psy-route-prepare-block__tag">操作者备注</span>
            <textarea
              className="psy-textarea psy-route-prepare-textarea psy-route-prepare-textarea--large"
              value={prepareDraft.operatorNote}
              onChange={(event) =>
                setPrepareDraft((current) => ({ ...current, operatorNote: event.target.value }))
              }
              placeholder="例如：优先观察谁在施压，或本局希望验证什么"
            />
          </section>

          {vm.preparation ? (
            <section className="psy-route-prepare-block psy-route-prepare-block--wide">
              <span className="psy-route-prepare-block__tag">当前 prepare 摘要</span>
              <p>{sanitizeDisplayText(vm.preparation.summary)}</p>
            </section>
          ) : null}
        </div>
      </article>
    </section>
  );

  const boardStage = (
    <section className="psy-route-stage--board">
      {errorBanner}

      <section className="psy-route-board-stage">
        <div className="psy-route-board-stage__header">
          <div>
            <div className="psy-section-label">route board</div>
            <h2 className="psy-route-board-stage__title">{vm.opening.sceneTitle}</h2>
          </div>
          <div className="psy-route-board-stage__legend">
            <span className="psy-route-legend">
              <span className="psy-route-legend__dot psy-route-legend__dot--current" />
              当前
            </span>
            <span className="psy-route-legend">
              <span className="psy-route-legend__dot psy-route-legend__dot--visited" />
              已经过
            </span>
            <span className="psy-route-legend">
              <span className="psy-route-legend__dot psy-route-legend__dot--far" />
              未抵达
            </span>
          </div>
        </div>

        <div className="psy-route-board-viewport">
          <div className="psy-route-board-viewport__wash" aria-hidden="true" />
          <div
            className="psy-route-board-canvas"
            style={{
              width: `${boardWidth}px`,
              transform: `translateX(${boardShift}px)`
            }}
          >
            <svg
              className="psy-route-board-canvas__links"
              viewBox={`0 0 ${boardWidth} 760`}
              preserveAspectRatio="none"
            >
              {boardLinks.map((link) => (
                <g key={`${link.from.nodeId}-${link.to.nodeId}-${link.to.x}`}>
                  <path
                    className={`psy-route-board-link psy-route-board-link--${link.state}`}
                    d={drawCurve(link.from, link.to)}
                  />
                  {link.state === "current" ? (
                    <path className="psy-route-board-link__beam" d={drawCurve(link.from, link.to)} />
                  ) : null}
                </g>
              ))}
            </svg>

            {activeBoardNode ? (
              <div
                className="psy-route-board-canvas__focus"
                style={{ left: `${activeBoardNode.x}px`, top: `${activeBoardNode.y}px` }}
                aria-hidden="true"
              />
            ) : null}

            <div className="psy-route-board-canvas__nodes">
              {boardNodes.map((node) => (
                <button
                  key={node.routeEntryId}
                  className={`psy-route-board-node${node.isCurrent ? " psy-route-board-node--current" : ""}${node.isVisited ? " psy-route-board-node--visited" : ""}${activeBoardNode?.routeEntryId === node.routeEntryId ? " psy-route-board-node--active" : ""}`}
                  onClick={() => setActiveNodeId(node.routeEntryId)}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  type="button"
                >
                  <span className="psy-route-board-node__index">
                    {String(node.order).padStart(2, "0")}
                  </span>
                  <span className="psy-route-board-node__mark">{getNodeKindLabel(node.kind)}</span>
                  <span className="psy-route-board-node__copy">
                    <small>
                      {node.isCurrent ? "正在聚焦" : node.isVisited ? "已经经过" : "等待进入"}
                    </small>
                    <strong>{node.title}</strong>
                  </span>
                  <span className="psy-route-board-node__state">
                    {node.boardState === "current"
                      ? "镜头锁定"
                      : node.boardState === "visited"
                        ? "已纳入回看"
                        : "尚未抵达"}
                  </span>
                  {node.isCurrent ? (
                    <>
                      <span className="psy-route-board-node__pulse" aria-hidden="true" />
                      <span className="psy-route-board-node__scan" aria-hidden="true" />
                    </>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <aside className="psy-route-board-side">
        <section className="psy-route-board-side__panel">
          <div className="psy-section-label">{getStageLabel(vm.stage)}</div>
          <h2 className="psy-route-board-side__title">{activeBoardNode?.title ?? vm.currentNode.title}</h2>
          <p className="psy-route-board-side__copy">
            {activeBoardNode?.isCurrent
              ? vm.currentNode.summary
              : activeBoardNode?.isVisited
                ? "这是已经走过的节点，用来回看路线如何推进。"
                : "这是尚未抵达的节点，用来提示后续可能的走向。"}
          </p>
          <span className="psy-status-pill">{getNodeKindLabel(activeBoardNode?.kind ?? vm.currentNode.kind)}</span>
          <div className="psy-route-board-side__stats">
            <div className="psy-route-board-stat">
              <span>路线进度</span>
              <strong>{progressValue}</strong>
            </div>
            <div className="psy-route-board-stat">
              <span>回合编号</span>
              <strong>{vm.currentTurnIndex}</strong>
            </div>
          </div>
        </section>

        {vm.preparation ? (
          <section className="psy-route-board-side__panel">
            <div className="psy-section-label">cast</div>
            <div className="psy-route-board-cast">
              <article className="psy-route-board-cast__card">
                <span className="psy-route-prepare-block__tag">我 / 玩家 Agent</span>
                <strong>{sanitizeDisplayText(vm.preparation.player.displayName)}</strong>
                <p>{sanitizeDisplayText(vm.preparation.player.identity)}</p>
                <small>目标：{sanitizeDisplayText(vm.preparation.player.publicGoal)}</small>
                <small>状态：{sanitizeDisplayText(vm.preparation.player.currentState)}</small>
              </article>

              {vm.preparation.npcs.map((npc, index) => (
                <article key={`${npc.displayName}-${index}`} className="psy-route-board-cast__card">
                  <span className="psy-route-prepare-block__tag">他人 Agent {index + 1}</span>
                  <strong>{sanitizeDisplayText(npc.displayName)}</strong>
                  <p>{sanitizeDisplayText(npc.identity)}</p>
                  <small>目标：{sanitizeDisplayText(npc.publicGoal)}</small>
                  <small>状态：{sanitizeDisplayText(npc.currentState)}</small>
                </article>
              ))}

              <article className="psy-route-board-cast__card">
                <span className="psy-route-prepare-block__tag">环境 Agent</span>
                <strong>{sanitizeDisplayText(vm.preparation.environment.displayName)}</strong>
                <p>{sanitizeDisplayText(vm.preparation.environment.location)}</p>
                <small>压力：{sanitizeDisplayText(vm.preparation.environment.pressureSource)}</small>
                <small>状态：{sanitizeDisplayText(vm.preparation.environment.currentState)}</small>
              </article>
            </div>
          </section>
        ) : null}

        {vm.stage !== "completed" && vm.availableActions.length > 0 ? (
          <section className="psy-route-board-side__panel">
            <div className="psy-section-label">{vm.stage === "outcome" ? "下一轮" : "本轮行动"}</div>
            <label className="psy-route-prepare-field">
              <span>自定义行动内容</span>
              <textarea
                className="psy-textarea psy-route-prepare-textarea"
                value={customActionText}
                onChange={(event) => setCustomActionText(event.target.value)}
                placeholder="例如：我先承认自己也在害怕，但不接受继续被逼着当场表态。"
              />
            </label>
            <div className="psy-action-row psy-route-board-side__custom-action">
              <button
                className="psy-action-button psy-action-button--secondary"
                disabled={
                  isBusy ||
                  !vm.runId ||
                  !customActionText.trim() ||
                  !vm.availableActions.some((option) => !option.disabled)
                }
                onClick={handleCustomActionSubmit}
                type="button"
              >
                用自定义行动完成本轮
              </button>
            </div>
            <div className="psy-route-board-branch-stack">
              {vm.availableActions.map((option) => (
                <article
                  key={option.actionId}
                  className={`psy-route-board-branch${option.disabled ? " psy-route-board-branch--disabled" : ""}`}
                >
                  <span className="psy-route-board-branch__state">
                    {option.disabled ? "暂不可用" : "可执行行动"}
                  </span>
                  <div className="psy-route-board-branch__copy">{sanitizeDisplayText(option.label)}</div>
                  <div className="psy-route-board-branch__hint">{sanitizeDisplayText(option.intent)}</div>
                  <div className="psy-route-board-branch__risk">{sanitizeDisplayText(option.riskHint)}</div>
                  <ActionButton
                    action={{
                      ...vm.actions.selectAction,
                      enabled: vm.actions.selectAction.enabled && !option.disabled
                    }}
                    variant="hero"
                    onClick={() =>
                      vm.runId &&
                      !option.disabled &&
                      dispatch({
                        type: "simulation.advance",
                        request: {
                          runId: vm.runId,
                          actionId: option.actionId,
                          ...(customActionText.trim()
                            ? { customActionText: customActionText.trim() }
                            : {}),
                          rationale: `选择行动：${option.label}`
                        }
                      })
                    }
                  />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {vm.stage === "outcome" || vm.stage === "completed" ? (
          <section className="psy-route-board-side__panel">
            <div className="psy-section-label">{vm.stage === "outcome" ? "outcome" : "report"}</div>
            {vm.latestOutcome ? (
              <div className="psy-route-outcome-card">
                <h3 className="psy-route-outcome-card__title">{sanitizeDisplayText(vm.latestOutcome.playerActionLabel)}</h3>
                <p className="psy-route-outcome-card__copy">{sanitizeDisplayText(vm.latestOutcome.consequenceSummary)}</p>
                <div className="psy-route-outcome-card__group">
                  <span>多角色发言</span>
                  <ul className="psy-route-prepare-list">
                    {vm.latestOutcome.dialogueLines.map((item) => (
                      <li key={item}>{sanitizeDisplayText(item)}</li>
                    ))}
                  </ul>
                </div>
                <div className="psy-route-outcome-card__group">
                  <span>互动走势</span>
                  <ul className="psy-route-prepare-list">
                    {vm.latestOutcome.interactionBeats.map((item) => (
                      <li key={item}>{sanitizeDisplayText(item)}</li>
                    ))}
                  </ul>
                </div>
                <div className="psy-route-outcome-card__group">
                  <span>他人反应</span>
                  <ul className="psy-route-prepare-list">
                    {vm.latestOutcome.npcReactions.map((item) => (
                      <li key={item}>{sanitizeDisplayText(item)}</li>
                    ))}
                  </ul>
                </div>
                <div className="psy-route-outcome-card__group">
                  <span>状态变化</span>
                  <ul className="psy-route-prepare-list">
                    {vm.latestOutcome.actorChanges.map((item) => (
                      <li key={item}>{sanitizeDisplayText(item)}</li>
                    ))}
                  </ul>
                </div>
                <div className="psy-route-outcome-card__group">
                  <span>环境反馈</span>
                  <p>{sanitizeDisplayText(vm.latestOutcome.environmentSummary)}</p>
                </div>
              </div>
            ) : (
              <p className="psy-meta-text">当前还没有生成回合结果。</p>
            )}
          </section>
        ) : (
          <section className="psy-route-board-side__panel">
            <div className="psy-section-label">next</div>
            <div className="psy-route-board-upcoming">
              {upcomingNodes.length > 0 ? (
                upcomingNodes.map((node) => (
                  <div key={node.routeEntryId} className="psy-route-board-upcoming__item">
                    <span>{String(node.order).padStart(2, "0")}</span>
                    <div>
                      <strong>{node.title}</strong>
                      <small>{getNodeKindLabel(node.kind)}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="psy-meta-text">当前已经接近路线收束点。</p>
              )}
            </div>
          </section>
        )}

        <div className="psy-action-row psy-route-board-side__actions">
          {vm.stage !== "completed" ? (
            <ActionButton
              action={vm.actions.finishRun}
              variant="primary"
              onClick={() =>
                dispatch({ type: "simulation.finish", ...(vm.runId ? { runId: vm.runId } : {}) })
              }
            />
          ) : null}
          {vm.stage === "completed" ? (
            <ActionButton
              action={vm.actions.viewReport}
              variant="hero"
              onClick={() => dispatch({ type: "report.load" })}
            />
          ) : null}
          <ActionButton
            action={vm.actions.startNew}
            variant="secondary"
            onClick={() => dispatch({ type: "simulation.loadScenario" })}
          />
        </div>
      </aside>
    </section>
  );

  return (
    <SceneShell
      sceneId="simulation-route"
      tone="simulation"
      layout="route-map"
      compactHeader
      frameDensity="light"
      eyebrow={`情境模拟 // ${getStageLabel(vm.stage)}`}
      title={vm.title}
      subtitle={vm.scenarioTitle}
      backAction={
        <ActionButton
          action={{ label: "返回模式大厅", kind: "navigate-back", enabled: true }}
          variant="ghost"
          onClick={() => navigate({ scene: "menu" })}
        />
      }
      status={
        <>
          <span className="psy-status-pill">{getStageLabel(vm.stage)}</span>
          <span className="psy-status-pill">{vm.routeNodes.length} 个节点</span>
          <span className="psy-status-pill">{vm.availableActions.length} 个行动</span>
        </>
      }
      contentClassName="psy-simulation-layout psy-simulation-layout--reframed"
    >
      {isBusy ? (
        <div className="psy-route-loading-overlay" aria-live="polite">
          <div className="psy-route-loading">
            <span className="psy-route-loading__ring" aria-hidden="true" />
            <strong>{loadingLabel}</strong>
            <small>请稍候，当前阶段正在生成新的状态。</small>
          </div>
        </div>
      ) : null}
      {vm.stage === "prepare" ? prepareStage : boardStage}
    </SceneShell>
  );
};
