import React from "react";
import { RefreshCw } from "lucide-react";
import { TreeRow } from "./TreeRow";
import { TreeNode } from "./types";

export interface ProjectTreePanelProps {
  isDark: boolean;
  theme: string;
  totalCount: number;
  ignoredCount: number;
  projectDir: string;
  treeLoading: boolean;
  nestedTree: TreeNode[];
  treeDataLength: number;
  expandedDirs: Set<string>;
  selectedFile: string | null;
  fetchTree: () => void;
  toggleDir: (path: string) => void;
  loadFile: (path: string) => void;
}

export function ProjectTreePanel({
  isDark, theme, totalCount, ignoredCount, projectDir, treeLoading,
  nestedTree, treeDataLength, expandedDirs, selectedFile,
  fetchTree, toggleDir, loadFile
}: ProjectTreePanelProps) {
  return (
    <div className={`rounded-xl border flex flex-col md:col-span-1 overflow-hidden min-h-[300px] max-h-[600px] ${
      isDark ? "bg-[#0f1117] border-slate-800" : "bg-white border-slate-200"
    }`} >
      {/* Tree Header */}
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-3 shrink-0 ${
        isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50"
      }`}>
        <div className="min-w-0">
          <div className={`text-[11px] font-mono font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Project Structure
          </div>
          {projectDir && (
            <div className={`text-[9px] font-mono truncate mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`} title={projectDir}>
              {projectDir}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
            {totalCount} files · {ignoredCount} ignored
          </span>
          <button
            type="button"
            onClick={fetchTree}
            disabled={treeLoading}
            className={`p-0.5 rounded transition cursor-pointer ${
              isDark ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-200 text-slate-400"
            }`}
            title="Refresh tree"
          >
            <RefreshCw className={`h-3 w-3 ${treeLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0">
        {treeLoading && treeDataLength === 0 ? (
          <div className={`text-[11px] font-mono py-8 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-amber-400" />
            Loading project tree...
          </div>
        ) : nestedTree.length === 0 ? (
          <div className={`text-[11px] font-mono py-8 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            No files found. Check repo settings.
          </div>
        ) : (
          nestedTree.map(node => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              selectedFile={selectedFile}
              onFileClick={loadFile}
              theme={theme}
            />
          ))
        )}
      </div>
    </div>
  );
}
