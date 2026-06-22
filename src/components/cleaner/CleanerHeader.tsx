import React from "react";
import { ChevronRight, Sparkles, RefreshCw, Play } from "lucide-react";

export interface CleanerHeaderProps {
  isDark: boolean;
  scanning: boolean;
  treeLoading: boolean;
  issuesLength: number;
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
  resolvedCount: number;
  runScan: () => void;
}

export function CleanerHeader({
  isDark, scanning, treeLoading,
  issuesLength, errorCount, warningCount, suggestionCount, resolvedCount,
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
        <button
          type="button"
          onClick={runScan}
          disabled={scanning || treeLoading}
          className="bg-amber-500 hover:bg-amber-400 text-black font-sans font-medium text-[12px] py-2 px-5 rounded-lg cursor-pointer transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {scanning ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span>Run Full Scan</span>
            </>
          )}
        </button>
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
    </>
  );
}
