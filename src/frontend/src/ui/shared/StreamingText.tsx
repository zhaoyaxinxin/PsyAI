import React from "react";

export const StreamingText: React.FC<{
  text: string;
  isStreaming: boolean;
}> = ({ text, isStreaming }) => (
  <div>
    <p className="psy-streaming-text">
      {text}
      {isStreaming ? <span className="psy-streaming-text__cursor" /> : null}
    </p>
  </div>
);
