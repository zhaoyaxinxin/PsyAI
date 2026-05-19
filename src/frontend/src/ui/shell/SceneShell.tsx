import React from "react";

export type SceneTone =
  | "entry"
  | "menu"
  | "counseling"
  | "simulation"
  | "resonance"
  | "report"
  | "settings"
  | "history"
  | "risk";

export const SceneShell: React.FC<{
  sceneId: string;
  tone: SceneTone;
  layout?: "default" | "single-stage" | "hero-split" | "route-map";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backAction?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  compactHeader?: boolean;
  frameDensity?: "full" | "light" | "none";
  contentClassName?: string;
  frameClassName?: string;
  children: React.ReactNode;
}> = ({
  sceneId,
  tone,
  layout = "default",
  eyebrow,
  title,
  subtitle,
  backAction,
  status,
  actions,
  aside,
  compactHeader = false,
  frameDensity = "full",
  contentClassName,
  frameClassName,
  children
}) => (
  <div className={`psy-scene psy-scene--${tone} psy-scene--layout-${layout}`} data-scene={sceneId}>
    <div className="psy-scene__backdrop" aria-hidden="true">
      <div className="psy-scene__void" />
      <div className="psy-scene__nebula" />
      <div className="psy-scene__constellation" />
      <div className="psy-scene__grid" />
      <div className="psy-scene__rings" />
      <div className="psy-scene__halo" />
      <div className="psy-scene__sweep" />
      <div className="psy-scene__noise" />
      <span className="psy-particle psy-particle--1" />
      <span className="psy-particle psy-particle--2" />
      <span className="psy-particle psy-particle--3" />
      <span className="psy-particle psy-particle--4" />
      <span className="psy-particle psy-particle--5" />
      <span className="psy-particle psy-particle--6" />
      <span className="psy-particle psy-particle--7" />
      <span className="psy-particle psy-particle--8" />
    </div>
    <div className={`psy-scene__frame${frameClassName ? ` ${frameClassName}` : ""}`}>
      {frameDensity !== "none" ? (
        <div className={`psy-scene__frame-lines psy-scene__frame-lines--${frameDensity}`} aria-hidden="true">
          <span className="psy-scene__frame-line psy-scene__frame-line--top" />
          <span className="psy-scene__frame-line psy-scene__frame-line--left" />
          <span className="psy-scene__frame-line psy-scene__frame-line--right" />
        </div>
      ) : null}
      {backAction ? <div className="psy-scene__backtrack">{backAction}</div> : null}
      <header className={`psy-scene__header${compactHeader ? " psy-scene__header--compact" : ""}`}>
        <div className="psy-scene__header-copy">
          {eyebrow ? <div className="psy-scene__eyebrow">{eyebrow}</div> : null}
          <h1 className="psy-scene__title">{title}</h1>
          {subtitle ? <p className="psy-scene__subtitle">{subtitle}</p> : null}
        </div>
        {(status || actions) ? (
          <div className="psy-scene__header-side">
            {status ? <div className="psy-scene__status">{status}</div> : null}
            {actions ? <div className="psy-scene__header-actions">{actions}</div> : null}
          </div>
        ) : null}
      </header>
      <div className={`psy-scene__content${contentClassName ? ` ${contentClassName}` : ""}`}>{children}</div>
      {aside ? <aside className="psy-scene__aside">{aside}</aside> : null}
    </div>
  </div>
);
