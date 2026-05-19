import React, { useState } from "react";
import type { LandingPageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler } from "../navigation.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";

type EntryMode = "simulation" | "resonance";

export const EntryScene: React.FC<{
  vm: LandingPageViewModel;
  onNavigate?: AppNavigateHandler;
}> = ({ vm, onNavigate }) => {
  const navigate = onNavigate ?? (() => {});
  const [mode, setMode] = useState<EntryMode>("simulation");

  const primaryAction = mode === "simulation" ? vm.actions.enterSimulation : vm.actions.enterResonance;

  return (
    <SceneShell
      sceneId="landing"
      tone="entry"
      layout="single-stage"
      compactHeader
      frameDensity="light"
      eyebrow="PsyAI // 入口"
      title={vm.title}
      subtitle="从这里进入两条主路径：先进入漫游场，或者直接投放心绪进入同频共振。"
      status={
        <>
          <span className="psy-status-pill">{vm.consent.disclaimerAccepted ? "边界已阅读" : "边界待阅读"}</span>
          <span className="psy-status-pill">{vm.consent.riskAcknowledged ? "风险已确认" : "风险待确认"}</span>
        </>
      }
      contentClassName="psy-entry-layout psy-entry-layout--reframed"
    >
      <section className="psy-entry-single-stage">
        <div className="psy-entry-single-stage__switch" role="tablist" aria-label="入口模式切换">
          <button
            className={`psy-entry-mode-tab${mode === "simulation" ? " is-active" : ""}`}
            onClick={() => setMode("simulation")}
            type="button"
          >
            漫游模式
          </button>
          <button
            className={`psy-entry-mode-tab${mode === "resonance" ? " is-active" : ""}`}
            onClick={() => setMode("resonance")}
            type="button"
          >
            同频共振
          </button>
        </div>

        <div className="psy-entry-composer">
          <div className="psy-entry-composer__shell" aria-hidden="true" />
          <div className="psy-entry-composer__copy">
            <div className="psy-section-label">入口容器</div>
            <h2 className="psy-entry-composer__title">
              {mode === "simulation" ? "先进入漫游场，再选择咨询室或叙事路线。" : "直接写下你的感受、问题或想要比较的内容。"}
            </h2>
            <p className="psy-entry-composer__hint">
              {mode === "simulation"
                ? "这条路径适合先选场，再进入心理咨询或情境模拟。"
                : "这条路径会直接进入共振场，后续生成匹配、理由和报告入口。"}
            </p>
          </div>

          <div className="psy-entry-composer__surface">
            <div className="psy-entry-composer__mode-note">
              {mode === "simulation" ? "固定演示路线 · 分流后深入" : "快速入口 · 直接进入共振场"}
            </div>
            <div className="psy-entry-composer__placeholder">
              {mode === "simulation" ? "漫游模式：选择路径，进入不同场域。" : "同频共振：投放心绪，等待星点回应。"}
            </div>
            <p className="psy-entry-composer__microcopy">
              {mode === "simulation" ? "适合现场演示完整 workflow。" : "适合快速进入匹配与报告。"}
            </p>
            <div className="psy-entry-composer__assist">
              <span>深度思考</span>
              <span>智能搜索</span>
            </div>
            <div className="psy-entry-composer__actions">
              <ActionButton
                action={primaryAction}
                variant="hero"
                onClick={() => (mode === "simulation" ? navigate({ scene: "menu" }) : navigate({ scene: "focus", workflow: "resonance" }))}
              />
            </div>
          </div>
        </div>

        <div className="psy-entry-boundary-strip">
          <div className="psy-entry-boundary-strip__item">{vm.consent.disclaimerLabel}</div>
          <div className="psy-entry-boundary-strip__item">{vm.consent.riskLabel}</div>
        </div>
      </section>
    </SceneShell>
  );
};
