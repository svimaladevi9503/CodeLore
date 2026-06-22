import React from "react";
import { Search, ChevronRight, ServerCrash } from "lucide-react";

interface KnowledgeBaseHeaderProps {
  pendingSyncCount: number;
  linkUrl: string;
  isPillLoading: boolean;
  theme: "light" | "dark";
  displayText: string;
}

const KnowledgeBaseHeader = ({
  pendingSyncCount,
  linkUrl,
  isPillLoading,
  theme,
  displayText
}: KnowledgeBaseHeaderProps) => {
  return (
    <>
      {/* Breadcrumb row */}
      <div className="text-[12px] font-mono text-slate-500 tracking-tight flex items-center gap-1 shrink-0">
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-slate-400">knowledge base</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-blue-400">queryRag</span>
      </div>

      {/* Info title section */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-sans font-medium text-white flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-blue-400" />
            <span>RAG knowledge base specialist</span>
          </h3>
          <p className="text-[12px] text-slate-400 mt-1">
            Ask questions about operational scripts, system endpoints, or code architectures. CodeLore extracts memories from Parcle index arrays to compile answer context.
          </p>
        </div>
        
        {/* Soft warning badge if sync pending */}
        {pendingSyncCount > 0 && (
          <div className="text-[11px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 animate-pulse shrink-0">
            <ServerCrash className="h-3.5 w-3.5" />
            <span>{pendingSyncCount} file{pendingSyncCount > 1 ? "s" : ""} pending sync</span>
          </div>
        )}
      </div>

      {/* Top action row: GitHub context */}
      <div className="shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-t border-slate-900 pt-4">
        <a
          href={linkUrl}
          target={isPillLoading ? undefined : "_blank"}
          rel={isPillLoading ? undefined : "noopener noreferrer"}
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-normal px-2.5 py-1 rounded border transition-colors duration-250 select-none ${
            isPillLoading 
              ? "opacity-50 animate-pulse cursor-not-allowed pointer-events-none text-slate-500 bg-slate-900/50 border-slate-800"
              : theme === "dark"
                ? "text-slate-400 bg-slate-900 border-slate-800 hover:text-white hover:border-slate-700 cursor-pointer"
                : "text-[#024D33] bg-[#eef3f1] border-emerald-200 hover:bg-[#e4ece9] hover:text-[#013524] cursor-pointer"
          }`}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="shrink-0">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.47.01.84.01.93 0 .22-.16.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
          </svg>
          <span>{displayText}</span>
        </a>
      </div>
    </>
  );
};

export default KnowledgeBaseHeader;
