import React from "react";
import type { HistoryPageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler } from "../navigation.js";
import type { UiHostAction } from "../host-action.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";
import { EmptyState } from "../shared/EmptyState.js";

function getWorkflowLabel(workflow: string): string {
  switch (workflow) {
    case "counseling":
      return "心理咨询";
    case "simulation":
      return "情境模拟";
    case "resonance":
      return "同频共振";
    default:
      return workflow;
  }
}

export const HistoryScene: React.FC<{
  vm: HistoryPageViewModel;
  onNavigate?: AppNavigateHandler;
  onAction?: (action: UiHostAction) => Promise<void> | void;
}> = ({ vm, onNavigate, onAction }) => {
  const navigate = onNavigate ?? (() => {});
  const dispatch = onAction ?? (() => {});

  return (
    <SceneShell
      sceneId="history"
      tone="history"
      eyebrow="档案区"
      title={vm.title}
      subtitle="历史页中的报告条目会先触发 report.load，再进入报告详情，确保点开后看到真实内容。"
      backAction={
        <ActionButton action={{ label: "返回模式大厅", kind: "navigate-back", enabled: true }} onClick={() => navigate({ scene: "menu" })} />
      }
      actions={<ActionButton action={vm.actions.backToMenu} onClick={() => navigate({ scene: "menu" })} />}
      contentClassName="psy-history-layout"
    >
      <div className="psy-history-list">
        {vm.items.length === 0 ? (
          <EmptyState message={vm.status.message ?? "还没有可查看的报告。"} />
        ) : (
          vm.items.map((item) => (
            <button
              key={item.id}
              className="psy-history-card"
              type="button"
              onClick={() => dispatch({ type: "report.load", reference: item.reportReference })}
            >
              <div className="psy-history-card__header">
                <div className="psy-section-label">{getWorkflowLabel(item.workflow)}</div>
                <span>{item.timestamp.slice(0, 10)}</span>
              </div>
              <div className="psy-block__title">{item.title}</div>
              <p className="psy-block__copy">{item.subtitle}</p>
              <div className="psy-history-meta">
                <span>{item.nav.label}</span>
                <span>打开观察页</span>
              </div>
            </button>
          ))
        )}
      </div>
      <aside className="psy-panel psy-history-aside">
        <div className="psy-section-label">档案筛选</div>
        <h2 className="psy-block__title">按路径回看报告</h2>
        <p className="psy-block__copy">
          {vm.status.message ?? `当前共 ${vm.items.length} 条报告，筛选后会直接保留可打开的结果列表。`}
        </p>
        <div className="psy-action-row">
          <ActionButton action={vm.actions.filterCounseling} onClick={() => navigate({ scene: "history", workflow: "counseling" })} />
          <ActionButton action={vm.actions.filterSimulation} onClick={() => navigate({ scene: "history", workflow: "simulation" })} />
          <ActionButton action={vm.actions.filterResonance} onClick={() => navigate({ scene: "history", workflow: "resonance" })} />
          <ActionButton action={vm.actions.clearFilter} onClick={() => navigate({ scene: "history" })} />
        </div>
        <p className="psy-meta-text">当前筛选：{vm.filter.label}</p>
      </aside>
    </SceneShell>
  );
};
