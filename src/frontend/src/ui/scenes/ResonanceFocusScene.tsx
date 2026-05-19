import React, { useEffect, useState } from "react";
import type { ResonanceFocusPageViewModel } from "../../pages/page-view-model.js";
import type { AppNavigateHandler } from "../navigation.js";
import type { UiHostAction } from "../host-action.js";
import { SceneShell } from "../shell/SceneShell.js";
import { ActionButton } from "../shared/ActionButton.js";
import { EmptyState } from "../shared/EmptyState.js";
import { ErrorBanner } from "../shared/ErrorBanner.js";
import { LoadingSpinner } from "../shared/LoadingSpinner.js";

const nodePositions = [
  { top: "18%", left: "17%", x: "23%", y: "25%" },
  { top: "62%", left: "25%", x: "31%", y: "69%" },
  { top: "34%", left: "69%", x: "79%", y: "42%" }
] as const;

function getResonancePageResult(value: unknown): ResonanceFocusPageViewModel | null {
  if (value && typeof value === "object" && "page" in value && value.page === "resonance-focus") {
    return value as ResonanceFocusPageViewModel;
  }

  return null;
}

function shouldStopPipeline(result: unknown): boolean {
  const page = getResonancePageResult(result);
  if (!page) {
    return false;
  }

  return (
    page.status.status === "error" ||
    page.processing.phase === "analysis-failed" ||
    page.processing.phase === "no-similar-cases"
  );
}

function getEmptyMessage(vm: ResonanceFocusPageViewModel): string {
  switch (vm.processing.phase) {
    case "no-similar-cases":
      return "No strong enough case match was found. Add more relational context, conflict details, or emotional shifts and try again.";
    case "analysis-failed":
      return "Signal extraction failed for this input. Retry, or rewrite the text with a more complete narrative.";
    case "extracting-signals":
    case "retrieving-cases":
    case "generating-report":
      return vm.processing.detail ?? "The system is still processing this input.";
    default:
      return "Start with a short narrative. The system will analyze the input first, then retrieve cases and build explanations.";
  }
}

export const ResonanceFocusScene: React.FC<{
  vm: ResonanceFocusPageViewModel;
  onNavigate?: AppNavigateHandler;
  onAction?: (action: UiHostAction) => Promise<unknown> | unknown;
}> = ({ vm, onNavigate, onAction }) => {
  const navigate = onNavigate ?? (() => {});
  const dispatch = onAction ?? (() => {});
  const [text, setText] = useState("");
  const [activeMatchRank, setActiveMatchRank] = useState<number | null>(vm.matches[0]?.rank ?? null);

  useEffect(() => {
    setActiveMatchRank(vm.matches[0]?.rank ?? null);
  }, [vm.matches]);

  const activeMatch = vm.matches.find((match) => match.rank === activeMatchRank) ?? vm.matches[0] ?? null;

  const runComparison = async (requestText: string) => {
    const nextText = requestText.trim();
    if (!nextText) {
      return;
    }

    const submitResult = await dispatch({
      type: "resonance.submitInput",
      request: {
        sourceType: "text",
        text: nextText
      }
    });
    if (shouldStopPipeline(submitResult)) {
      return;
    }

    const inputId = getResonancePageResult(submitResult)?.inputId ?? vm.inputId;
    if (!inputId) {
      return;
    }

    const analyzeResult = await dispatch({ type: "resonance.analyzeInput", inputId });
    if (shouldStopPipeline(analyzeResult)) {
      return;
    }

    const compareResult = await dispatch({ type: "resonance.compare", request: { inputId, topK: 3 } });
    if (shouldStopPipeline(compareResult)) {
      return;
    }

    const matchesResult = await dispatch({ type: "resonance.loadMatches" });
    if (shouldStopPipeline(matchesResult)) {
      return;
    }

    await dispatch({ type: "resonance.loadReportStatus" });
  };

  return (
    <SceneShell
      sceneId="resonance-focus"
      tone="resonance"
      layout="single-stage"
      compactHeader
      frameDensity="light"
      eyebrow="Resonance // Field"
      title={vm.title}
      subtitle="Let AI structure the narrative first, then compare it against the local case library."
      backAction={
        <ActionButton
          action={{ label: "Back", kind: "navigate-back", enabled: true }}
          variant="ghost"
          onClick={() => navigate({ scene: "entry" })}
        />
      }
      status={
        <>
          <span className="psy-status-pill">{vm.processing.headline}</span>
          <span className="psy-status-pill">{vm.matches.length} links visible</span>
        </>
      }
      contentClassName="psy-resonance-layout psy-resonance-layout--reframed"
    >
      <section className="psy-resonance-field">
        <div className="psy-resonance-field__heart">
          <svg className="psy-resonance-field__links" viewBox="0 0 100 100" preserveAspectRatio="none">
            {vm.matches.map((match, index) => {
              const position = nodePositions[Math.min(index, nodePositions.length - 1)]!;
              return (
                <line
                  key={`link-${match.rank}`}
                  className={`psy-resonance-field__link${activeMatch?.rank === match.rank ? " is-active" : ""}`}
                  x1="50"
                  y1="50"
                  x2={position.x.replace("%", "")}
                  y2={position.y.replace("%", "")}
                />
              );
            })}
          </svg>
          <div className="psy-resonance-field__heart-core" />
          <div className="psy-resonance-field__ring psy-resonance-field__ring--1" />
          <div className="psy-resonance-field__ring psy-resonance-field__ring--2" />
          <div className="psy-resonance-field__ring psy-resonance-field__ring--3" />
          {vm.matches.map((match, index) => {
            const position = nodePositions[Math.min(index, nodePositions.length - 1)]!;
            return (
              <button
                key={match.rank}
                className={`psy-resonance-node${index === 0 ? " psy-resonance-node--top" : ""}${activeMatch?.rank === match.rank ? " psy-resonance-node--active" : ""}`}
                onClick={() => setActiveMatchRank(match.rank)}
                onFocus={() => setActiveMatchRank(match.rank)}
                onMouseEnter={() => setActiveMatchRank(match.rank)}
                style={{ top: position.top, left: position.left, right: "auto" }}
                title={match.whyMatched}
                type="button"
              >
                <div className="psy-resonance-node__tag">{index === 0 ? "Primary" : `Link ${String(index + 1).padStart(2, "0")}`}</div>
                <div className="psy-resonance-node__score">{match.scorePercent}%</div>
                <div className="psy-resonance-node__title">{match.title}</div>
                <div className="psy-resonance-node__excerpt">{match.whyMatched}</div>
                {activeMatch?.rank === match.rank ? <span className="psy-resonance-node__pulse" /> : null}
              </button>
            );
          })}
        </div>

        <div className="psy-resonance-field__composer">
          {vm.status.status === "error" ? (
            <ErrorBanner message={vm.status.message ?? "Resonance analysis failed"} retryAction={vm.actions.retry} />
          ) : null}
          {vm.status.status === "loading" ? (
            <LoadingSpinner message={`${vm.processing.headline}...`} />
          ) : null}

          <div className="psy-section-label">Input</div>
          <h2 className="psy-resonance-field__title">Drop in the narrative you want to compare.</h2>
          <p className="psy-resonance-field__copy">{vm.inputForm.helperText}</p>

          <textarea
            className="psy-textarea psy-textarea--signal"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={vm.inputForm.textPlaceholder}
            rows={5}
          />

          <div className="psy-action-row">
            <ActionButton action={vm.actions.submitText} variant="hero" onClick={() => runComparison(text)} />
            <ActionButton
              action={vm.actions.startNew}
              variant="quiet"
              onClick={() => {
                setText("");
                setActiveMatchRank(null);
                void dispatch({ type: "resonance.reset" });
              }}
            />
          </div>

          <div className="psy-resonance-field__report">
            <div className="psy-section-label">Progress</div>
            <p className="psy-meta-text">{vm.processing.detail ?? "Waiting to start."}</p>
            {vm.analysis.summary ? (
              <p className="psy-meta-text">
                Analysis summary: {vm.analysis.summary}
                {vm.analysis.confidencePercent !== null ? ` | confidence ${vm.analysis.confidencePercent}%` : ""}
              </p>
            ) : null}
          </div>

          {vm.matches.length === 0 ? (
            <EmptyState message={getEmptyMessage(vm)} />
          ) : (
            <div className="psy-resonance-field__insight">
              <div className="psy-section-label">Current comparison</div>
              <div className="psy-resonance-field__insight-card">
                <div className="psy-resonance-field__insight-copy">
                  <div className="psy-resonance-node__tag">{activeMatch?.rank === 1 ? "Primary" : "Related"}</div>
                  <h3 className="psy-resonance-field__insight-title">{activeMatch?.title ?? "Result pending"}</h3>
                  <p className="psy-meta-text">{activeMatch?.whyMatched ?? "The comparison reason will appear here."}</p>
                  {activeMatch?.whyNotFullyMatched ? (
                    <p className="psy-meta-text">{activeMatch.whyNotFullyMatched}</p>
                  ) : null}
                  {activeMatch?.uncertainty ? (
                    <p className="psy-meta-text">Uncertainty: {activeMatch.uncertainty}</p>
                  ) : null}
                  {activeMatch?.matchedSignals.length ? (
                    <p className="psy-meta-text">Matched signals: {activeMatch.matchedSignals.join(", ")}</p>
                  ) : null}
                  {activeMatch?.mismatchSignals.length ? (
                    <p className="psy-meta-text">Not fully covered: {activeMatch.mismatchSignals.join(", ")}</p>
                  ) : null}
                  {activeMatch?.excerpt ? (
                    <p className="psy-resonance-field__insight-excerpt">"{activeMatch.excerpt}"</p>
                  ) : null}
                </div>
                <div className="psy-resonance-field__insight-meta">
                  {activeMatch ? <span className="psy-status-pill">Match {activeMatch.scorePercent}%</span> : null}
                  {vm.reportReady ? (
                    <ActionButton action={vm.actions.viewReport} variant="primary" onClick={() => dispatch({ type: "report.load" })} />
                  ) : null}
                </div>
              </div>
              <div className="psy-resonance-field__report">
                <div className="psy-section-label">Why this result</div>
                <p className="psy-meta-text">This panel shows the AI comparison explanation, not repeated keyword tags.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </SceneShell>
  );
};
