import React from "react";
import type { ActionDescriptor } from "../../pages/page-view-model.js";

function getButtonVariant(action: ActionDescriptor): "primary" | "ghost" | "danger" {
  const key = `${action.kind} ${action.label}`.toLowerCase();
  if (key.includes("cleanup") || key.includes("escalate") || key.includes("清理") || key.includes("风险")) return "danger";
  if (
    key.includes("back") ||
    key.includes("cancel") ||
    key.includes("history") ||
    key.includes("settings") ||
    key.includes("返回") ||
    key.includes("菜单") ||
    key.includes("档案")
  ) {
    return "ghost";
  }
  return "primary";
}

export const ActionButton: React.FC<{
  action: ActionDescriptor;
  variant?: "hero" | "primary" | "secondary" | "ghost" | "danger" | "quiet";
  onClick?: () => void;
}> = ({ action, variant, onClick }) => {
  const resolvedVariant = variant ?? getButtonVariant(action);
  const className =
    resolvedVariant === "primary"
      ? "psy-action-button"
      : `psy-action-button psy-action-button--${resolvedVariant}`;

  return (
    <button className={className} disabled={!action.enabled} onClick={onClick} title={action.reason} type="button">
      {action.label}
    </button>
  );
};
