import React from "react";

const UnreadIndicator: React.FC = () => (
  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl animate-pulse" />
);

export const UnreadDot: React.FC = () => (
  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-sm shadow-blue-200" />
);

export default UnreadIndicator;
