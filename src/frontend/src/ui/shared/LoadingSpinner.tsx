import React from "react";

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "正在加载..." }) => (
  <div className="psy-loading">
    <span className="psy-loading__spinner" />
    <span>{message}</span>
  </div>
);
