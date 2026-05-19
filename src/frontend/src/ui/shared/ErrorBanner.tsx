import React from "react";
import type { ActionDescriptor } from "../../pages/page-view-model.js";
import { ActionButton } from "./ActionButton.js";

export const ErrorBanner: React.FC<{
  message: string;
  retryAction?: ActionDescriptor;
}> = ({ message, retryAction }) => (
  <div className="psy-error-banner">
    <span>{message}</span>
    {retryAction?.enabled ? <ActionButton action={retryAction} /> : null}
  </div>
);
