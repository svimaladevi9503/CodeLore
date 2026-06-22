import React from "react";

export interface ScanProgressProps {
  isDark: boolean;
  scanProgress: { current: string; done: number; total: number };
}

export function ScanProgress({ isDark, scanProgress }: ScanProgressProps) {
  return (
    <div className={`rounded-lg border p-3 ${
      isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {scanProgress.current}
        </span>
        <span className={`text-[11px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
          {scanProgress.done}/{scanProgress.total}
        </span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${scanProgress.total > 0 ? (scanProgress.done / scanProgress.total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
