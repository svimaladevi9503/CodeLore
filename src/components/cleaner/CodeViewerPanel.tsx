import React, { useRef } from "react";
import { X, RefreshCw } from "lucide-react";

export interface CodeViewerPanelProps {
  isDark: boolean;
  selectedFile: string | null;
  fileLoading: boolean;
  codeLines: { num: number; text: string; highlighted: boolean }[];
  setShowCodeViewer: (val: boolean) => void;
  setHighlightLines: (val: { start: number; end: number } | null) => void;
}

export function CodeViewerPanel({
  isDark, selectedFile, fileLoading, codeLines,
  setShowCodeViewer, setHighlightLines
}: CodeViewerPanelProps) {
  const codeViewerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
        isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50"
      }`}>
        <span className={`font-mono text-[12px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          {selectedFile}
        </span>
        <button
          type="button"
          onClick={() => { setShowCodeViewer(false); setHighlightLines(null); }}
          className={`text-[10px] font-mono px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
            isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <X className="h-3 w-3" />
          Back to Issues
        </button>
      </div>
      <div ref={codeViewerRef} className="flex-1 overflow-auto font-mono text-[11px] leading-relaxed select-text">
        {fileLoading ? (
          <div className={`py-12 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
            Loading file...
          </div>
        ) : (
          codeLines.map((line) => (
            <div
              key={line.num}
              id={`cleaner-line-${line.num}`}
              className={`flex py-px ${
                line.highlighted
                  ? "bg-amber-500/15 border-l-2 border-amber-400"
                  : isDark ? "hover:bg-slate-900/30" : "hover:bg-slate-50"
              }`}
            >
              <span className={`w-10 text-right pr-3 select-none shrink-0 ${
                line.highlighted
                  ? "text-amber-400"
                  : isDark ? "text-slate-700" : "text-slate-300"
              }`}>
                {line.num}
              </span>
              <span className={`flex-1 whitespace-pre-wrap pr-4 ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}>
                {line.text}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
