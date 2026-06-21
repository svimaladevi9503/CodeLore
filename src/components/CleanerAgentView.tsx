import React, { useState } from "react";
import { CodeXml, ChevronRight, FileCode, Copy, CheckCircle, Terminal, HelpCircle } from "lucide-react";
import { ScanIssue } from "../types";

interface CleanerAgentViewProps {
  cleanerCode: string;
  setCleanerCode: (val: string) => void;
  scanWholeWorkspace: boolean;
  setScanWholeWorkspace: (val: boolean) => void;
  autoApplyPatch: boolean;
  setAutoApplyPatch: (val: boolean) => void;
  triggerCleanerScan: () => void;
  cleanerLoading: boolean;
  scannedIssues: ScanIssue[];
  scannedPatchId: string;
  scannedPatchText: string;
  applyCleanerPatch: () => void;
  isPatchApplied: boolean;
  renderedIssues: ScanIssue[];
}

const mockFiles = [
  { name: "Sandbox.tsx", size: "1.2 KB", active: true },
  { name: "server.ts", size: "4.8 KB", active: false },
  { name: "App.tsx", size: "12.4 KB", active: false },
  { name: "pipeline.ts", size: "3.2 KB", active: false }
];

interface InteractiveEditorLinesProps {
  cleanerCode: string;
  renderedIssues: ScanIssue[];
  selectedFile: string;
  handleLineClick: (e: any, issue: ScanIssue) => void;
}

function InteractiveEditorLines({
  cleanerCode,
  renderedIssues,
  selectedFile,
  handleLineClick
}: InteractiveEditorLinesProps) {
  const codeLines = React.useMemo(() => {
    return cleanerCode.split("\n").map((line, idx) => ({
      id: `cleaner-line-${idx}`,
      line,
      lineNum: idx + 1
    }));
  }, [cleanerCode]);

  return (
    <>
      {codeLines.map((item) => {
        const matchingIssue = renderedIssues.find(i => {
          if (selectedFile === "Sandbox.tsx") {
            if (item.lineNum === 2 && i.issue_type.toLowerCase().includes("import")) return true;
            if (item.lineNum === 5 && i.issue_type.toLowerCase().includes("variable")) return true;
          }
          return false;
        });

        return (
          <div 
            key={item.id} 
            className={`flex group font-mono text-[11px] py-0.5 leading-normal relative ${
              matchingIssue ? "bg-amber-500/5" : "hover:bg-slate-900/30"
            }`}
          >
            <span className="w-8 select-none text-right pr-3 text-slate-650 font-mono">
              {item.lineNum}
            </span>
            
            <span className="flex-1 whitespace-pre-wrap select-text text-slate-350 relative">
              {matchingIssue ? (
                <button 
                  type="button"
                  onClick={(e) => handleLineClick(e, matchingIssue)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleLineClick(e, matchingIssue);
                    }
                  }}
                  className="border-b border-dashed border-amber-400 bg-amber-500/10 cursor-help rounded-xs px-0.5 text-left font-mono whitespace-pre-wrap flex-1"
                  title="Click to expand analysis tip"
                >
                  {item.line}
                </button>
              ) : (
                <span>{item.line}</span>
              )}
            </span>

            {matchingIssue && (
              <span className="absolute right-2 top-0.5 text-[9px] font-mono text-amber-500 bg-amber-500/5 px-1 rounded-sm select-none">
                AST FLAG
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function CleanerAgentView({
  cleanerCode,
  setCleanerCode,
  scanWholeWorkspace,
  setScanWholeWorkspace,
  autoApplyPatch,
  setAutoApplyPatch,
  triggerCleanerScan,
  cleanerLoading,
  scannedIssues,
  scannedPatchId,
  scannedPatchText,
  applyCleanerPatch,
  isPatchApplied,
  renderedIssues
}: CleanerAgentViewProps) {
  const [selectedFile, setSelectedFile] = useState<string>("Sandbox.tsx");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredIssue, setHoveredIssue] = useState<ScanIssue | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });



  const handleCopyClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLineClick = (e: React.MouseEvent, issue: ScanIssue) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 85
    });
    setHoveredIssue(issue);
  };



  return (
    <div className="flex flex-col gap-6 relative">
      {/* Breadcrumb row */}
      <div className="text-[12px] font-mono text-slate-500 tracking-tight flex items-center gap-1">
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-slate-400">cleaner agent</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-amber-400">astScan</span>
      </div>

      {/* Title description */}
      <div>
        <h3 className="text-[16px] font-sans font-medium text-white flex items-center gap-2">
          <CodeXml className="h-4.5 w-4.5 text-amber-400" />
          <span>AST static scanner & patching</span>
        </h3>
        <p className="text-[12px] text-slate-400 mt-1">
          Scan files for unused module imports, orphan identifiers, or code smell violations. Preview unified patches before safely writing to local snapshots.
        </p>
      </div>

      {/* Summary pill at the top of the editor */}
      {scannedIssues.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2.5 rounded-xl text-[12px] font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Unused imports flag score: <strong>1</strong> · Unused variables: <strong>1</strong> · Scanned files: <strong>{mockFiles.length}</strong></span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-500/20 rounded">
            AST scanning active
          </span>
        </div>
      )}

      {/* Split file explorer on left + Editor on right */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
        {/* Left third: File tree */}
        <div className="bg-slate-950/20 border border-slate-850 p-3 rounded-xl flex flex-col gap-2 md:col-span-1 min-h-[150px]">
          <h4 className="text-[12px] font-sans font-medium text-slate-400 border-b border-slate-900 pb-2 flex items-center justify-between">
            <span>Repository tree</span>
            <span className="text-[10px] text-slate-600 font-mono font-bold select-none">Files</span>
          </h4>

          <div className="flex flex-col gap-1">
            {mockFiles.map((file) => (
              <button
                type="button"
                key={file.name}
                onClick={() => setSelectedFile(file.name)}
                className={`w-full flex items-center justify-between p-2 py-1.5 rounded text-left text-[12px] font-mono transition-all ${
                  selectedFile === file.name
                    ? "bg-amber-500/5 text-amber-400 border-l-2 border-amber-400"
                    : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="text-[10px] text-slate-600 select-none">{file.size}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-3 border-t border-slate-900 select-none">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">
              Ast rules preset
            </span>
            <div className="text-[11px] font-mono text-slate-600 leading-normal bg-slate-950 p-2 rounded tracking-tight">
              _ orphan exclusion filters are set recursively.
            </div>
          </div>
        </div>

        {/* Right two-thirds: Editor */}
        <div className="bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col md:col-span-3 overflow-hidden min-h-[300px]">
          <div className="bg-slate-900/40 border-b border-slate-850 px-4 py-2 flex items-center justify-between text-[12px] shrink-0">
            <span className="font-mono text-slate-400">{selectedFile}</span>
            <button
              type="button"
              onClick={() => setCleanerCode(
                `import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react'; // Unused import

export default function HomeView() {
  const secretKey = "quacked_auth"; // Unused variable
  const activeHeader = "Admin Console";

  return (
    <div className="admin">
      <h1>{activeHeader}</h1>
    </div>
  );
}`
              )}
              className="text-[10px] text-amber-400 hover:underline font-mono"
            >
              Load testing specimen
            </button>
          </div>

          {/* Interactive display box */}
          <div className="flex-1 p-3 font-mono bg-slate-950 leading-relaxed overflow-auto relative select-none">
            {selectedFile === "Sandbox.tsx" ? (
              <div className="min-h-[220px]">
                <InteractiveEditorLines cleanerCode={cleanerCode} renderedIssues={renderedIssues} selectedFile={selectedFile} handleLineClick={handleLineClick} />
              </div>
            ) : (
              <div className="text-[12px] font-sans font-normal text-slate-500 py-10 text-center select-text">
                This file is clean. Unused declarations: 0. Focus on Sandbox.tsx to test AST compiler runs.
              </div>
            )}
          </div>

          {/* Bottom execute panel */}
          <div className="p-3 bg-slate-900/10 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 select-none">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="chk-clean"
                  checked={scanWholeWorkspace}
                  onChange={(e) => setScanWholeWorkspace(e.target.checked)}
                  className="accent-amber-500 h-3.5 w-3.5 rounded cursor-pointer"
                />
                <label htmlFor="chk-clean" className="text-[12px] font-sans font-normal text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
                  Complete codebase repository scan
                </label>
              </div>

              <div className="flex items-center gap-1.55">
                <input
                  type="checkbox"
                  id="chk-auto-apply"
                  checked={autoApplyPatch}
                  onChange={(e) => setAutoApplyPatch(e.target.checked)}
                  className="accent-amber-500 h-3.5 w-3.5 rounded cursor-pointer"
                />
                <label htmlFor="chk-auto-apply" className="text-[12px] font-sans font-normal text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
                  Autoapply patch immediately
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={triggerCleanerScan}
              disabled={cleanerLoading}
              className="bg-amber-500 hover:bg-amber-400 text-black font-sans font-medium text-[12px] py-1.5 px-4 rounded cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {cleanerLoading ? "parsing trees..." : "execute AST clean scan"}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Hover tooltips */}
      {hoveredIssue && (
        <div 
          className="fixed z-50 bg-slate-950 border border-amber-500/30 p-3 rounded-lg shadow-2xl max-w-xs text-[11px] text-slate-200 flex flex-col gap-1.5 animate-fade-in"
          style={{ top: `${tooltipPos.y}px`, left: `${tooltipPos.x}px` }}
        >
          <div className="flex justify-between items-start font-mono text-[10px] text-amber-400 uppercase tracking-widest pb-1 border-b border-slate-900 leading-none mb-1">
            <span>{hoveredIssue.issue_type}</span>
            <button 
              type="button"
              onClick={() => setHoveredIssue(null)}
              className="text-slate-500 hover:text-white pb-0.5"
            >
              [x]
            </button>
          </div>
          <p className="font-sans font-normal">{hoveredIssue.suggestion}</p>
          <div className="flex justify-end gap-1.5 mt-1">
            <button
              type="button"
              onClick={() => handleCopyClipboard(hoveredIssue.patch_snippet, hoveredIssue.line.toString())}
              className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 border border-slate-850 rounded hover:border-slate-700 cursor-pointer flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              <span>{copiedId === hoveredIssue.line.toString() ? "Copied" : "Copy patch"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Unified Diff patch drawer (Expandable) */}
      {scannedIssues.length > 0 && (
        <div className="border border-slate-850 rounded-xl p-4 bg-slate-900/10 flex flex-col gap-3">
          <h4 className="text-[13px] font-sans font-medium text-slate-350 border-b border-slate-900 pb-2 flex items-center justify-between">
            <span>Unified compilations patch diff file</span>
            <span className="text-[10px] text-amber-500 font-mono font-medium">Never auto-applied</span>
          </h4>

          <pre className="bg-slate-950 border border-slate-900 p-2.5 rounded font-mono text-[11px] leading-relaxed max-h-40 overflow-auto text-slate-300">
            {scannedPatchText}
          </pre>

          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={applyCleanerPatch}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-medium text-[12px] px-4 py-2 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Apply suggested patch</span>
            </button>
          </div>
        </div>
      )}

      {/* Success alert block */}
      {isPatchApplied && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-2.5 mt-2 font-sans text-[12px] text-emerald-400 leading-relaxed">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <strong>AST cleaning finished successfully!</strong> The temporary code specs have been pruned from unused declarations, recorded dynamically inside Parcle archives.
          </div>
        </div>
      )}
    </div>
  );
}
