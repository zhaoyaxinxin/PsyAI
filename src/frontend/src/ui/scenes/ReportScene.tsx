import React from "react";
import type { ReportDetailPageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler } from "../navigation.js";
import type { UiHostAction } from "../host-action.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";
import { ErrorBanner } from "../shared/ErrorBanner.js";
import { LoadingSpinner } from "../shared/LoadingSpinner.js";

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

export const ReportScene: React.FC<{
  vm: ReportDetailPageViewModel;
  onNavigate?: AppNavigateHandler;
  onAction?: (action: UiHostAction) => Promise<void> | void;
}> = ({ vm, onNavigate, onAction }) => {
  const navigate = onNavigate ?? (() => {});
  const dispatch = onAction ?? (() => {});
  const workflowRoute = vm.workflow === "simulation" ? { scene: "route" as const } : { scene: "focus" as const, workflow: vm.workflow };
  const leadPanel = vm.panels[0] ?? null;

  if (!vm.reportId) {
    return <LoadingSpinner message="正在加载报告..." />;
  }

  return (
    <SceneShell
      sceneId="report-detail"
      tone="report"
      eyebrow="观察视图"
      title={vm.title}
      subtitle="报告层保持被观察、被分析的状态，并在当前页面直接显示导出反馈。"
      backAction={
        <ActionButton action={{ label: "返回当前工作流", kind: "navigate-back", enabled: true }} onClick={() => navigate(workflowRoute)} />
      }
      status={
        <>
          <span className="psy-status-pill">{getWorkflowLabel(vm.workflow)}</span>
          <span className="psy-status-pill">{vm.generatedAt.slice(0, 10)}</span>
        </>
      }
      actions={<ActionButton action={vm.actions.exportReport} onClick={() => dispatch({ type: "settings.runExport" })} />}
      contentClassName="psy-report-layout"
    >
      <div className="psy-report-stage">
        <div className="psy-stage-caption">
          <span>观察层</span>
          <span className="psy-stage-caption__line" />
          <span>结构回看</span>
        </div>
        <div className="psy-report-stage__hero">
          <div className="psy-report-core psy-panel">
            {vm.status.status === "error" ? <ErrorBanner message={vm.status.message ?? "报告加载失败"} retryAction={vm.actions.retry} /> : null}
            <section className="psy-report-centerpiece">
              <div className="psy-section-label">核心摘要</div>
              <h2 className="psy-block__title">{vm.summary}</h2>
              <div className="psy-report-highlights">
                {vm.highlights.map((highlight) => (
                  <div key={highlight.label} className="psy-highlight">
                    <span className="psy-highlight__mark" />
                    <div>
                      <strong>{highlight.label}</strong>：{highlight.value}
                    </div>
                  </div>
                ))}
                {vm.exportState ? (
                  <div className="psy-highlight">
                    <span className="psy-highlight__mark" />
                    <div>
                      <strong>导出完成</strong>：{vm.exportState.fileName}，时间 {vm.exportState.exportedAt.slice(0, 16)}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="psy-report-meta">
                <span>{vm.exportLabel}</span>
                <span>{vm.exportState ? "导出状态已同步" : "观察层已激活"}</span>
              </div>
            </section>
            <div className="psy-action-row">
              <ActionButton action={vm.actions.backToList} onClick={() => navigate({ scene: "history", workflow: vm.workflow })} />
              <ActionButton action={vm.actions.backToWorkflow} onClick={() => navigate(workflowRoute)} />
            </div>
          </div>
          <div className="psy-report-lattice" aria-hidden="true" />
        </div>
      </div>
      <aside className="psy-report-orbit">
        <section className="psy-report-panel psy-report-orbit__intro">
          <div className="psy-section-label">阅读引导</div>
          <h2 className="psy-block__title">{leadPanel?.heading ?? "报告结构已经就绪"}</h2>
          <div className="psy-report-panel__lines">
            <div>共 {vm.panels.length} 组观察面板，当前报告已收束为可展示状态。</div>
            <div>{leadPanel?.lines[0] ?? "从核心摘要开始，再往右侧阅读结构化观察内容。"}</div>
          </div>
        </section>
        {vm.panels.map((panel) => (
          <section key={panel.panelId} className="psy-report-panel">
            <div className="psy-section-label">观察面板 · {panel.panelId}</div>
            <h2 className="psy-block__title">{panel.heading}</h2>
            <div className="psy-report-panel__lines">
              {panel.lines.map((line, index) => (
                <div key={`${panel.panelId}-${index}`}>{line}</div>
              ))}
            </div>
          </section>
        ))}
      </aside>
    </SceneShell>
  );
};
