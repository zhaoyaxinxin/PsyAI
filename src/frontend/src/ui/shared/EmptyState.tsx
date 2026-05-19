import React from "react";

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="psy-empty-state">
    <div className="psy-empty-state__mark" />
    <p>{message}</p>
  </div>
);
