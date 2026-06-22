import React from "react";
import { ChevronRight, GitBranch } from "lucide-react";

interface DocHelperHeaderProps {
  theme: "light" | "dark";
}

export default function DocHelperHeader({ theme }: DocHelperHeaderProps) {
  return (
    <>
      <div
        className={`text-[12px] font-mono tracking-tight flex items-center gap-1 ${
          theme === "dark" ? "text-slate-500" : "text-slate-400"
        }`}
      >
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className={theme === "dark" ? "text-slate-400" : "text-slate-650"}>
          documentation helper
        </span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-teal-400">AI Readme Generator</span>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-4">
        <div>
          <h3
            className={`text-[16px] font-sans font-medium flex items-center gap-2 ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}
          >
            <GitBranch className="h-4.5 w-4.5 text-teal-400" />
            <span>AI Readme Generator</span>
          </h3>
          <p
            className={`text-[12px] mt-1 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Scan your codebase structures, select customization layouts, and generate premium
            interactive README files powered by Eli64s' Readme-AI engine.
          </p>
        </div>
      </div>
    </>
  );
}
