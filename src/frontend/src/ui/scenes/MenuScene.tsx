import React from "react";
import type { MenuPageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler } from "../navigation.js";
import type { UiHostAction } from "../host-action.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";

export const MenuScene: React.FC<{
  vm: MenuPageViewModel;
  onNavigate?: AppNavigateHandler;
  onAction?: (action: UiHostAction) => Promise<void> | void;
}> = ({ vm, onNavigate, onAction }) => {
  const navigate = onNavigate ?? (() => {});
  const dispatch = onAction ?? (() => {});

  return (
    <SceneShell
      sceneId="menu"
      tone="menu"
      layout="single-stage"
      compactHeader
      frameDensity="light"
      eyebrow="漫游模式 // 选路"
      title={vm.title}
      subtitle="从这里选一条继续深入的路径，不把注意力分散在系统说明上。"
      backAction={
        <ActionButton
          action={{ label: "返回首页", kind: "navigate-back", enabled: true }}
          variant="ghost"
          onClick={() => navigate({ scene: "entry" })}
        />
      }
      actions={
        <>
          <ActionButton action={vm.actions.openHistory} variant="quiet" onClick={() => navigate({ scene: "history" })} />
          <ActionButton action={vm.actions.openSettings} variant="quiet" onClick={() => navigate({ scene: "settings" })} />
        </>
      }
      contentClassName="psy-menu-layout psy-menu-layout--reframed"
    >
      <section className="psy-route-choice-stage">
        <article className="psy-route-choice-card psy-route-choice-card--counseling">
          <div className="psy-route-choice-card__art" aria-hidden="true">
            <div className="psy-route-choice-card__beam" />
            <div className="psy-route-choice-card__aura" />
          </div>
          <div className="psy-route-choice-card__content">
            <div className="psy-section-label">温暖静室</div>
            <h2 className="psy-route-choice-card__title">AI 心理咨询室</h2>
            <p className="psy-route-choice-card__copy">
              进入较安静的心理空间，从一句话开始，逐步展开对话、澄清和回看。
            </p>
            <div className="psy-route-choice-card__meta">
              <span>承接对话</span>
              <span>风险回看</span>
              <span>生成报告</span>
            </div>
            <div className="psy-route-choice-card__footnote">适合从一句话进入，并稳定演示完整咨询链路。</div>
            <ActionButton
              action={vm.actions.selectCounseling}
              variant="hero"
              onClick={() => navigate({ scene: "focus", workflow: "counseling" })}
            />
          </div>
        </article>

        <article className="psy-route-choice-card psy-route-choice-card--simulation">
          <div className="psy-route-choice-card__art" aria-hidden="true">
            <div className="psy-route-choice-card__beam" />
            <div className="psy-route-choice-card__orbit" />
            <div className="psy-route-choice-card__node psy-route-choice-card__node--1" />
            <div className="psy-route-choice-card__node psy-route-choice-card__node--2" />
            <div className="psy-route-choice-card__node psy-route-choice-card__node--3" />
          </div>
          <div className="psy-route-choice-card__content">
            <div className="psy-section-label">命运路线</div>
            <h2 className="psy-route-choice-card__title">重落红尘间</h2>
            <p className="psy-route-choice-card__copy">
              进入叙事情境场，从可选行动推进节点与分支，观察关系、环境与结果如何改变。
            </p>
            <div className="psy-route-choice-card__meta">
              <span>多分支</span>
              <span>叙事推进</span>
              <span>模拟回看</span>
            </div>
            <div className="psy-route-choice-card__footnote">适合做路线推进演示，节点与报告关系更直观。</div>
            <ActionButton
              action={vm.actions.selectSimulation}
              variant="hero"
              onClick={() => dispatch({ type: "simulation.loadScenario" })}
            />
          </div>
        </article>

        {vm.recentItems.length > 0 ? (
          <div className="psy-route-archive-ribbon">
            <div className="psy-section-label">最近报告</div>
            <div className="psy-route-archive-ribbon__items">
              {vm.recentItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  className="psy-route-archive-ribbon__item"
                  onClick={() => dispatch({ type: "report.load", reference: item.reportReference })}
                  type="button"
                >
                  <span>{item.label}</span>
                  <span>{item.timestamp.slice(5, 10)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </SceneShell>
  );
};
