import React from "react";
import { m } from "motion/react";
import { Database, LayoutGrid } from "lucide-react";

interface IngestionFlowProps {
  state: string;
  error: string | null;
  onRetry: () => void;
}

const IngestionFlow = ({ state, error, onRetry }: IngestionFlowProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-5 border border-slate-800/80 bg-slate-900/30 rounded-xl my-2 w-full">
      <div className="flex items-center justify-between w-full max-w-md relative select-none px-4 py-2">
        {/* Background Line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
        
        {/* Traveling dot along the connector line in teal */}
        {state === "fetching" && (
          <m.div
            initial={{ left: "10%" }}
            animate={{ left: "50%" }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-[#1D9E75] -translate-y-1/2 z-10 shadow-[0_0_8px_#1D9E75]"
          />
        )}
        {state === "chunking" && (
          <m.div
            initial={{ left: "50%" }}
            animate={{ left: "90%" }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-[#1D9E75] -translate-y-1/2 z-10 shadow-[0_0_8px_#1D9E75]"
          />
        )}

        {/* GitHub Node */}
        <div className="flex flex-col items-center z-10">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${
            state === "fetching" 
              ? "bg-[#1D9E75]/20 border-[#1D9E75] text-[#1D9E75] scale-110 shadow-[0_0_15px_rgba(29,158,117,0.3)] animate-pulse" 
              : state !== "idle" && state !== "error"
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-500"
          }`}>
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.47.01.84.01.93 0 .22-.16.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
            </svg>
          </div>
          <span className="text-[10px] font-mono mt-2 text-slate-400">
            {state === "fetching" ? "fetching..." : state !== "idle" && state !== "error" ? "fetched ✓" : "GitHub"}
          </span>
        </div>

        {/* Parcle Node */}
        <div className="flex flex-col items-center z-10">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${
            state === "chunking" 
              ? "bg-[#7F77DD]/20 border-[#7F77DD] text-[#7F77DD] scale-110 shadow-[0_0_15px_rgba(127,119,221,0.3)] animate-pulse" 
              : state === "indexed"
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-500"
          }`}>
            <Database className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-mono mt-2 text-slate-400">
            {state === "chunking" ? "chunking..." : state === "indexed" ? "stored ✓" : "Parcle"}
          </span>
        </div>

        {/* KB Index Node */}
        <div className="flex flex-col items-center z-10">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${
            state === "indexed" 
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" 
              : "bg-slate-900 border-slate-800 text-slate-500"
          }`}>
            <LayoutGrid className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-mono mt-2 text-slate-400">
            {state === "indexed" ? "indexed ✓" : "KB Index"}
          </span>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-[11px] font-mono select-none">
          <span>{error}</span>
          <button 
            type="button" 
            onClick={onRetry} 
            className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
          >
            Retry ↺
          </button>
        </div>
      )}
    </div>
  );
};

export default IngestionFlow;
