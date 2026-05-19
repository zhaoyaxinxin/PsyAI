import React from "react";

const riskColors: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: "#fdd", fg: "#900" },
  high: { bg: "#ffe0cc", fg: "#c60" },
  moderate: { bg: "#fff8cc", fg: "#860" },
  low: { bg: "#e8f5e9", fg: "#260" }
};

export const RiskBadge: React.FC<{
  level: string;
  label?: string;
  notice?: string;
}> = ({ level, label, notice }) => {
  const colors = riskColors[level] ?? { bg: "#eee", fg: "#666" };
  const tone = level in riskColors ? level : "low";

  return (
    <div className={`psy-risk-badge psy-risk-badge--${tone}`} style={{ color: colors.fg, background: colors.bg }}>
      <span>{label ?? level}</span>
      {notice ? <span>{notice}</span> : null}
    </div>
  );
};
