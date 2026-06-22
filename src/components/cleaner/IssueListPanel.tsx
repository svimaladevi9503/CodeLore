/* eslint-disable react-doctor/rendering-hydration-mismatch-time */
import React from "react";
import { Code2 } from "lucide-react";
import { CleanerIssue } from "../../types";
import { TodoCard } from "./TodoCard";
import { RunScanButton } from "./RunScanButton";
export interface IssueListPanelProps {
  isDark: boolean;
  theme: string;
  repoName: string;
  issues: CleanerIssue[];
  filteredIssues: CleanerIssue[];
  filterSeverity: "all" | "error" | "warning" | "suggestion";
  sortBy: "file" | "severity" | "category";
  scanning: boolean;
  setFilterSeverity: (val: "all" | "error" | "warning" | "suggestion") => void;
  setSortBy: (val: "file" | "severity" | "category") => void;
  viewIssue: (issue: CleanerIssue) => void;
  showFixPreview: (issue: CleanerIssue) => void;
  runScan: () => void;
}

export function IssueListPanel({
  isDark, theme, repoName, issues, filteredIssues,
  filterSeverity, sortBy, scanning,
  setFilterSeverity, setSortBy, viewIssue, showFixPreview, runScan
}: IssueListPanelProps) {

  return (
    <>
      {/* Header */}
      <div className={`px-4 py-2.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 ${
        isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50"
      }`}>
        <div className={`text-[12px] font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          CodeLore Clean Report · <span className="font-medium">{repoName || "custom-docs"}</span>
          <span className={`ml-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
            · {new Date().toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter tabs */}
          {(["all", "error", "warning", "suggestion"] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterSeverity(f)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition cursor-pointer capitalize ${
                filterSeverity === f
                  ? f === "all"
                    ? isDark ? "bg-slate-700 text-white" : "bg-slate-800 text-white"
                    : f === "error"
                      ? "bg-red-500/20 text-red-400"
                      : f === "warning"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-teal-500/20 text-teal-400"
                  : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {f === "all" ? "All" : f + "s"}
            </button>
          ))}
          <span className={`text-[9px] mx-1 ${isDark ? "text-slate-700" : "text-slate-300"}`}>|</span>
          {/* Sort */}
          {(["severity", "file", "category"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSortBy(s)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded transition cursor-pointer capitalize ${
                sortBy === s
                  ? isDark ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-800"
                  : isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              by {s}
            </button>
          ))}
        </div>
      </div>

      {/* Issue list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {issues.length === 0 && !scanning ? (
          <div className={`py-16 text-center flex flex-col items-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            <Code2 className={`h-10 w-10 mx-auto mb-3 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
            <p className="text-[13px] font-sans font-medium mb-3">No issues found yet</p>
            <RunScanButton scanning={scanning} disabled={scanning} onRunScan={runScan} />
          </div>
        ) : (
          filteredIssues.map((issue, idx) => (
            <TodoCard
              key={`${issue.file}-${issue.line_start}-${issue.title}-${idx}`}
              issue={issue}
              index={idx}
              theme={theme}
              onView={() => viewIssue(issue)}
              onFix={() => showFixPreview(issue)}
            />
          ))
        )}
        {filteredIssues.length === 0 && issues.length > 0 && !scanning && (
          <div className={`py-8 text-center text-[12px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            No {filterSeverity} issues found.
          </div>
        )}
      </div>
    </>
  );
}
