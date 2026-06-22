import React from "react";

interface EmptyStateWarningProps {
  theme: "light" | "dark";
  hasToken: boolean;
}

export default function EmptyStateWarning({ theme, hasToken }: EmptyStateWarningProps) {
  return (
    <div
      className={`border border-dashed rounded-lg p-10 text-center text-[12px] font-sans font-normal ${
        theme === "dark"
          ? "border-slate-850 text-slate-500"
          : "border-slate-200 text-slate-450 bg-slate-50/50"
      }`}
    >
      {!hasToken
        ? "GitHub connection required. Please authorize on the general orchestrator view first."
        : "Select a repository context on the orchestrator view to begin documenting."}
    </div>
  );
}
