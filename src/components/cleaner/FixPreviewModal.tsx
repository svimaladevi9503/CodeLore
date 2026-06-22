import React from "react";
import { X, RefreshCw, Check } from "lucide-react";
import { CleanerIssue } from "../../types";

export interface FixPreviewModalProps {
  isDark: boolean;
  fixPreview: {
    issue: CleanerIssue;
    oldCode: string;
    newCode: string;
  };
  applyingFix: boolean;
  setFixPreview: (val: any) => void;
  applyFix: () => void;
}

export function FixPreviewModal({
  isDark, fixPreview, applyingFix, setFixPreview, applyFix
}: FixPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`rounded-xl border w-full max-w-2xl overflow-hidden shadow-2xl ${
        isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
      }`}>
        {/* Modal Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}>
          <div>
            <h4 className={`text-[14px] font-sans font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
              Fix Preview — {fixPreview.issue.title}
            </h4>
            <p className={`text-[11px] font-mono mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {fixPreview.issue.file} · lines {fixPreview.issue.line_start}–{fixPreview.issue.line_end}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFixPreview(null)}
            className={`p-1 rounded transition cursor-pointer ${
              isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Diff View */}
        <div className="grid grid-cols-2 gap-0 max-h-[350px] overflow-y-auto">
          <div className={`p-3 border-r ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-2 pb-1 border-b border-red-500/20">
              Current Code
            </div>
            <pre className={`font-mono text-[11px] whitespace-pre-wrap leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              {fixPreview.oldCode}
            </pre>
          </div>
          <div className="p-3">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2 pb-1 border-b border-emerald-500/20">
              Patched Code
            </div>
            <pre className={`font-mono text-[11px] whitespace-pre-wrap leading-relaxed ${
              isDark ? "text-emerald-300" : "text-emerald-700"
            }`}>
              {fixPreview.newCode}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-4 py-3 border-t flex items-center justify-end gap-2 ${
          isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-slate-50"
        }`}>
          <button
            type="button"
            onClick={() => setFixPreview(null)}
            className={`text-[12px] font-sans px-4 py-1.5 rounded transition cursor-pointer ${
              isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyFix}
            disabled={applyingFix}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-sans font-medium text-[12px] px-4 py-1.5 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {applyingFix ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Apply Patch & Commit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
