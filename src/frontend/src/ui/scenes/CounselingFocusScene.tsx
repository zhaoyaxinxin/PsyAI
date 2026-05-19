import React, { useState } from "react";
import type { CounselingFocusPageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler } from "../navigation.js";
import type { UiHostAction } from "../host-action.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";
import { ErrorBanner } from "../shared/ErrorBanner.js";
import { LoadingSpinner } from "../shared/LoadingSpinner.js";
import { RiskBadge } from "../shared/RiskBadge.js";
import { StreamingText } from "../shared/StreamingText.js";

function getRiskLevelLabel(level: string): string {
  switch (level) {
    case "urgent":
      return "紧急";
    case "high":
      return "高";
    case "moderate":
      return "中";
    case "low":
      return "低";
    default:
      return level;
  }
}

export const CounselingFocusScene: React.FC<{
  vm: CounselingFocusPageViewModel;
  onNavigate?: AppNavigateHandler;
  onAction?: (action: UiHostAction) => Promise<void> | void;
}> = ({ vm, onNavigate, onAction }) => {
  const navigate = onNavigate ?? (() => {});
  const dispatch = onAction ?? (() => {});
  const [draft, setDraft] = useState("");
  const isStreaming = vm.status.status === "streaming";

  const submitDraft = async () => {
    const nextMessage = draft.trim();
    if (!nextMessage) {
      return;
    }

    if (vm.sessionId) {
      await dispatch({ type: "counseling.reply", request: { sessionId: vm.sessionId, message: nextMessage } });
    } else {
      await dispatch({
        type: "counseling.start",
        request: { openingMessage: nextMessage, userContext: ["desktop-electron"] }
      });
    }

    setDraft("");
  };

  return (
    <SceneShell
      sceneId="counseling-focus"
      tone="counseling"
      layout="hero-split"
      compactHeader
      frameDensity="light"
      eyebrow="心理咨询 // 空间"
      title={vm.title}
      subtitle="这里不是工具台，而是一处可以慢下来、把话说出来的空间。"
      backAction={
        <ActionButton
          action={{ label: "返回模式大厅", kind: "navigate-back", enabled: true }}
          variant="ghost"
          onClick={() => navigate({ scene: "menu" })}
        />
      }
      status={
        <>
          {vm.analysis.riskLevel ? <RiskBadge level={vm.analysis.riskLevel} label={`风险 ${getRiskLevelLabel(vm.analysis.riskLevel)}`} /> : null}
          {vm.analysis.stage ? <span className="psy-status-pill">{vm.analysis.stage}</span> : null}
        </>
      }
      contentClassName="psy-counseling-layout psy-counseling-layout--reframed"
    >
      <section className="psy-counseling-room">
        <div className="psy-counseling-room__hero">
          <div className="psy-counseling-room__ambient" aria-hidden="true">
            <div className="psy-counseling-room__lamp" />
            <div className="psy-counseling-room__glass" />
          </div>
          <div className="psy-counseling-room__lead">
            <div className="psy-section-label">承接会话</div>
            <h2 className="psy-counseling-room__title">{vm.analysis.summary ?? "从你现在最想梳理的感受、关系或压力开始。"}</h2>
            <p className="psy-counseling-room__copy">
              {vm.analysis.escalationReason ?? "这里会优先承接对话，再在需要的时候提醒你回看风险与边界。"}
            </p>
            <div className="psy-counseling-room__metric">
              <span>慢速承接</span>
              <span>{vm.conversation.messages.length} 条记录已进入会话</span>
            </div>
          </div>
        </div>

        <div className="psy-counseling-room__body">
          <section className="psy-transcript-shell">
            {vm.status.status === "error" ? <ErrorBanner message={vm.status.message ?? "会话加载失败"} retryAction={vm.actions.retry} /> : null}
            {vm.status.status === "loading" ? <LoadingSpinner message="正在载入咨询会话..." /> : null}

            <div className="psy-transcript-shell__messages">
              {vm.conversation.messages.length === 0 ? <p className="psy-meta-text">{vm.conversation.emptyMessage}</p> : null}

              {vm.conversation.messages.map((message, index) => (
                <article key={`${message.createdAt}-${index}`} className={`psy-message psy-message--${message.speaker === "user" ? "user" : "assistant"}`}>
                  <div className="psy-message__speaker">{message.speaker === "user" ? "你" : "咨询师"}</div>
                  <div className="psy-message__body">{message.content}</div>
                </article>
              ))}

              {isStreaming ? (
                <article className="psy-message psy-message--assistant">
                  <div className="psy-message__speaker">咨询师</div>
                  <div className="psy-message__body">
                    <StreamingText text="回应正在生成，请稍候……" isStreaming />
                  </div>
                </article>
              ) : null}
            </div>

            <div className="psy-counseling-composer">
              <div className="psy-section-label">继续表达</div>
              <textarea
                className="psy-textarea psy-textarea--warm"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="把你此刻最想说的话写下来，让下一个问题自然浮现。"
                rows={4}
              />
              <div className="psy-action-row">
                <ActionButton action={vm.actions.sendMessage} variant="hero" onClick={() => void submitDraft()} />
              </div>
            </div>
          </section>

          <aside className="psy-counseling-rail">
            <section className="psy-counseling-rail__panel psy-counseling-rail__panel--summary">
              <div className="psy-section-label">会话摘要</div>
              <p className="psy-counseling-rail__text">{vm.analysis.summary ?? "当前会话仍处于起始阶段，先让内容慢慢展开。"}</p>
            </section>

            <section className="psy-counseling-rail__panel">
              <div className="psy-section-label">当前状态</div>
              <div className="psy-counseling-rail__chips">
                <span className="psy-status-pill">消息数 {vm.conversation.messages.length}</span>
                {vm.analysis.escalationStatus ? <span className="psy-status-pill">{vm.analysis.escalationStatus}</span> : null}
              </div>
            </section>

            <section className="psy-counseling-rail__panel psy-counseling-rail__panel--actions">
              <div className="psy-section-label">会话动作</div>
              <div className="psy-action-row psy-counseling-rail__actions">
                <ActionButton
                  action={vm.actions.startNew}
                  variant="secondary"
                  onClick={() =>
                    dispatch({
                      type: "counseling.start",
                      request: { openingMessage: draft.trim() || vm.conversation.emptyMessage, userContext: ["desktop-electron"] }
                    })
                  }
                />
                <ActionButton
                  action={vm.actions.finishSession}
                  variant="secondary"
                  onClick={() => vm.sessionId && dispatch({ type: "counseling.finish", sessionId: vm.sessionId })}
                />
                <ActionButton action={vm.actions.viewReport} variant="quiet" onClick={() => dispatch({ type: "report.load" })} />
                {vm.actions.acknowledgeRisk.enabled ? (
                  <ActionButton
                    action={vm.actions.acknowledgeRisk}
                    variant="danger"
                    onClick={() => vm.sessionId && navigate({ scene: "risk-confirmation", workflow: "counseling", entityId: vm.sessionId })}
                  />
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </SceneShell>
  );
};
