import React from "react";
import { ChevronRight, Layers } from "lucide-react";

interface OrchestratorHeaderProps {
  theme: "light" | "dark";
}

export default function OrchestratorHeader({ theme }: OrchestratorHeaderProps) {
  return (
    <>
      {/* Breadcrumb row */}
      <div
        className={`text-[12px] font-mono tracking-tight flex items-center gap-1 ${
          theme === "dark" ? "text-slate-500" : "text-slate-400"
        }`}
      >
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className={theme === "dark" ? "text-slate-400" : "text-slate-650"}>
          orchestrator
        </span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-purple-400">eventRouting</span>
      </div>

      {/* Intro section */}
      <div>
        <h3
          className={`text-[16px] font-sans font-medium flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}
        >
          <Layers className="h-4.5 w-4.5 text-purple-400" />
          <span>Orchestrated event router</span>
        </h3>
        <p
          className={`text-[12px] mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}
        >
          Evaluate unknown event payloads using direct patterns or large language
          model intelligence to dispatch specialist agents dynamically.
        </p>
      </div>
    </>
  );
}
