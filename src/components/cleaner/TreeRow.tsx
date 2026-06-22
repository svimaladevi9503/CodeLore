import React from "react";
import { ChevronRight, ChevronDown, FolderOpen, Folder } from "lucide-react";
import { TreeNode, TreeFolder, TreeFile } from "./types";
import { FileIcon } from "./FileIcon";

export interface TreeRowProps {
  key?: React.Key;
  node: TreeNode;
  depth: number;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  selectedFile: string | null;
  onFileClick: (path: string) => void;
  theme: string;
}

export function TreeRow({
  node, depth, expandedDirs, toggleDir, selectedFile, onFileClick, theme
}: TreeRowProps) {
  if (node.type === "tree") {
    const folder = node as TreeFolder;
    const isExpanded = expandedDirs.has(folder.path);
    return (
      <>
        <button
          type="button"
          onClick={() => toggleDir(folder.path)}
          className={`w-full flex items-center gap-1.5 py-1 px-1 rounded text-left font-mono text-[11px] transition-colors select-none cursor-pointer ${
            theme === "dark"
              ? "hover:bg-[#1a1f2e] text-slate-400"
              : "hover:bg-[#f8f8f8] text-slate-600"
          }`}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {isExpanded
            ? <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
            : <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
          }
          {isExpanded
            ? <FolderOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            : <Folder className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
          }
          <span className="truncate">{folder.name}</span>
        </button>
        {isExpanded && folder.children.map((child) => (
          <TreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            selectedFile={selectedFile}
            onFileClick={onFileClick}
            theme={theme}
          />
        ))}
      </>
    );
  }

  const file = node as TreeFile;
  const isSelected = selectedFile === file.path;
  const sizeStr = file.size != null ? `${(file.size / 1024).toFixed(1)} KB` : "";

  return (
    <button
      type="button"
      onClick={() => !file.ignored && onFileClick(file.path)}
      disabled={file.ignored}
      className={`w-full flex items-center justify-between py-1 px-1 rounded text-left font-mono text-[11px] transition-all select-none ${
        file.ignored
          ? "opacity-40 cursor-default line-through"
          : isSelected
            ? theme === "dark"
              ? "bg-[#5DCAA5]/10 border-l-2 border-[#5DCAA5] text-white"
              : "bg-[#1D9E75]/10 border-l-2 border-[#1D9E75] text-slate-900"
            : theme === "dark"
              ? "hover:bg-[#1a1f2e] text-slate-400 cursor-pointer"
              : "hover:bg-[#f8f8f8] text-slate-600 cursor-pointer"
      }`}
      style={{ paddingLeft: `${depth * 16 + 4}px` }}
    >
      <div className="flex items-center gap-1.5 truncate min-w-0">
        <FileIcon filename={file.name} className="text-[9px] font-bold" />
        <span className="truncate">{file.name}</span>
        {file.ignored && (
          <span className={`text-[8px] px-1 rounded ${theme === "dark" ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-400"}`}>
            ignored
          </span>
        )}
      </div>
      {sizeStr && !file.ignored && (
        <span className={`text-[9px] shrink-0 ${theme === "dark" ? "text-slate-600" : "text-slate-400"}`}>
          {sizeStr}
        </span>
      )}
    </button>
  );
}
