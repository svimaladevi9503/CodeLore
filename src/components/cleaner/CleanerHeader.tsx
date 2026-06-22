import React from "react";
import { AlertCircle, ChevronRight, Sparkles, X } from "lucide-react";
import { RunScanButton } from "./RunScanButton";

export interface CleanerHeaderProps {
  isDark: boolean;
  scanning: boolean;
  treeLoading: boolean;
  issuesLength: number;
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
  resolvedCount: number;
  scanError: string | null;
  fixError: string | null;
  setScanError: (val: string | null) => void;
  setFixError: (val: string | null) => void;
  runScan: () => void;
}

export function CleanerHeader({
  isDark, scanning, treeLoading,
  issuesLength, errorCount, warningCount, suggestionCount, resolvedCount,
  scanError, fixError, setScanError, setFixError,
  runScan
}: CleanerHeaderProps) {
  return (
    <>
      {/* ─── BREADCRUMB ──────────────────────────────────────────────── */}
      <div className="text-[12px] font-mono text-slate-500 tracking-tight flex items-center gap-1">
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className={isDark ? "text-slate-400" : "text-slate-600"}>cleaner agent</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-amber-400">analysis engine</span>
      </div>

      {/* ─── HEADER ROW ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-[16px] font-sans font-medium flex items-center gap-2 ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <Sparkles className="h-4.5 w-4.5 text-amber-400" />
            <span>Static Analysis Engine</span>
          </h3>
          <p className={`text-[12px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            6-category Gemini-powered code review with auto-fix patches
          </p>
        </div>
        <RunScanButton 
          scanning={scanning} 
          disabled={treeLoading} 
          onRunScan={runScan} 
        />
      </div>

      {/* ─── SUMMARY BAR ─────────────────────────────────────────────── */}
      {issuesLength > 0 && (
        <div className={`rounded-lg border p-3 flex items-center justify-between ${
          isDark ? "bg-slate-900/30 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-red-400">{errorCount} errors</span>
            <span className="text-amber-400">{warningCount} warnings</span>
            <span className="text-teal-400">{suggestionCount} suggestions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {resolvedCount}/{issuesLength} resolved
            </span>
            <div className={`h-1.5 w-24 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${issuesLength > 0 ? (resolvedCount / issuesLength) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Inline error banners */}
      {scanError && (
        <div className={`rounded-lg border p-3 flex items-center gap-2 text-[12px] ${
          isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
        }`}>
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-red-400 flex-1">{scanError}</span>
          <button type="button" onClick={() => setScanError(null)} className="text-red-400 hover:text-red-300 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {fixError && (
        <div className={`rounded-lg border p-3 flex items-center gap-2 text-[12px] ${
          isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"
        }`}>
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-red-400 flex-1">{fixError}</span>
          <button type="button" onClick={() => setFixError(null)} className="text-red-400 hover:text-red-300 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
