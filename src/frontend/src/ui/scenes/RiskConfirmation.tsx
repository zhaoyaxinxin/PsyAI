import React from "react";
import type { RiskConfirmationPageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler, AppNavigateTarget } from "../navigation.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";
import { RiskBadge } from "../shared/RiskBadge.js";

function getEscalationLabel(status: string): string {
  switch (status) {
    case "escalated":
      return "已升级";
    case "urgent":
      return "紧急";
    case "review_recommended":
      return "建议复核";
    default:
      return status;
  }
}

export const RiskConfirmation: React.FC<{
  vm: RiskConfirmationPageViewModel;
  onNavigate?: AppNavigateHandler;
}> = ({ vm, onNavigate }) => {
  const navigate = onNavigate ?? (() => {});
  const focusRoute: AppNavigateTarget =
    vm.workflow === "simulation"
      ? { scene: "route" }
      : { scene: "focus", workflow: vm.workflow === "resonance" ? "resonance" : "counseling", entityId: vm.entityId };

  return (
    <SceneShell
      sceneId="risk-confirmation"
      tone="risk"
      eyebrow="风险锁定"
      title={vm.title}
      subtitle="这是高优先级的风险确认层，不是普通弹窗。"
      backAction={
        <ActionButton action={{ label: "返回当前场景", kind: "navigate-back", enabled: true }} onClick={() => navigate(focusRoute)} />
      }
      status={<RiskBadge level={vm.riskSummary.level} label={getEscalationLabel(vm.riskSummary.escalation)} />}
      frameClassName="psy-risk-overlay"
    >
      <section className="psy-risk-shell">
        <div className="psy-signal-list">
          {vm.riskSummary.signals.map((signal, index) => (
            <div key={`${signal}-${index}`} className="psy-consent-item">
              <span className="psy-consent-item__mark" />
              <div>{signal}</div>
            </div>
          ))}
        </div>
        <div className="psy-rec-list">
          {vm.riskSummary.recommendations.map((recommendation, index) => (
            <div key={`${recommendation}-${index}`} className="psy-highlight">
              <span className="psy-highlight__mark" />
              <div>{recommendation}</div>
            </div>
          ))}
        </div>
        <p className="psy-meta-text">{vm.boundaryNotice}</p>
        <div className="psy-action-row">
          <ActionButton action={vm.actions.confirm} onClick={() => navigate(focusRoute)} />
          <ActionButton action={vm.actions.cancel} onClick={() => navigate(focusRoute)} />
          {vm.actions.escalateToHuman.enabled ? <ActionButton action={vm.actions.escalateToHuman} onClick={() => navigate(focusRoute)} /> : null}
        </div>
      </section>
    </SceneShell>
  );
};
